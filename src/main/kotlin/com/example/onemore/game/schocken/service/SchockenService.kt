package com.example.onemore.game.schocken.service

import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.PlayerStatus
import com.example.onemore.domain.model.SessionStatus
import com.example.onemore.domain.repository.GameSessionRepository
import com.example.onemore.domain.repository.PlayerRepository
import com.example.onemore.exception.ForbiddenException
import com.example.onemore.exception.GameActionException
import com.example.onemore.exception.SessionNotFoundException
import com.example.onemore.game.schocken.domain.*
import com.example.onemore.game.schocken.websocket.*
import com.example.onemore.security.PlayerContext
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Service
class SchockenService(
    private val sessionRepository: GameSessionRepository,
    private val playerRepository: PlayerRepository,
    private val publisher: SchockenEventPublisher,
    private val diceRoller: DiceRoller,
) {
    private val games = ConcurrentHashMap<String, SchockenGameState>()

    // ── Init ─────────────────────────────────────────────────────────────────

    fun initGame(session: GameSession, players: List<Player>) {
        val playerInfos = players.mapIndexed { idx, p ->
            SchockenPlayerInfo(id = p.id, username = p.username, avatar = p.avatar)
        }.toMutableList()

        val turns = mutableMapOf<UUID, PlayerTurn>()
        playerInfos.forEachIndexed { idx, info ->
            turns[info.id] = PlayerTurn(playerId = info.id, playerOrder = idx)
        }

        val state = SchockenGameState(
            sessionCode = session.sessionCode,
            sessionId = session.id,
            playerOrder = playerInfos,
            turns = turns,
        )
        games[session.sessionCode] = state

        session.status = SessionStatus.IN_GAME
        session.updatedAt = Instant.now()
        sessionRepository.save(session)

        val playerLids = playerInfos.associate { it.id.toString() to it.lids }
        publisher.publish(
            session.sessionCode,
            GameStartedEvent(
                playerOrder = playerInfos.map { it.toDto() },
                lidStack = state.lidStack,
                playerLids = playerLids,
                currentPlayerIdx = 0,
            )
        )

        synchronized(state) { playOpeningRound(state) }
    }

    /**
     * "Erster Hoch": every player throws once, automatically. It scores as a normal round —
     * the worst throw takes the lids and starts the next round (ties: first in player order).
     */
    private fun playOpeningRound(game: SchockenGameState) {
        val throws = game.playerOrder.map { info ->
            val dice = List(DICE_COUNT) { SchockenDie(id = it, value = diceRoller.roll(), kept = false) }
            val hand = evaluateHand(dice.map { it.value }, hadKeptDice = false)
            game.turns.getValue(info.id).apply {
                this.dice = dice
                this.hand = hand
                rollCount = 1
                revealed = true
            }
            OpeningThrow(playerId = info.id, dice = dice, hand = hand)
        }
        val outcome = checkRoundEnd(game)
            ?: throw IllegalStateException("Opening round must always produce a result")
        game.openingRound = OpeningRound(throws = throws, outcome = outcome)
    }

    // ── Roll ─────────────────────────────────────────────────────────────────

    fun rollDice(code: String, context: PlayerContext, keptDieIds: List<Int>): RollResponse = withGame(code) { game ->
        val turn = getTurn(game, context.playerId)

        val currentPlayer = game.playerOrder[game.currentPlayerIdx]
        if (currentPlayer.id != context.playerId) {
            throw ForbiddenException("Nicht dein Zug")
        }

        val maxRolls = game.maxRollsThisRound ?: 3
        if (turn.rollCount >= maxRolls) {
            throw GameActionException("Maximale Anzahl an Würfen erreicht")
        }

        // Dice start with placeholder values — keeping them on the first roll would skip rolling
        if (turn.rollCount == 0 && keptDieIds.isNotEmpty()) {
            throw GameActionException("Beim ersten Wurf können keine Würfel beiseitegelegt werden")
        }

        val updatedDice = turn.dice.map { die ->
            if (die.id in keptDieIds) die.copy(kept = true)
            else die.copy(value = diceRoller.roll(), kept = false)
        }
        // The regular game has begun, so the opening round result is no longer current
        game.openingRound = null
        turn.dice = updatedDice
        // Only the current combination counts: re-rolling all dice is a fresh throw again
        turn.hadKeptDice = updatedDice.any { it.kept }
        turn.rollCount++

        publisher.publish(
            code,
            PlayerRolledEvent(playerId = context.playerId.toString(), rollIndex = turn.rollCount)
        )

        // Auto-finish: if reached max rolls, evaluate hand and close the cup
        if (turn.rollCount >= maxRolls) {
            val hand = evaluateHand(updatedDice.map { it.value }, turn.hadKeptDice)
            turn.hand = hand
            turn.closed = true
            advanceToNextPlayer(game)
        }

        // Non-kept dice are hidden for closed cups (player may not look at the last roll)
        val returnedDice = if (turn.closed) {
            updatedDice.map { die -> DieDto(die.id, if (die.kept) die.value else 0, die.kept) }
        } else {
            updatedDice.map { DieDto(it.id, it.value, it.kept) }
        }

        RollResponse(dice = returnedDice, rollIndex = turn.rollCount)
    }

    // ── Reveal ───────────────────────────────────────────────────────────────

    fun revealHand(code: String, context: PlayerContext): HandResultDto = withGame(code) { game ->
        val turn = getTurn(game, context.playerId)

        if (turn.revealed) throw GameActionException("Hand bereits aufgedeckt")

        if (game.inRevealPhase) {
            // Reveal phase: only the queue head may reveal
            val headId = game.revealQueue.firstOrNull()
                ?: throw GameActionException("Keine Aufdeckphase aktiv")
            if (headId != context.playerId)
                throw ForbiddenException("Du bist nicht an der Reihe zum Aufdecken")

            turn.revealed = true
            publisher.publish(
                code,
                PlayerRevealedEvent(
                    playerId = context.playerId.toString(),
                    dice = turn.dice.map { DieDto(it.id, it.value, it.kept) },
                    hand = turn.hand!!.toDto(),
                )
            )
            game.revealQueue.removeFirst()
            if (game.revealQueue.isEmpty()) {
                game.inRevealPhase = false
                checkRoundEnd(game)
            } else {
                publisher.publish(code, NextRevealerEvent(game.revealQueue.first().toString()))
            }
            return turn.hand!!.toDto()
        }

        // Normal offen path: player voluntarily lifts cup before max rolls
        if (turn.rollCount == 0) throw GameActionException("Noch nicht gewürfelt")
        if (turn.standing) throw GameActionException("Du hast bereits gestanden")
        if (turn.closed) throw GameActionException("Hand geschlossen — warte auf die Aufdeckphase")
        val currentPlayer = game.playerOrder[game.currentPlayerIdx]
        if (currentPlayer.id != context.playerId) throw ForbiddenException("Nicht dein Zug")

        val hand = evaluateHand(turn.dice.map { it.value }, turn.hadKeptDice)
        turn.hand = hand
        turn.revealed = true

        publisher.publish(
            code,
            PlayerRevealedEvent(
                playerId = context.playerId.toString(),
                dice = turn.dice.map { DieDto(it.id, it.value, it.kept) },
                hand = hand.toDto(),
            )
        )

        advanceToNextPlayer(game)
        hand.toDto()
    }

    // ── Stand ────────────────────────────────────────────────────────────────

    fun standPlayer(code: String, context: PlayerContext): HandResultDto = withGame(code) { game ->
        val turn = getTurn(game, context.playerId)

        val currentPlayer = game.playerOrder[game.currentPlayerIdx]
        if (currentPlayer.id != context.playerId) {
            throw ForbiddenException("Nicht dein Zug")
        }

        if (turn.rollCount == 0) throw GameActionException("Noch nicht gewürfelt")
        if (turn.revealed) throw GameActionException("Hand bereits aufgedeckt")
        if (turn.standing) throw GameActionException("Bereits gestanden")

        val hand = evaluateHand(turn.dice.map { it.value }, turn.hadKeptDice)
        turn.hand = hand

        // First player standing sets the max rolls for this round
        if (game.currentPlayerIdx == 0 && game.maxRollsThisRound == null) {
            game.maxRollsThisRound = turn.rollCount
        }

        turn.standing = true

        // Hand is NOT broadcast — it stays hidden until the reveal phase
        publisher.publish(code, PlayerStoodEvent(playerId = context.playerId.toString()))

        advanceToNextPlayer(game)

        hand.toDto()
    }

    // ── State ────────────────────────────────────────────────────────────────

    fun getGameView(code: String, context: PlayerContext): PlayerGameViewDto = withGame(code) { game ->
        val myTurn = game.turns[context.playerId]

        PlayerGameViewDto(
            myDice = myTurn?.dice?.map { DieDto(it.id, it.value, it.kept) } ?: emptyList(),
            myRollIndex = myTurn?.rollCount ?: 0,
            playerOrder = game.playerOrder.map { info ->
                val turn = game.turns[info.id]
                PublicPlayerStateDto(
                    id = info.id.toString(),
                    username = info.username,
                    avatar = info.avatar,
                    lids = info.lids,
                    rollIndex = turn?.rollCount ?: 0,
                    revealed = turn?.revealed ?: false,
                    standing = turn?.standing ?: false,
                    hand = if (turn?.revealed == true) turn.hand?.toDto() else null,
                    dice = when {
                        turn?.revealed == true -> turn.dice.map { DieDto(it.id, it.value, it.kept) }
                        turn?.standing == true || turn?.closed == true ->
                            turn!!.dice.filter { it.kept }.map { DieDto(it.id, it.value, it.kept) }
                        else -> null
                    },
                    closed = turn?.closed ?: false,
                )
            },
            currentPlayerIdx = game.currentPlayerIdx,
            maxRollsThisRound = game.maxRollsThisRound,
            lidStack = game.lidStack,
            playerLids = game.playerOrder.associate { it.id.toString() to it.lids },
            gameOver = game.gameOver,
            gameOverLoserId = game.gameOverLoserId?.toString(),
            openingRound = game.openingRound?.toDto(),
        )
    }

    fun removeGame(sessionCode: String) {
        games.remove(sessionCode)
    }

    fun publishGameAbandoned(sessionCode: String) {
        publisher.publish(sessionCode, GameAbandonedEvent())
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private fun getGame(code: String): SchockenGameState =
        games[code.uppercase()] ?: throw SessionNotFoundException(code)

    /** Serializes all actions on one game so concurrent requests cannot interleave on its mutable state. */
    private inline fun <T> withGame(code: String, action: (SchockenGameState) -> T): T {
        val game = getGame(code)
        return synchronized(game) { action(game) }
    }

    private fun getTurn(game: SchockenGameState, playerId: UUID): PlayerTurn =
        game.turns[playerId] ?: throw ForbiddenException("Du bist kein Teilnehmer dieses Spiels")

    private fun advanceToNextPlayer(game: SchockenGameState) {
        val nextIdx = game.currentPlayerIdx + 1
        if (nextIdx >= game.playerOrder.size) {
            startRevealPhaseOrEnd(game)
        } else {
            game.currentPlayerIdx = nextIdx
            publisher.publish(
                game.sessionCode,
                NextPlayerEvent(
                    currentPlayerIdx = nextIdx,
                    maxRollsThisRound = game.maxRollsThisRound,
                )
            )
        }
    }

    private fun startRevealPhaseOrEnd(game: SchockenGameState) {
        val queue = game.playerOrder
            .map { it.id }
            .filter { id -> game.turns[id]?.revealed == false }

        if (queue.isEmpty()) {
            checkRoundEnd(game)
            return
        }

        game.inRevealPhase = true
        game.revealQueue = queue.toMutableList()
        publisher.publish(
            game.sessionCode,
            RevealPhaseStartedEvent(
                orderedRevealerIds = queue.map { it.toString() },
                currentRevealerId = queue.first().toString(),
            )
        )
    }

    /** Scores the round once every player is done; returns null while the round is still running. */
    private fun checkRoundEnd(game: SchockenGameState): RoundOutcome? {
        val allDone = game.turns.values.all { it.revealed || it.standing || it.closed }
        if (!allDone) return null

        val turnsWithHands = game.turns.values.filter { it.hand != null }
        if (turnsWithHands.isEmpty()) return null

        val minRank = turnsWithHands.minOf { it.hand!!.rank }
        val maxRank = turnsWithHands.maxOf { it.hand!!.rank }
        val winnerHand = turnsWithHands.first { it.hand!!.rank == maxRank }.hand!!
        val lidValue = winnerHand.lids

        val loserIds = turnsWithHands.filter { it.hand!!.rank == minRank }.map { it.playerId }
        val winnerId = turnsWithHands.first { it.hand!!.rank == maxRank }.playerId
        val winnerInfo = game.playerOrder.first { it.id == winnerId }

        // Distribute lids to losers
        loserIds.forEach { loserId ->
            val loserInfo = game.playerOrder.first { it.id == loserId }
            if (game.lidStack > 0) {
                val taken = minOf(lidValue, game.lidStack)
                loserInfo.lids += taken
                game.lidStack -= taken
            } else {
                // Stack empty: the round winner gives their lids to the loser
                if (winnerInfo.id != loserId && winnerInfo.lids > 0) {
                    val taken = minOf(lidValue, winnerInfo.lids)
                    winnerInfo.lids -= taken
                    loserInfo.lids += taken
                }
            }
        }

        val updatedPlayerLids = game.playerOrder.associate { it.id.toString() to it.lids }
        // While the central stack still has lids, no player is eliminated yet.
        // Elimination (lids == 0 after redistribution) only applies once the stack is empty.
        val activePlayers2 = if (game.lidStack == 0)
            game.playerOrder.filter { it.lids > 0 }
        else
            game.playerOrder.toList()

        publisher.publish(
            game.sessionCode,
            RoundEndedEvent(
                loserIds = loserIds.map { it.toString() },
                lidValue = lidValue,
                lidStack = game.lidStack,
                playerLids = updatedPlayerLids,
                activePlayerIds = activePlayers2.map { it.id.toString() },
            )
        )

        if (activePlayers2.size <= 1) {
            val loser = activePlayers2.firstOrNull() ?: game.playerOrder.first()
            game.gameOver = true
            game.gameOverLoserId = loser.id
            publisher.publish(game.sessionCode, GameOverEvent(loserPlayerId = loser.id.toString()))
        } else {
            startNewRound(game, activePlayers2, starterPlayerId = loserIds.first())
        }
        return RoundOutcome(loserIds = loserIds, lidValue = lidValue)
    }

    private fun startNewRound(game: SchockenGameState, activePlayers: List<SchockenPlayerInfo>, starterPlayerId: UUID) {
        game.turns.clear()
        game.playerOrder.clear()
        game.maxRollsThisRound = null
        game.currentPlayerIdx = 0
        game.inRevealPhase = false
        game.revealQueue.clear()

        // Rotate player list so the round loser is always first (preserves existing index-based logic)
        val starterIdx = activePlayers.indexOfFirst { it.id == starterPlayerId }.coerceAtLeast(0)
        val rotated = activePlayers.drop(starterIdx) + activePlayers.take(starterIdx)
        game.playerOrder.addAll(rotated)

        rotated.forEachIndexed { idx, info ->
            game.turns[info.id] = PlayerTurn(playerId = info.id, playerOrder = idx)
        }

        publisher.publish(
            game.sessionCode,
            NextPlayerEvent(
                currentPlayerIdx = 0,
                maxRollsThisRound = null,
                playerOrderIds = rotated.map { it.id.toString() },
            )
        )
    }

    // ── Hand evaluation ───────────────────────────────────────────────────────

    fun evaluateHand(values: List<Int>, hadKeptDice: Boolean): HandResult {
        val sorted = values.sorted()
        val a = sorted[0]
        val b = sorted[1]
        val c = sorted[2]

        // Schock out: 1-1-1
        if (a == 1 && b == 1 && c == 1) return HandResult("Schock Out", 13, 10000)

        // Schock X: 1-1-X (X = 2..6)
        if (a == 1 && b == 1) return HandResult("Schock $c", c, 9000 + c * 10)

        // Jule: 1-2-4 (only without kept dice)
        if (!hadKeptDice && a == 1 && b == 2 && c == 4) return HandResult("Jule", 7, 8700)

        // General X: X-X-X (only without kept dice)
        if (!hadKeptDice && a == b && b == c) return HandResult("General $a", 3, 8000 + a * 10)

        // Straße (only without kept dice): three consecutive dice
        if (!hadKeptDice) {
            val straße = listOf(
                listOf(1, 2, 3) to Pair(7400, "Straße 1-2-3"),
                listOf(2, 3, 4) to Pair(7300, "Straße 2-3-4"),
                listOf(3, 4, 5) to Pair(7200, "Straße 3-4-5"),
                listOf(4, 5, 6) to Pair(7100, "Straße 4-5-6"),
            )
            straße.forEach { (combo, rankName) ->
                if (sorted == combo) return HandResult(rankName.second, 2, rankName.first)
            }
        }

        // Normal: rank = c*100 + b*10 + a
        val rank = c * 100 + b * 10 + a
        return HandResult("$c-$b-$a", 1, rank)
    }

    private fun SchockenPlayerInfo.toDto() = PlayerInfoDto(
        id = id.toString(),
        username = username,
        avatar = avatar,
        lids = lids,
    )

    private fun HandResult.toDto() = HandResultDto(name = name, lids = lids, rank = rank)

    private fun OpeningRound.toDto() = OpeningRoundDto(
        throws = throws.map { t ->
            OpeningThrowDto(
                playerId = t.playerId.toString(),
                dice = t.dice.map { DieDto(it.id, it.value, it.kept) },
                hand = t.hand.toDto(),
            )
        },
        loserIds = outcome.loserIds.map { it.toString() },
        lidValue = outcome.lidValue,
    )

    private companion object {
        const val DICE_COUNT = 3
    }
}

data class OpeningThrowDto(val playerId: String, val dice: List<DieDto>, val hand: HandResultDto)

/** loserIds are in player order — the first one starts the next round. */
data class OpeningRoundDto(val throws: List<OpeningThrowDto>, val loserIds: List<String>, val lidValue: Int)

data class RollResponse(val dice: List<DieDto>, val rollIndex: Int)

data class PublicPlayerStateDto(
    val id: String,
    val username: String,
    val avatar: String,
    val lids: Int,
    val rollIndex: Int,
    val revealed: Boolean,
    val standing: Boolean,
    val closed: Boolean,
    val hand: HandResultDto?,
    val dice: List<DieDto>?,
)

data class PlayerGameViewDto(
    val myDice: List<DieDto>,
    val myRollIndex: Int,
    val playerOrder: List<PublicPlayerStateDto>,
    val currentPlayerIdx: Int,
    val maxRollsThisRound: Int?,
    val lidStack: Int,
    val playerLids: Map<String, Int>,
    val gameOver: Boolean,
    val gameOverLoserId: String?,
    val openingRound: OpeningRoundDto?,
)
