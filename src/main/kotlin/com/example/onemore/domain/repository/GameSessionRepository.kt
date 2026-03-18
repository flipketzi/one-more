package com.example.onemore.domain.repository

import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.model.SessionStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.util.UUID

interface GameSessionRepository : JpaRepository<GameSession, UUID> {

    fun findBySessionCode(code: String): GameSession?

    fun findByExpiresAtBeforeAndStatusNot(expiresAt: Instant, status: SessionStatus): List<GameSession>

    @Modifying
    @Query("UPDATE GameSession s SET s.status = :status, s.updatedAt = :now WHERE s.id IN :ids")
    fun bulkUpdateStatus(ids: List<UUID>, status: SessionStatus, now: Instant)
}
