package com.example.onemore.security

import com.example.onemore.domain.model.PlayerRole
import java.util.UUID

data class PlayerContext(
    val playerId: UUID,
    val sessionId: UUID,
    val role: PlayerRole,
    val username: String
)
