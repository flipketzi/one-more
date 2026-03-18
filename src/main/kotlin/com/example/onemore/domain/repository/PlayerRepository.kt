package com.example.onemore.domain.repository

import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.PlayerStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.util.UUID

interface PlayerRepository : JpaRepository<Player, UUID> {

    fun findBySessionIdAndStatusOrderByJoinedAtAsc(sessionId: UUID, status: PlayerStatus): List<Player>

    fun findBySessionId(sessionId: UUID): List<Player>

    fun existsBySessionIdAndUsernameAndStatus(sessionId: UUID, username: String, status: PlayerStatus): Boolean

    fun countBySessionIdAndStatus(sessionId: UUID, status: PlayerStatus): Long

    @Modifying
    @Query("UPDATE Player p SET p.status = :status, p.lastSeenAt = :now WHERE p.sessionId IN :sessionIds AND p.status = 'ACTIVE'")
    fun bulkUpdateStatusBySessionIds(sessionIds: List<UUID>, status: PlayerStatus, now: Instant)
}
