package com.example.onemore.game.schocken.websocket

import java.time.Instant
import java.util.UUID

sealed class SchockenEvent(val type: String, val timestamp: Instant = Instant.now())

data class PlayerInfoDto(
    val id: String,
    val username: String,
    val avatar: String,
    val lids: Int,
)

data class DieDto(val id: Int, val value: Int, val kept: Boolean)

data class HandResultDto(val name: String, val lids: Int, val rank: Int)

class GameStartedEvent(
    val playerOrder: List<PlayerInfoDto>,
    val lidStack: Int,
    val playerLids: Map<String, Int>,
    val currentPlayerIdx: Int,
) : SchockenEvent("GAME_STARTED")

class PlayerRolledEvent(
    val playerId: String,
    val rollIndex: Int,
) : SchockenEvent("PLAYER_ROLLED")

class PlayerRevealedEvent(
    val playerId: String,
    val dice: List<DieDto>,
    val hand: HandResultDto,
) : SchockenEvent("PLAYER_REVEALED")

class PlayerStoodEvent(
    val playerId: String,
    val hand: HandResultDto,
) : SchockenEvent("PLAYER_STOOD")

class NextPlayerEvent(
    val currentPlayerIdx: Int,
    val maxRollsThisRound: Int?,
) : SchockenEvent("NEXT_PLAYER")

class RoundEndedEvent(
    val loserIds: List<String>,
    val lidValue: Int,
    val lidStack: Int,
    val playerLids: Map<String, Int>,
    val activePlayerIds: List<String>,
) : SchockenEvent("ROUND_ENDED")

class GameOverEvent(
    val loserPlayerId: String,
) : SchockenEvent("GAME_OVER")
