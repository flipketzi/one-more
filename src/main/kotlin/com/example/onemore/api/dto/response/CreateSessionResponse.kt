package com.example.onemore.api.dto.response

import java.util.UUID

data class CreateSessionResponse(
    val sessionCode: String,
    val sessionId: UUID,
    val token: String,
    val player: PlayerResponse
)
