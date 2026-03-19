package com.example.onemore.api.websocket.event

import com.example.onemore.api.dto.response.PlayerResponse
import com.example.onemore.domain.model.GameType
import java.time.Instant
import java.util.UUID

sealed class LobbyEvent(
    val type: String,
    val sessionCode: String,
    val timestamp: Instant = Instant.now()
)

class PlayerJoinedEvent(sessionCode: String, val player: PlayerResponse, val players: List<PlayerResponse>) :
    LobbyEvent("PLAYER_JOINED", sessionCode)

class PlayerLeftEvent(sessionCode: String, val playerId: UUID, val username: String) :
    LobbyEvent("PLAYER_LEFT", sessionCode)

class PlayerKickedEvent(sessionCode: String, val playerId: UUID, val username: String) :
    LobbyEvent("PLAYER_KICKED", sessionCode)

class HostTransferredEvent(sessionCode: String, val newHostId: UUID, val newHostUsername: String) :
    LobbyEvent("HOST_TRANSFERRED", sessionCode)

class GameSelectedEvent(sessionCode: String, val gameType: GameType) :
    LobbyEvent("GAME_SELECTED", sessionCode)

class SessionStartingEvent(sessionCode: String, val gameType: GameType, val startsInSeconds: Int = 5) :
    LobbyEvent("SESSION_STARTING", sessionCode)
