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
)
