package com.example.onemore.game.schocken.domain

import java.util.UUID

data class SchockenDie(val id: Int, var value: Int, var kept: Boolean)

data class HandResult(val name: String, val lids: Int, val rank: Int)

data class PlayerTurn(
    val playerId: UUID,
    val playerOrder: Int,
    var dice: List<SchockenDie> = List(3) { SchockenDie(it, 1, false) },
    var rollCount: Int = 0,
    var hadKeptDice: Boolean = false,
    var hand: HandResult? = null,
    var revealed: Boolean = false,
    var standing: Boolean = false,
    var closed: Boolean = false,   // all rolls used, hand hidden until reveal phase
)

data class SchockenPlayerInfo(
    val id: UUID,
    val username: String,
    val avatar: String,
    var lids: Int = 0,
)

data class SchockenGameState(
    val sessionCode: String,
    val sessionId: UUID,
    val playerOrder: MutableList<SchockenPlayerInfo>,
    var currentPlayerIdx: Int = 0,
    var maxRollsThisRound: Int? = null,
    var lidStack: Int = 13,
    val turns: MutableMap<UUID, PlayerTurn> = mutableMapOf(),
    var gameOver: Boolean = false,
    var inRevealPhase: Boolean = false,
    var revealQueue: MutableList<UUID> = mutableListOf(),
    /** "Erster Hoch" result — kept until the first roll of the following round. */
    var openingRound: OpeningRound? = null,
    var gameOverLoserId: UUID? = null,
)

/** Outcome of a finished round: who lost and how many lids the best hand was worth. */
data class RoundOutcome(val loserIds: List<UUID>, val lidValue: Int)

/** One player's single throw in the "Erster Hoch" opening round. */
data class OpeningThrow(val playerId: UUID, val dice: List<SchockenDie>, val hand: HandResult)

data class OpeningRound(val throws: List<OpeningThrow>, val outcome: RoundOutcome)
