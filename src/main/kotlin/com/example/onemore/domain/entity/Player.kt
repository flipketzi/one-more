package com.example.onemore.domain.entity

import com.example.onemore.domain.model.PlayerRole
import com.example.onemore.domain.model.PlayerStatus
import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "players",
    indexes = [Index(name = "idx_players_session_id", columnList = "session_id")]
)
class Player(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "session_id", nullable = false)
    val sessionId: UUID,

    @Column(nullable = false, length = 32)
    val username: String,

    @Column(nullable = false, length = 50)
    val avatar: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: PlayerRole = PlayerRole.PLAYER,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: PlayerStatus = PlayerStatus.ACTIVE,

    @Column(name = "joined_at", nullable = false, updatable = false)
    val joinedAt: Instant = Instant.now(),

    @Column(name = "last_seen_at", nullable = false)
    var lastSeenAt: Instant = Instant.now()
)
