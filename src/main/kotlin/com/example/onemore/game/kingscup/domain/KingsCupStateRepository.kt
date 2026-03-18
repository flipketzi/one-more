package com.example.onemore.game.kingscup.domain

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface KingsCupStateRepository : JpaRepository<KingsCupState, UUID> {

    fun findBySessionId(sessionId: UUID): KingsCupState?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT k FROM KingsCupState k WHERE k.sessionId = :sessionId")
    fun findBySessionIdForUpdate(sessionId: UUID): KingsCupState?
}
