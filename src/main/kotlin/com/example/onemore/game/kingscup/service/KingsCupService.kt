package com.example.onemore.game.kingscup.service

import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.SessionStatus
import com.example.onemore.domain.repository.GameSessionRepository
import com.example.onemore.domain.repository.PlayerRepository
import com.example.onemore.exception.ForbiddenException
import com.example.onemore.exception.SessionNotFoundException
import com.example.onemore.game.kingscup.api.dto.*
import com.example.onemore.game.kingscup.domain.KingsCupState
import com.example.onemore.game.kingscup.domain.KingsCupStateRepository
import com.example.onemore.game.kingscup.domain.model.*
import com.example.onemore.exception.GameActionException
import com.example.onemore.game.kingscup.util.CardDeck
import com.example.onemore.game.kingscup.util.KingsCupData
import com.example.onemore.game.kingscup.websocket.GameEventPublisher
import com.example.onemore.game.kingscup.websocket.event.*
import com.example.onemore.security.PlayerContext
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Lazy
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

@Service
class KingsCupService(
    private val kingsCupStateRepository: KingsCupStateRepository,
    private val sessionRepository: GameSessionRepository,
    private val playerRepository: PlayerRepository,
    private val gameEventPublisher: GameEventPublisher
) {
    // Self-injection so scheduler callbacks go through Spring proxy (enabling @Transactional)
    @Autowired
    @Lazy
    private lateinit var self: KingsCupService

    private val mapper = jacksonObjectMapper().apply {
        findAndRegisterModules()
    }

    private val scheduler = Executors.newScheduledThreadPool(4)
    private val activeRaces = ConcurrentHashMap<String, ScheduledFuture<*>>()

    private companion object {
        const val THUMB_QUEEN_USES = 3
        const val KINGS_IN_DECK = 4
    }

    // ── Initialization ────────────────────────────────────────────────────────

    @Transactional
    fun initializeGame(session: GameSession, players: List<Player>) {
        val deck = CardDeck.buildShuffled()
        val turnOrder = players.map { it.id.toString() }

        val state = KingsCupGameState(
            deck = deck,
            turnOrder = turnOrder
        )

        val entity = KingsCupState(
            sessionId = session.id,
            gameStateJson = mapper.writeValueAsString(state)
        )
        kingsCupStateRepository.save(entity)

        session.status = SessionStatus.IN_GAME
        session.updatedAt = Instant.now()
        sessionRepository.save(session)

        gameEventPublisher.publish(GameInitializedEvent(session.sessionCode))
    }

    // ── State Query ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    fun getState(ctx: PlayerContext, code: String): KingsCupStateResponse {
        val session = requireSession(code)
        requirePlayerInSession(ctx, session.id)

        val entity = kingsCupStateRepository.findBySessionId(session.id)
            ?: throw GameActionException("No game state found for session '$code'")
        val state = deserialize(entity.gameStateJson)
        val players = playerRepository.findBySessionId(session.id)
        val playerMap = players.associateBy { it.id.toString() }

        return buildStateResponse(state, playerMap)
    }

    // ── Draw Card ─────────────────────────────────────────────────────────────

    @Transactional
    fun drawCard(ctx: PlayerContext, code: String) {
        val session = requireSession(code)
        val entity = kingsCupStateRepository.findBySessionIdForUpdate(session.id)
            ?: throw GameActionException("No game state found for session '$code'")
        val state = deserialize(entity.gameStateJson)

        requireCurrentDrawer(ctx, state, "draw a card")
        requirePhase(state, GamePhase.WAITING_TO_DRAW, "draw a card")

        if (state.deck.isEmpty()) {
            state.phase = GamePhase.GAME_OVER
            persist(entity, state)
            gameEventPublisher.publish(GameOverEvent(code, "Deck is empty"))
            return
        }

        val card = state.deck.removeFirst()
        state.currentCard = card
        val players = playerRepository.findBySessionId(session.id)
        val playerMap = players.associateBy { it.id.toString() }
        val drawer = playerMap[ctx.playerId.toString()]!!

        routeCard(state, code, card, drawer)
        persist(entity, state)
    }

    private fun routeCard(state: KingsCupGameState, code: String, card: String, drawer: Player) {
        val drawerId = drawer.id.toString()
        val rank = CardDeck.rank(card)
        state.phase = phaseForRank(rank)
        when (rank) {
            "2" -> state.pendingPickTarget = PendingPickTarget(PickTargetType.SIP_PICK, drawerId)
            "8" -> state.pendingPickTarget = PendingPickTarget(PickTargetType.BUDDY_PICK, drawerId)
            "9" -> startWordPick(state, drawerId, KingsCupData.randomRhymeSeed())
            "10" -> startWordPick(state, drawerId, KingsCupData.randomCategory())
            "Q" -> {
                // A new queen replaces the previous one
                state.thumbQueenId = drawerId
                state.thumbQueenUsesLeft = THUMB_QUEEN_USES
            }
            "K" -> {
                state.kingsDrawn++
                state.kingsCupContents.add(card)
            }
        }

        gameEventPublisher.publish(CardDrawnEvent(code, card, drawerId, drawer.username, state.phase.name))
        publishCardFollowUp(state, code, rank, drawer)
    }

    private fun phaseForRank(rank: String): GamePhase = when (rank) {
        "2", "9", "10" -> GamePhase.PICK_TARGET
        "4" -> GamePhase.TOUCH_RACE
        "8" -> GamePhase.PICK_BUDDY
        "J" -> GamePhase.SUBMIT_JACK_RULE
        else -> GamePhase.EXECUTING_DISPLAY
    }

    /** The drawer plays a rhyme or category round at the table, then picks who lost. */
    private fun startWordPick(state: KingsCupGameState, drawerId: String, word: String) {
        state.pendingPickTarget = PendingPickTarget(PickTargetType.SIP_PICK, drawerId)
        state.pendingCategory = word
    }

    private fun publishCardFollowUp(state: KingsCupGameState, code: String, rank: String, drawer: Player) {
        val drawerId = drawer.id.toString()
        when (rank) {
            "4" -> startTouchRace(state, code, drawer, state.turnOrder.toList(), TouchRaceType.CARD_FOUR)
            "Q" -> gameEventPublisher.publish(
                ThumbQueenAssignedEvent(
                    sessionCode = code,
                    queenPlayerId = drawerId,
                    queenUsername = drawer.username,
                    usesLeft = state.thumbQueenUsesLeft
                )
            )
            "K" -> {
                val isLastKing = state.kingsDrawn >= KINGS_IN_DECK
                gameEventPublisher.publish(
                    KingDrawnEvent(
                        sessionCode = code,
                        kingsDrawn = state.kingsDrawn,
                        drawerUsername = drawer.username,
                        kingsCupContents = state.kingsCupContents.toList(),
                        isLastKing = isLastKing,
                        // The last king's drawer drinks the cup
                        lastKingDrinkerPlayerId = if (isLastKing) drawerId else null
                    )
                )
            }
        }
    }

    // ── Advance Turn (EXECUTING_DISPLAY) ──────────────────────────────────────

    @Transactional
    fun advanceTurn(ctx: PlayerContext, code: String) {
        val session = requireSession(code)
        val entity = kingsCupStateRepository.findBySessionIdForUpdate(session.id)
            ?: throw GameActionException("No game state found for session '$code'")
        val state = deserialize(entity.gameStateJson)

        requireCurrentDrawer(ctx, state, "advance turn")
        requirePhase(state, GamePhase.EXECUTING_DISPLAY, "advance turn")

        // Check if last king was drawn
        val card = state.currentCard
        val isLastKing = card != null && CardDeck.rank(card) == "K" && state.kingsDrawn >= KINGS_IN_DECK
        if (isLastKing) {
            state.phase = GamePhase.GAME_OVER
            persist(entity, state)
            gameEventPublisher.publish(GameOverEvent(code, "Last king drawn — someone drinks the cup!"))
            return
        }

        doAdvanceTurn(state, code, entity)
    }

    private fun doAdvanceTurn(state: KingsCupGameState, code: String, entity: KingsCupState) {
        state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.size
        state.phase = GamePhase.WAITING_TO_DRAW
        state.currentCard = null
        state.pendingPickTarget = null
        state.pendingCategory = null

        val players = playerRepository.findBySessionId(
            requireSession(code).id
        )
        val playerMap = players.associateBy { it.id.toString() }
        val nextDrawerId = state.turnOrder[state.currentTurnIndex]
        val nextDrawer = playerMap[nextDrawerId]!!

        persist(entity, state)

        gameEventPublisher.publish(
            TurnAdvancedEvent(
                sessionCode = code,
                nextDrawerPlayerId = nextDrawerId,
                nextDrawerUsername = nextDrawer.username,
                cardsRemaining = state.deck.size
            )
        )

        if (state.deck.isEmpty()) {
            state.phase = GamePhase.GAME_OVER
            persist(entity, state)
            gameEventPublisher.publish(GameOverEvent(code, "Deck exhausted"))
        }
    }

    // ── Pick Target ───────────────────────────────────────────────────────────

    @Transactional
    fun pickTarget(ctx: PlayerContext, code: String, targetPlayerId: String) {
        val session = requireSession(code)
        val entity = kingsCupStateRepository.findBySessionIdForUpdate(session.id)
            ?: throw GameActionException("No game state found for session '$code'")
        val state = deserialize(entity.gameStateJson)

        val pending = state.pendingPickTarget
            ?: throw GameActionException("No pending target pick")
        if (pending.pickerPlayerId != ctx.playerId.toString()) {
            throw ForbiddenException("It is not your turn to pick a target")
        }

        val players = playerRepository.findBySessionId(session.id)
        val playerMap = players.associateBy { it.id.toString() }
        val target = playerMap[targetPlayerId]
            ?: throw GameActionException("Player '$targetPlayerId' not found in session")

        when (pending.pickType) {
            PickTargetType.SIP_PICK -> {
                requirePhase(state, GamePhase.PICK_TARGET, "pick a sip target")
                state.pendingPickTarget = null
                persist(entity, state)

                val picker = playerMap[ctx.playerId.toString()]!!
                gameEventPublisher.publish(
                    SipAssignedEvent(
                        sessionCode = code,
                        targetPlayerId = targetPlayerId,
                        targetUsername = target.username,
                        assignedByUsername = picker.username
                    )
                )
                doAdvanceTurn(state, code, entity)
            }
            PickTargetType.BUDDY_PICK -> {
                requirePhase(state, GamePhase.PICK_BUDDY, "pick a buddy")
                val pickerId = ctx.playerId.toString()
                pairBuddies(state.drinkingBuddies, pickerId, targetPlayerId)
                state.pendingPickTarget = null

                val picker = playerMap[pickerId]!!
                persist(entity, state)

                gameEventPublisher.publish(
                    BuddyAssignedEvent(
                        sessionCode = code,
                        player1Id = pickerId,
                        player1Username = picker.username,
                        player2Id = targetPlayerId,
                        player2Username = target.username
                    )
                )
                doAdvanceTurn(state, code, entity)
            }
        }
    }

    /** Each player has at most one buddy, so both players leave their previous pairs first. */
    private fun pairBuddies(buddies: MutableMap<String, String>, playerId: String, buddyId: String) {
        listOf(playerId, buddyId).forEach { id -> buddies.remove(id)?.let(buddies::remove) }
        buddies[playerId] = buddyId
        buddies[buddyId] = playerId
    }

    // ── Touch Race ────────────────────────────────────────────────────────────

    private fun startTouchRace(
        state: KingsCupGameState,
        code: String,
        initiator: Player,
        eligibleIds: List<String>,
        raceType: TouchRaceType
    ) {
        val raceId = UUID.randomUUID().toString()
        state.touchRace = TouchRaceState(
            raceId = raceId,
            raceType = raceType,
            initiatorId = initiator.id.toString(),
            eligiblePlayerIds = eligibleIds,
            startedAt = Instant.now().toEpochMilli()
        )

        gameEventPublisher.publish(
            TouchRaceStartedEvent(
                sessionCode = code,
                raceId = raceId,
                raceType = raceType.name,
                initiatorUsername = initiator.username,
                eligiblePlayerIds = eligibleIds,
                windowSeconds = 10
            )
        )

        val future = scheduler.schedule({
            self.resolveTouchRace(code, raceId)
        }, 10, TimeUnit.SECONDS)
        activeRaces[raceId] = future
    }

    @Transactional
    fun registerTouch(ctx: PlayerContext, code: String, raceId: String) {
        val session = requireSession(code)
        val entity = kingsCupStateRepository.findBySessionIdForUpdate(session.id)
            ?: throw GameActionException("No game state found for session '$code'")
        val state = deserialize(entity.gameStateJson)

        requirePhase(state, GamePhase.TOUCH_RACE, "touch")

        val race = state.touchRace
            ?: throw GameActionException("No active touch race")
        if (race.raceId != raceId) {
            throw GameActionException("Touch race ID mismatch")
        }
        if (race.resolved) {
            throw GameActionException("Touch race already resolved")
        }
        val playerId = ctx.playerId.toString()
        if (!race.eligiblePlayerIds.contains(playerId)) {
            throw GameActionException("You are not eligible for this touch race")
        }
        if (race.touchTimestamps.containsKey(playerId)) {
            throw GameActionException("You already touched")
        }

        race.touchOrder.add(playerId)
        race.touchTimestamps[playerId] = Instant.now().toEpochMilli()
        persist(entity, state)

        // If all eligible players have touched, resolve immediately (via proxy for @Transactional)
        if (race.touchOrder.size >= race.eligiblePlayerIds.size) {
            self.resolveTouchRace(code, raceId)
        }
    }

    @Transactional
    @Synchronized
    fun resolveTouchRace(code: String, raceId: String) {
        val session = sessionRepository.findBySessionCode(code.uppercase()) ?: return
        val entity = kingsCupStateRepository.findBySessionIdForUpdate(session.id) ?: return
        val state = deserialize(entity.gameStateJson)

        val race = state.touchRace ?: return
        if (race.raceId != raceId || race.resolved) return

        // Cancel the scheduled future if resolving early
        activeRaces[raceId]?.cancel(false)
        activeRaces.remove(raceId)

        // Determine loser: player absent from touchOrder, or last in touchOrder if all touched
        val players = playerRepository.findBySessionId(session.id)
        val playerMap = players.associateBy { it.id.toString() }

        val loserId: String = if (race.touchOrder.size < race.eligiblePlayerIds.size) {
            // Someone didn't touch — pick first who didn't
            race.eligiblePlayerIds.first { !race.touchOrder.contains(it) }
        } else {
            // All touched — last one loses
            race.touchOrder.last()
        }

        race.resolved = true
        race.loserId = loserId
        state.touchRace = null

        persist(entity, state)

        val loser = playerMap[loserId]
        gameEventPublisher.publish(
            TouchRaceResultEvent(
                sessionCode = code,
                raceId = raceId,
                loserPlayerId = loserId,
                loserUsername = loser?.username ?: loserId,
                touchOrder = race.touchOrder.toList(),
                raceType = race.raceType.name
            )
        )

        when (race.raceType) {
            TouchRaceType.CARD_FOUR -> doAdvanceTurn(state, code, entity)
            // The queen interrupts between draws — the current drawer keeps their turn
            TouchRaceType.QUEEN -> resumeDrawing(state, entity)
        }
    }

    private fun resumeDrawing(state: KingsCupGameState, entity: KingsCupState) {
        state.phase = GamePhase.WAITING_TO_DRAW
        persist(entity, state)
    }

    // ── Queen Button ──────────────────────────────────────────────────────────

    @Transactional
    fun activateQueenButton(ctx: PlayerContext, code: String) {
        val session = requireSession(code)
        val entity = kingsCupStateRepository.findBySessionIdForUpdate(session.id)
            ?: throw GameActionException("No game state found for session '$code'")
        val state = deserialize(entity.gameStateJson)

        requirePhase(state, GamePhase.WAITING_TO_DRAW, "activate queen button")

        val playerId = ctx.playerId.toString()
        if (state.thumbQueenId != playerId) {
            throw ForbiddenException("You are not the thumb queen")
        }
        if (state.thumbQueenUsesLeft <= 0) {
            throw GameActionException("Thumb queen has no uses left")
        }

        state.thumbQueenUsesLeft--
        val newUsesLeft = state.thumbQueenUsesLeft
        if (newUsesLeft <= 0) {
            state.thumbQueenId = null
        }

        val players = playerRepository.findBySessionId(session.id)
        val playerMap = players.associateBy { it.id.toString() }
        val queen = playerMap[playerId]!!

        // Eligible: everyone except the queen
        val eligibleIds = state.turnOrder.filter { it != playerId }

        state.phase = GamePhase.TOUCH_RACE
        persist(entity, state)

        // Notify all clients of updated uses so frontend counter stays in sync
        gameEventPublisher.publish(
            ThumbQueenAssignedEvent(
                sessionCode = code,
                queenPlayerId = playerId,
                queenUsername = queen.username,
                usesLeft = newUsesLeft
            )
        )

        startTouchRace(state, code, queen, eligibleIds, TouchRaceType.QUEEN)
        persist(entity, state)
    }

    // ── Word Round ────────────────────────────────────────────────────────────

    @Transactional
    fun submitWord(ctx: PlayerContext, code: String, word: String?, passed: Boolean) {
        val session = requireSession(code)
        val entity = kingsCupStateRepository.findBySessionIdForUpdate(session.id)
            ?: throw GameActionException("No game state found for session '$code'")
        val state = deserialize(entity.gameStateJson)

        requirePhase(state, GamePhase.WORD_ROUND, "submit word")

        val round = state.wordRound
            ?: throw GameActionException("No active word round")
        if (round.resolved) {
            throw GameActionException("Word round already resolved")
        }

        val speakerId = state.turnOrder[round.currentSpeakerIndex]
        if (speakerId != ctx.playerId.toString()) {
            throw ForbiddenException("It is not your turn to speak")
        }

        val players = playerRepository.findBySessionId(session.id)
        val playerMap = players.associateBy { it.id.toString() }
        val speaker = playerMap[speakerId]!!

        val submission = WordSubmission(
            playerId = speakerId,
            username = speaker.username,
            word = word ?: "",
            passed = passed
        )
        round.submissions.add(submission)

        if (passed) {
            // This player loses — they couldn't answer
            round.resolved = true
            round.loserId = speakerId
            state.wordRound = null

            persist(entity, state)

            gameEventPublisher.publish(
                WordRoundResultEvent(
                    sessionCode = code,
                    roundId = round.roundId,
                    loserPlayerId = speakerId,
                    loserUsername = speaker.username
                )
            )
            doAdvanceTurn(state, code, entity)
        } else {
            // Move to next speaker (wrap around turn order)
            val nextIndex = (round.currentSpeakerIndex + 1) % state.turnOrder.size
            round.currentSpeakerIndex = nextIndex
            val nextSpeakerId = state.turnOrder[nextIndex]
            val nextSpeaker = playerMap[nextSpeakerId]!!

            persist(entity, state)

            gameEventPublisher.publish(
                WordRoundTurnEvent(
                    sessionCode = code,
                    roundId = round.roundId,
                    lastSubmission = WordSubmissionDto(
                        playerId = submission.playerId,
                        username = submission.username,
                        word = submission.word,
                        passed = submission.passed
                    ),
                    nextSpeakerPlayerId = nextSpeakerId,
                    nextSpeakerUsername = nextSpeaker.username
                )
            )
        }
    }

    // ── Jack Rule ─────────────────────────────────────────────────────────────

    @Transactional
    fun submitJackRule(ctx: PlayerContext, code: String, ruleText: String) {
        val session = requireSession(code)
        val entity = kingsCupStateRepository.findBySessionIdForUpdate(session.id)
            ?: throw GameActionException("No game state found for session '$code'")
        val state = deserialize(entity.gameStateJson)

        requireCurrentDrawer(ctx, state, "submit jack rule")
        requirePhase(state, GamePhase.SUBMIT_JACK_RULE, "submit jack rule")

        val players = playerRepository.findBySessionId(session.id)
        val playerMap = players.associateBy { it.id.toString() }
        val drawer = playerMap[ctx.playerId.toString()]!!

        val rule = JackRule(
            ruleText = ruleText,
            authorName = drawer.username,
            authorId = drawer.id.toString()
        )
        state.jackRules.add(rule)

        persist(entity, state)

        gameEventPublisher.publish(
            JackRuleAddedEvent(
                sessionCode = code,
                ruleText = ruleText,
                authorUsername = drawer.username,
                allRules = state.jackRules.map { it.toDto() }
            )
        )
        doAdvanceTurn(state, code, entity)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────


    @Transactional
    fun abandonGame(sessionId: UUID) {
        kingsCupStateRepository.findBySessionId(sessionId)?.let {
            kingsCupStateRepository.delete(it)
        }
    }

    private fun requireSession(code: String) =
        sessionRepository.findBySessionCode(code.uppercase())
            ?: throw SessionNotFoundException(code)

    private fun requirePlayerInSession(ctx: PlayerContext, sessionId: java.util.UUID) {
        if (ctx.sessionId != sessionId) {
            throw ForbiddenException("You are not in this session")
        }
    }

    private fun requireCurrentDrawer(ctx: PlayerContext, state: KingsCupGameState, action: String) {
        val currentDrawerId = state.turnOrder[state.currentTurnIndex]
        if (ctx.playerId.toString() != currentDrawerId) {
            throw ForbiddenException("It is not your turn to $action")
        }
    }

    private fun requirePhase(state: KingsCupGameState, expected: GamePhase, action: String) {
        if (state.phase != expected) {
            throw GameActionException("Cannot $action in phase ${state.phase}")
        }
    }

    private fun deserialize(json: String): KingsCupGameState =
        mapper.readValue(json)

    private fun persist(entity: KingsCupState, state: KingsCupGameState) {
        entity.gameStateJson = mapper.writeValueAsString(state)
        entity.updatedAt = Instant.now()
        kingsCupStateRepository.save(entity)
    }

    private fun buildStateResponse(
        state: KingsCupGameState,
        playerMap: Map<String, Player>
    ): KingsCupStateResponse {
        val currentDrawerId = state.turnOrder[state.currentTurnIndex]
        return KingsCupStateResponse(
            phase = state.phase.name,
            currentDrawerPlayerId = currentDrawerId,
            currentCard = state.currentCard,
            cardsRemaining = state.deck.size,
            turnOrder = state.turnOrder.mapNotNull { id ->
                playerMap[id]?.let { p ->
                    PlayerSummaryDto(id = p.id.toString(), username = p.username, avatar = p.avatar)
                }
            },
            drinkingBuddies = state.drinkingBuddies,
            thumbQueenId = state.thumbQueenId,
            thumbQueenUsesLeft = state.thumbQueenUsesLeft,
            jackRules = state.jackRules.map { it.toDto() },
            kingsDrawn = state.kingsDrawn,
            kingsCupContents = state.kingsCupContents.toList(),
            touchRace = state.touchRace?.let { race ->
                TouchRaceStateDto(
                    raceId = race.raceId,
                    raceType = race.raceType.name,
                    eligiblePlayerIds = race.eligiblePlayerIds,
                    touchedPlayerIds = race.touchOrder.toList(),
                    windowSeconds = race.windowSeconds
                )
            },
            wordRound = state.wordRound?.let { round ->
                val speakerId = state.turnOrder[round.currentSpeakerIndex]
                WordRoundStateDto(
                    roundId = round.roundId,
                    roundType = round.roundType.name,
                    seedWord = round.seedWord,
                    currentSpeakerPlayerId = speakerId,
                    submissions = round.submissions.map { s ->
                        WordSubmissionResponseDto(
                            playerId = s.playerId,
                            username = s.username,
                            word = s.word,
                            passed = s.passed
                        )
                    }
                )
            },
            pendingCategory = state.pendingCategory
        )
    }
}
