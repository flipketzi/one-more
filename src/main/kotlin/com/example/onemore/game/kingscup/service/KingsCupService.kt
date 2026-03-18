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
        val rank = CardDeck.rank(card)
        val players = playerRepository.findBySessionId(session.id)
        val playerMap = players.associateBy { it.id.toString() }
        val drawer = playerMap[ctx.playerId.toString()]!!

        // Announce the card draw
        routeCard(state, code, card, rank, drawer, playerMap, entity)
        persist(entity, state)
    }

    private fun routeCard(
        state: KingsCupGameState,
        code: String,
        card: String,
        rank: String,
        drawer: Player,
        playerMap: Map<String, Player>,
        entity: KingsCupState
    ) {
        when (rank) {
            "2" -> {
                state.phase = GamePhase.PICK_TARGET
                state.pendingPickTarget = PendingPickTarget(PickTargetType.SIP_PICK, drawer.id.toString())
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
            }
            "3" -> {
                state.phase = GamePhase.EXECUTING_DISPLAY
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
            }
            "4" -> {
                state.phase = GamePhase.TOUCH_RACE
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
                val eligibleIds = state.turnOrder.toList()
                startTouchRace(state, code, drawer, eligibleIds, TouchRaceType.CARD_FOUR)
            }
            "5" -> {
                state.phase = GamePhase.EXECUTING_DISPLAY
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
            }
            "6" -> {
                state.phase = GamePhase.EXECUTING_DISPLAY
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
            }
            "7" -> {
                state.phase = GamePhase.EXECUTING_DISPLAY
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
            }
            "8" -> {
                state.phase = GamePhase.PICK_BUDDY
                state.pendingPickTarget = PendingPickTarget(PickTargetType.BUDDY_PICK, drawer.id.toString())
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
            }
            "9" -> {
                val seed = KingsCupData.randomRhymeSeed()
                state.phase = GamePhase.WORD_ROUND
                state.wordRound = WordRoundState(
                    roundId = UUID.randomUUID().toString(),
                    roundType = WordRoundType.RHYME,
                    seedWord = seed,
                    currentSpeakerIndex = state.currentTurnIndex
                )
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
                gameEventPublisher.publish(
                    WordRoundStartedEvent(
                        sessionCode = code,
                        roundId = state.wordRound!!.roundId,
                        roundType = "RHYME",
                        seedWord = seed,
                        firstSpeakerPlayerId = drawer.id.toString(),
                        firstSpeakerUsername = drawer.username
                    )
                )
            }
            "10" -> {
                val category = KingsCupData.randomCategory()
                state.phase = GamePhase.PICK_TARGET
                state.pendingPickTarget = PendingPickTarget(PickTargetType.SIP_PICK, drawer.id.toString())
                state.pendingCategory = category
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
            }
            "J" -> {
                state.phase = GamePhase.SUBMIT_JACK_RULE
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
            }
            "Q" -> {
                state.phase = GamePhase.EXECUTING_DISPLAY
                // Invalidate previous thumb queen
                val oldQueenId = state.thumbQueenId
                state.thumbQueenId = drawer.id.toString()
                state.thumbQueenUsesLeft = 3
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
                gameEventPublisher.publish(
                    ThumbQueenAssignedEvent(
                        sessionCode = code,
                        queenPlayerId = drawer.id.toString(),
                        queenUsername = drawer.username,
                        usesLeft = 3
                    )
                )
            }
            "K" -> {
                state.kingsDrawn++
                // Add current card suit to cup contents
                state.kingsCupContents.add(card)
                val isLastKing = state.kingsDrawn >= 4
                state.phase = GamePhase.EXECUTING_DISPLAY

                val lastKingDrinker = if (isLastKing) {
                    // Last king drawer drinks the cup
                    drawer.id.toString()
                } else null

                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
                gameEventPublisher.publish(
                    KingDrawnEvent(
                        sessionCode = code,
                        kingsDrawn = state.kingsDrawn,
                        drawerUsername = drawer.username,
                        kingsCupContents = state.kingsCupContents.toList(),
                        isLastKing = isLastKing,
                        lastKingDrinkerPlayerId = lastKingDrinker
                    )
                )
            }
            "A" -> {
                state.phase = GamePhase.EXECUTING_DISPLAY
                gameEventPublisher.publish(CardDrawnEvent(code, card, drawer.id.toString(), drawer.username, state.phase.name))
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
        val isLastKing = card != null && CardDeck.rank(card) == "K" && state.kingsDrawn >= 4
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
                // Store buddy relation both ways
                val pickerId = ctx.playerId.toString()
                state.drinkingBuddies[pickerId] = targetPlayerId
                state.drinkingBuddies[targetPlayerId] = pickerId
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
                touchOrder = race.touchOrder.toList()
            )
        )

        // Advance turn after race
        doAdvanceTurn(state, code, entity)
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
