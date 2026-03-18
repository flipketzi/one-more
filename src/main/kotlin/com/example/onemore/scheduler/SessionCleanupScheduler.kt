package com.example.onemore.scheduler

import com.example.onemore.domain.model.PlayerStatus
import com.example.onemore.domain.model.SessionStatus
import com.example.onemore.domain.repository.GameSessionRepository
import com.example.onemore.domain.repository.PlayerRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Component
class SessionCleanupScheduler(
    private val sessionRepository: GameSessionRepository,
    private val playerRepository: PlayerRepository
) {

    private val log = LoggerFactory.getLogger(SessionCleanupScheduler::class.java)

    @Scheduled(fixedDelay = 300_000) // every 5 minutes
    @Transactional
    fun cleanupExpiredSessions() {
        val expiredSessions = sessionRepository.findByExpiresAtBeforeAndStatusNot(
            Instant.now(),
            SessionStatus.CANCELLED
        )

        if (expiredSessions.isEmpty()) return

        log.info("Cleaning up {} expired sessions", expiredSessions.size)

        val sessionIds = expiredSessions.map { it.id }

        playerRepository.bulkUpdateStatusBySessionIds(sessionIds, PlayerStatus.LEFT, Instant.now())
        sessionRepository.bulkUpdateStatus(sessionIds, SessionStatus.CANCELLED, Instant.now())
    }
}
