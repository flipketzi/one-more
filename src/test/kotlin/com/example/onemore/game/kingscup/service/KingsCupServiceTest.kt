package com.example.onemore.game.kingscup.service

import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.PlayerRole
import com.example.onemore.domain.repository.GameSessionRepository
import com.example.onemore.domain.repository.PlayerRepository
import com.example.onemore.game.kingscup.domain.KingsCupState
import com.example.onemore.game.kingscup.domain.KingsCupStateRepository
import com.example.onemore.game.kingscup.domain.model.GamePhase
import com.example.onemore.game.kingscup.domain.model.KingsCupGameState
import com.example.onemore.game.kingscup.websocket.GameEventPublisher
import com.example.onemore.security.PlayerContext
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.Mockito.lenient
import org.mockito.junit.jupiter.MockitoExtension
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class KingsCupServiceTest {

    @Mock private lateinit var stateRepository: KingsCupStateRepository
    @Mock private lateinit var sessionRepository: GameSessionRepository
    @Mock private lateinit var playerRepository: PlayerRepository
    @Mock private lateinit var publisher: GameEventPublisher

    private lateinit var service: KingsCupService

    private val mapper = jacksonObjectMapper().apply { findAndRegisterModules() }
    private val session = GameSession(sessionCode = "TCODE", hostId = UUID.randomUUID())
    private val anna = makePlayer("Anna")
    private val ben = makePlayer("Ben")
    private val cleo = makePlayer("Cleo")
    private val players = listOf(anna, ben, cleo)
    private lateinit var entity: KingsCupState

    @BeforeEach
    fun setup() {
        service = KingsCupService(stateRepository, sessionRepository, playerRepository, publisher)
        // Stands in for the Spring self-proxy used by the race scheduler
        KingsCupService::class.java.getDeclaredField("self").apply { isAccessible = true }.set(service, service)

        lenient().`when`(sessionRepository.findBySessionCode(session.sessionCode)).thenReturn(session)
        lenient().`when`(playerRepository.findBySessionId(session.id)).thenReturn(players)
        lenient().`when`(stateRepository.findBySessionIdForUpdate(session.id)).thenAnswer { entity }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun makePlayer(username: String) = Player(
        sessionId = session.id,
        username = username,
        avatar = "avatar_beer",
    )

    private fun ctx(player: Player) = PlayerContext(player.id, session.id, PlayerRole.PLAYER, player.username)

    private fun givenState(deck: List<String>, configure: KingsCupGameState.() -> Unit = {}) {
        val state = KingsCupGameState(deck = deck.toMutableList(), turnOrder = players.map { it.id.toString() })
        state.configure()
        entity = KingsCupState(sessionId = session.id, gameStateJson = mapper.writeValueAsString(state))
    }

    private fun currentState(): KingsCupGameState = mapper.readValue(entity.gameStateJson)

    private fun touchAll(vararg touchers: Player) {
        val raceId = currentState().touchRace!!.raceId
        touchers.forEach { service.registerTouch(ctx(it), session.sessionCode, raceId) }
    }

    // ── Touch race ────────────────────────────────────────────────────────────

    @Test
    fun `card four race advances the turn once everyone touched`() {
        givenState(deck = listOf("4H", "2C"))

        service.drawCard(ctx(anna), session.sessionCode)
        touchAll(anna, ben, cleo)

        val state = currentState()
        assertEquals(GamePhase.WAITING_TO_DRAW, state.phase)
        assertEquals(1, state.currentTurnIndex)
    }

    @Test
    fun `thumb queen race keeps the current drawer`() {
        givenState(deck = listOf("2C", "3C")) {
            thumbQueenId = ben.id.toString()
            thumbQueenUsesLeft = 3
        }

        service.activateQueenButton(ctx(ben), session.sessionCode)
        touchAll(anna, cleo)

        val state = currentState()
        assertEquals(GamePhase.WAITING_TO_DRAW, state.phase)
        assertEquals(0, state.currentTurnIndex)
        assertDoesNotThrow { service.drawCard(ctx(anna), session.sessionCode) }
    }

    // ── Drinking buddies ──────────────────────────────────────────────────────

    @Test
    fun `picking a buddy dissolves both players' previous pairs`() {
        val dave = makePlayer("Dave")
        lenient().`when`(playerRepository.findBySessionId(session.id)).thenReturn(players + dave)
        givenState(deck = listOf("8H", "2C")) {
            drinkingBuddies[ben.id.toString()] = cleo.id.toString()
            drinkingBuddies[cleo.id.toString()] = ben.id.toString()
            drinkingBuddies[anna.id.toString()] = dave.id.toString()
            drinkingBuddies[dave.id.toString()] = anna.id.toString()
        }

        service.drawCard(ctx(anna), session.sessionCode)
        service.pickTarget(ctx(anna), session.sessionCode, ben.id.toString())

        val expected = mapOf(anna.id.toString() to ben.id.toString(), ben.id.toString() to anna.id.toString())
        assertEquals(expected, currentState().drinkingBuddies)
    }

    // ── Kings ─────────────────────────────────────────────────────────────────

    @Test
    fun `confirming the fourth king ends the game`() {
        givenState(deck = listOf("KH", "2C")) { kingsDrawn = 3 }

        service.drawCard(ctx(anna), session.sessionCode)
        assertEquals(GamePhase.EXECUTING_DISPLAY, currentState().phase)

        service.advanceTurn(ctx(anna), session.sessionCode)
        assertEquals(GamePhase.GAME_OVER, currentState().phase)
    }

    @Test
    fun `confirming an earlier king passes the turn on`() {
        givenState(deck = listOf("KH", "2C")) { kingsDrawn = 2 }

        service.drawCard(ctx(anna), session.sessionCode)
        service.advanceTurn(ctx(anna), session.sessionCode)

        val state = currentState()
        assertEquals(GamePhase.WAITING_TO_DRAW, state.phase)
        assertEquals(1, state.currentTurnIndex)
        assertEquals(listOf("KH"), state.kingsCupContents)
    }
}
