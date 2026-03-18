package com.example.onemore.service

import com.example.onemore.api.dto.response.CreateSessionResponse
import com.example.onemore.api.dto.response.JoinSessionResponse
import com.example.onemore.api.dto.response.PlayerResponse
import com.example.onemore.api.dto.response.SessionInfoResponse
import com.example.onemore.api.websocket.LobbyEventPublisher
import com.example.onemore.api.websocket.event.HostTransferredEvent
import com.example.onemore.api.websocket.event.PlayerJoinedEvent
import com.example.onemore.api.websocket.event.PlayerLeftEvent
import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.PlayerRole
import com.example.onemore.domain.model.PlayerStatus
import com.example.onemore.domain.model.SessionStatus
import com.example.onemore.domain.repository.GameSessionRepository
import com.example.onemore.domain.repository.PlayerRepository
import com.example.onemore.exception.DuplicateUsernameException
import com.example.onemore.exception.SessionFullException
import com.example.onemore.exception.SessionNotOpenException
import com.example.onemore.exception.SessionNotFoundException
import com.example.onemore.security.PlayerContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class SessionService(
    private val sessionRepository: GameSessionRepository,
    private val playerRepository: PlayerRepository,
    private val sessionCodeGenerator: SessionCodeGenerator,
    private val tokenService: TokenService,
    private val lobbyEventPublisher: LobbyEventPublisher,
    @Value("\${app.session.max-players:12}") private val maxPlayers: Int
) {

    @Transactional
    fun createSession(username: String, avatar: String): CreateSessionResponse {
        val code = sessionCodeGenerator.generate()

        // Create a placeholder host ID — we need the session to reference the player
        val hostId = UUID.randomUUID()

        val session = GameSession(
            sessionCode = code,
            hostId = hostId,
            maxPlayers = maxPlayers
        )
        sessionRepository.save(session)

        val player = Player(
            id = hostId,
            sessionId = session.id,
            username = username.trim(),
            avatar = avatar,
            role = PlayerRole.HOST
        )
        playerRepository.save(player)

        val token = tokenService.mintToken(player, session)

        return CreateSessionResponse(
            sessionCode = code,
            sessionId = session.id,
            token = token,
            player = PlayerResponse.from(player)
        )
    }

    @Transactional
    fun joinSession(code: String, username: String, avatar: String): JoinSessionResponse {
        val normalizedCode = code.uppercase()
        val session = sessionRepository.findBySessionCode(normalizedCode)
            ?: throw SessionNotFoundException(normalizedCode)

        if (session.status != SessionStatus.WAITING) {
            throw SessionNotOpenException(normalizedCode)
        }

        val activeCount = playerRepository.countBySessionIdAndStatus(session.id, PlayerStatus.ACTIVE)
        if (activeCount >= session.maxPlayers) {
            throw SessionFullException()
        }

        val trimmedUsername = username.trim()
        if (playerRepository.existsBySessionIdAndUsernameAndStatus(session.id, trimmedUsername, PlayerStatus.ACTIVE)) {
            throw DuplicateUsernameException(trimmedUsername)
        }

        val player = Player(
            sessionId = session.id,
            username = trimmedUsername,
            avatar = avatar,
            role = PlayerRole.PLAYER
        )
        playerRepository.save(player)

        val token = tokenService.mintToken(player, session)

        val allPlayers = playerRepository.findBySessionId(session.id)
            .filter { it.status == PlayerStatus.ACTIVE }
            .map { PlayerResponse.from(it) }

        lobbyEventPublisher.publish(PlayerJoinedEvent(session.sessionCode, PlayerResponse.from(player)))

        return JoinSessionResponse(
            sessionId = session.id,
            token = token,
            player = PlayerResponse.from(player),
            session = SessionInfoResponse.from(session, allPlayers)
        )
    }

    @Transactional
    fun leaveSession(context: PlayerContext) {
        val session = sessionRepository.findById(context.sessionId).orElse(null) ?: return
        val player = playerRepository.findById(context.playerId).orElse(null) ?: return

        if (player.status != PlayerStatus.ACTIVE) return

        player.status = PlayerStatus.LEFT
        player.lastSeenAt = Instant.now()
        playerRepository.save(player)

        lobbyEventPublisher.publish(PlayerLeftEvent(session.sessionCode, player.id, player.username))

        val remaining = playerRepository.findBySessionIdAndStatusOrderByJoinedAtAsc(session.id, PlayerStatus.ACTIVE)

        if (remaining.isEmpty()) {
            session.status = SessionStatus.CANCELLED
            session.updatedAt = Instant.now()
            sessionRepository.save(session)
            return
        }

        if (session.hostId == player.id) {
            transferHost(session, remaining)
        }
    }

    @Transactional(readOnly = true)
    fun getSessionInfo(context: PlayerContext, code: String): SessionInfoResponse {
        val normalizedCode = code.uppercase()
        val session = sessionRepository.findBySessionCode(normalizedCode)
            ?: throw SessionNotFoundException(normalizedCode)

        // Verify the authenticated player belongs to this session
        if (session.id != context.sessionId) {
            throw com.example.onemore.exception.ForbiddenException("You are not a member of this session")
        }

        val players = playerRepository.findBySessionId(session.id)
            .filter { it.status == PlayerStatus.ACTIVE }
            .map { PlayerResponse.from(it) }

        return SessionInfoResponse.from(session, players)
    }

    fun transferHost(session: GameSession, activePlayers: List<Player>) {
        val newHost = activePlayers.first()
        newHost.role = PlayerRole.HOST
        playerRepository.save(newHost)

        session.hostId = newHost.id
        session.updatedAt = Instant.now()
        sessionRepository.save(session)

        lobbyEventPublisher.publish(HostTransferredEvent(session.sessionCode, newHost.id, newHost.username))
    }
}
