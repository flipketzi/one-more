package com.example.onemore.domain.entity

import com.example.onemore.domain.model.GameType
import com.example.onemore.domain.model.SessionStatus
import jakarta.persistence.*
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "game_sessions")
class GameSession(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "session_code", length = 5, nullable = false, unique = true)
    val sessionCode: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: SessionStatus = SessionStatus.WAITING,

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type")
    var gameType: GameType? = null,

    @Column(name = "host_id", nullable = false)
    var hostId: UUID,

    @Column(name = "max_players", nullable = false)
    val maxPlayers: Int = 12,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant = Instant.now().plus(Duration.ofHours(4))
)
