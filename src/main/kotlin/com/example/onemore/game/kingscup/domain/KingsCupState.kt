package com.example.onemore.game.kingscup.domain

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "kings_cup_states")
class KingsCupState(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "session_id", unique = true)
    val sessionId: UUID,

    @Column(name = "game_state_json", columnDefinition = "TEXT")
    var gameStateJson: String,

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now()
)
