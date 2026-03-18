package com.example.onemore.api.dto.response

import java.util.UUID

data class JoinSessionResponse(
    val sessionId: UUID,
    val token: String,
    val player: PlayerResponse,
    val session: SessionInfoResponse
)
