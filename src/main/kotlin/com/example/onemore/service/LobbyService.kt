package com.example.onemore.service

import com.example.onemore.api.websocket.LobbyEventPublisher
import com.example.onemore.api.websocket.event.GameSelectedEvent
import com.example.onemore.api.websocket.event.PlayerKickedEvent
import com.example.onemore.api.websocket.event.SessionStartingEvent
import com.example.onemore.game.kingscup.websocket.GameEventPublisher
import com.example.onemore.game.kingscup.websocket.event.GameAbandonedEvent
import com.example.onemore.domain.model.GameType
import com.example.onemore.domain.model.PlayerStatus
import com.example.onemore.domain.model.SessionStatus
import com.example.onemore.domain.repository.GameSessionRepository
import com.example.onemore.domain.repository.PlayerRepository
import com.example.onemore.exception.ForbiddenException
import com.example.onemore.exception.PlayerNotFoundException
import com.example.onemore.exception.SessionNotFoundException
import com.example.onemore.game.kingscup.service.KingsCupService
import com.example.onemore.security.PlayerContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.time.Instant
import java.util.UUID

@Service
class LobbyService(
    private val sessionRepository: GameSessionRepository,
    private val playerRepository: PlayerRepository,
    private val lobbyEventPublisher: LobbyEventPublisher,
    private val kingsCupService: KingsCupService,
    private val gameEventPublisher: GameEventPublisher
) {

    @Transactional
    fun selectGame(context: PlayerContext, code: String, gameType: GameType) {
        val session = sessionRepository.findBySessionCode(code.uppercase())
            ?: throw SessionNotFoundException(code)

        requireHost(context, session.hostId, session.sessionCode)

        session.gameType = gameType
        session.updatedAt = Instant.now()
        sessionRepository.save(session)

        lobbyEventPublisher.publish(GameSelectedEvent(session.sessionCode, gameType))
    }

    @Transactional
    fun kickPlayer(context: PlayerContext, code: String, targetPlayerId: UUID) {
        val session = sessionRepository.findBySessionCode(code.uppercase())
            ?: throw SessionNotFoundException(code)

        requireHost(context, session.hostId, session.sessionCode)

        if (targetPlayerId == context.playerId) {
            throw ForbiddenException("Host cannot kick themselves — use leave instead")
        }

        val target = playerRepository.findById(targetPlayerId).orElse(null)
            ?: throw PlayerNotFoundException(targetPlayerId.toString())

        if (target.sessionId != session.id || target.status != PlayerStatus.ACTIVE) {
            throw PlayerNotFoundException(targetPlayerId.toString())
        }

        target.status = PlayerStatus.KICKED
        target.lastSeenAt = Instant.now()
        playerRepository.save(target)

        lobbyEventPublisher.publish(PlayerKickedEvent(session.sessionCode, target.id, target.username))
    }

    @Transactional
    fun startGame(context: PlayerContext, code: String) {
        val session = sessionRepository.findBySessionCode(code.uppercase())
            ?: throw SessionNotFoundException(code)

        requireHost(context, session.hostId, session.sessionCode)

        if (session.status != SessionStatus.WAITING) {
            throw ForbiddenException("Session is not in a state that can be started")
        }
        if (session.gameType == null) {
            throw ForbiddenException("A game must be selected before starting")
        }

        session.status = SessionStatus.STARTING
        session.updatedAt = Instant.now()
        sessionRepository.save(session)

        if (session.gameType == GameType.KINGS_CUP) {
            val players = playerRepository.findBySessionIdAndStatusOrderByJoinedAtAsc(
                session.id, PlayerStatus.ACTIVE
            )
            kingsCupService.initializeGame(session, players)
        }

        val sessionCode = session.sessionCode
        val gameType = session.gameType!!
        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCommit() {
                lobbyEventPublisher.publish(SessionStartingEvent(sessionCode, gameType))
            }
        })
    }

    @Transactional
    fun returnToLobby(context: PlayerContext, code: String) {
        val session = sessionRepository.findBySessionCode(code.uppercase())
            ?: throw SessionNotFoundException(code)

        requireHost(context, session.hostId, session.sessionCode)

        if (session.status != SessionStatus.IN_GAME) {
            throw ForbiddenException("Session is not currently in a game")
        }

        session.status = SessionStatus.WAITING
        session.gameType = null
        session.updatedAt = Instant.now()
        sessionRepository.save(session)

        kingsCupService.abandonGame(session.id)

        val sessionCode = session.sessionCode
        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCommit() {
                gameEventPublisher.publish(GameAbandonedEvent(sessionCode))
            }
        })
    }

    private fun requireHost(context: PlayerContext, hostId: UUID, sessionCode: String) {
        // Double-check: JWT role claim AND current DB hostId must match
        if (context.playerId != hostId) {
            throw ForbiddenException("Only the host can perform this action in session '$sessionCode'")
        }
    }
}
