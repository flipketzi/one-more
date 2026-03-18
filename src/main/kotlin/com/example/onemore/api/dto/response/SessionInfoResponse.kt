package com.example.onemore.api.dto.response

import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.model.GameType
import com.example.onemore.domain.model.SessionStatus
import java.util.UUID

data class SessionInfoResponse(
    val code: String,
    val status: SessionStatus,
    val gameType: GameType?,
    val hostId: UUID,
    val players: List<PlayerResponse>
) {
    companion object {
        fun from(session: GameSession, players: List<PlayerResponse>) = SessionInfoResponse(
            code = session.sessionCode,
            status = session.status,
            gameType = session.gameType,
            hostId = session.hostId,
            players = players
        )
    }
}
