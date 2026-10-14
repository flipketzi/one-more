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
    // hand omitted — remains hidden until the reveal phase
) : SchockenEvent("PLAYER_STOOD")

class RevealPhaseStartedEvent(
    val orderedRevealerIds: List<String>,
    val currentRevealerId: String,
) : SchockenEvent("REVEAL_PHASE_STARTED")

class NextRevealerEvent(
    val currentRevealerId: String,
) : SchockenEvent("NEXT_REVEALER")

class NextPlayerEvent(
    val currentPlayerIdx: Int,
    val maxRollsThisRound: Int?,
    /** Non-null only at round start — carries the (possibly rotated) player order so the
     *  frontend can stay in sync after the loser-starts rotation in startNewRound. */
    val playerOrderIds: List<String>? = null,
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

/** The host returned the session to the lobby — every client leaves the game screen. */
class GameAbandonedEvent : SchockenEvent("GAME_ABANDONED")
