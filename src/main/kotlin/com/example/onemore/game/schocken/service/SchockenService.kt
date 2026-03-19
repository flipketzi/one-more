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
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.random.Random

@Service
class SchockenService(
    private val sessionRepository: GameSessionRepository,
    private val playerRepository: PlayerRepository,
    private val publisher: SchockenEventPublisher,
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
    }

    // ── Roll ─────────────────────────────────────────────────────────────────

    fun rollDice(code: String, context: PlayerContext, keptDieIds: List<Int>): RollResponse {
        val game = getGame(code)
        val turn = getTurn(game, context.playerId)

        val currentPlayer = game.playerOrder[game.currentPlayerIdx]
        if (currentPlayer.id != context.playerId) {
            throw ForbiddenException("Nicht dein Zug")
        }

        val maxRolls = game.maxRollsThisRound ?: 3
        if (turn.rollCount >= maxRolls) {
            throw GameActionException("Maximale Anzahl an Würfen erreicht")
        }

        // Track if dice were kept between rolls
        if (turn.rollCount > 0 && keptDieIds.isNotEmpty()) {
            turn.hadKeptDice = true
        }

        val updatedDice = turn.dice.map { die ->
            if (die.id in keptDieIds) die.copy(kept = true)
            else die.copy(value = Random.nextInt(1, 7), kept = false)
        }
        turn.dice = updatedDice
        turn.rollCount++

        publisher.publish(
            code,
            PlayerRolledEvent(playerId = context.playerId.toString(), rollIndex = turn.rollCount)
        )

        // Auto-finish: if reached max rolls, evaluate hand
        if (turn.rollCount >= maxRolls) {
            val hand = evaluateHand(updatedDice.map { it.value }, turn.hadKeptDice)
            turn.hand = hand
        }

        return RollResponse(
            dice = updatedDice.map { DieDto(it.id, it.value, it.kept) },
            rollIndex = turn.rollCount,
        )
    }

    // ── Reveal ───────────────────────────────────────────────────────────────

    fun revealHand(code: String, context: PlayerContext): HandResultDto {
        val game = getGame(code)
        val turn = getTurn(game, context.playerId)

        if (turn.rollCount == 0) throw GameActionException("Noch nicht gewürfelt")
        if (turn.revealed) throw GameActionException("Hand bereits aufgedeckt")
        if (turn.standing) throw GameActionException("Du hast bereits gestanden")

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
        return hand.toDto()
    }

    // ── Stand ────────────────────────────────────────────────────────────────

    fun standPlayer(code: String, context: PlayerContext): HandResultDto {
        val game = getGame(code)
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

        publisher.publish(
            code,
            PlayerStoodEvent(playerId = context.playerId.toString(), hand = hand.toDto())
        )

        advanceToNextPlayer(game)

        return hand.toDto()
    }

    // ── State ────────────────────────────────────────────────────────────────

    fun getGameView(code: String, context: PlayerContext): PlayerGameViewDto {
        val game = getGame(code)
        val myTurn = game.turns[context.playerId]

        return PlayerGameViewDto(
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
                    hand = if (turn?.revealed == true || turn?.standing == true) turn.hand?.toDto() else null,
                    dice = if (turn?.revealed == true) turn.dice.map { DieDto(it.id, it.value, it.kept) } else null,
                )
            },
            currentPlayerIdx = game.currentPlayerIdx,
            maxRollsThisRound = game.maxRollsThisRound,
            lidStack = game.lidStack,
            playerLids = game.playerOrder.associate { it.id.toString() to it.lids },
            gameOver = game.gameOver,
        )
    }

    fun removeGame(sessionCode: String) {
        games.remove(sessionCode)
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private fun getGame(code: String): SchockenGameState =
        games[code.uppercase()] ?: throw SessionNotFoundException(code)

    private fun getTurn(game: SchockenGameState, playerId: UUID): PlayerTurn =
        game.turns[playerId] ?: throw ForbiddenException("Du bist kein Teilnehmer dieses Spiels")

    private fun advanceToNextPlayer(game: SchockenGameState) {
        val nextIdx = game.currentPlayerIdx + 1
        if (nextIdx >= game.playerOrder.size) {
            // All players have gone — check round end
            checkRoundEnd(game)
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

    private fun checkRoundEnd(game: SchockenGameState) {
        val activePlayers = game.playerOrder.filter { it.lids > 0 || game.turns[it.id]?.rollCount == 0 }

        val allDone = game.turns.values.all { it.revealed || it.standing }
        if (!allDone) return

        val turnsWithHands = game.turns.values.filter { it.hand != null }
        if (turnsWithHands.isEmpty()) return

        val minRank = turnsWithHands.minOf { it.hand!!.rank }
        val maxRank = turnsWithHands.maxOf { it.hand!!.rank }
        val winnerHand = turnsWithHands.first { it.hand!!.rank == maxRank }.hand!!
        val lidValue = winnerHand.lids

        val loserIds = turnsWithHands.filter { it.hand!!.rank == minRank }.map { it.playerId }

        // Distribute lids to losers
        loserIds.forEach { loserId ->
            val loserInfo = game.playerOrder.first { it.id == loserId }
            if (game.lidStack > 0) {
                val taken = minOf(lidValue, game.lidStack)
                loserInfo.lids += taken
                game.lidStack -= taken
            } else {
                // Take from player with most lids
                val richest = game.playerOrder.filter { it.id != loserId }.maxByOrNull { it.lids }
                if (richest != null && richest.lids > 0) {
                    val taken = minOf(lidValue, richest.lids)
                    richest.lids -= taken
                    loserInfo.lids += taken
                }
            }
        }

        val updatedPlayerLids = game.playerOrder.associate { it.id.toString() to it.lids }
        val activePlayers2 = game.playerOrder.filter { it.lids > 0 }

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
            publisher.publish(game.sessionCode, GameOverEvent(loserPlayerId = loser.id.toString()))
        } else {
            startNewRound(game, activePlayers2)
        }
    }

    private fun startNewRound(game: SchockenGameState, activePlayers: List<SchockenPlayerInfo>) {
        // Reset turns for active players
        game.turns.clear()
        game.playerOrder.clear()
        game.playerOrder.addAll(activePlayers)
        game.currentPlayerIdx = 0
        game.maxRollsThisRound = null

        activePlayers.forEachIndexed { idx, info ->
            game.turns[info.id] = PlayerTurn(playerId = info.id, playerOrder = idx)
        }

        publisher.publish(
            game.sessionCode,
            NextPlayerEvent(currentPlayerIdx = 0, maxRollsThisRound = null)
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
}

data class RollResponse(val dice: List<DieDto>, val rollIndex: Int)

data class PublicPlayerStateDto(
    val id: String,
    val username: String,
    val avatar: String,
    val lids: Int,
    val rollIndex: Int,
    val revealed: Boolean,
    val standing: Boolean,
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
)
