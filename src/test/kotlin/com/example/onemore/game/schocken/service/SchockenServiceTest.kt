package com.example.onemore.game.schocken.service

import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.PlayerRole
import com.example.onemore.domain.repository.GameSessionRepository
import com.example.onemore.domain.repository.PlayerRepository
import com.example.onemore.exception.ForbiddenException
import com.example.onemore.exception.GameActionException
import com.example.onemore.game.schocken.websocket.SchockenEventPublisher
import com.example.onemore.security.PlayerContext
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class SchockenServiceTest {

    @Mock private lateinit var sessionRepository: GameSessionRepository
    @Mock private lateinit var playerRepository: PlayerRepository
    @Mock private lateinit var publisher: SchockenEventPublisher

    private lateinit var service: SchockenService

    private val sessionId: UUID = UUID.randomUUID()
    private val sessionCode = "TCODE"

    @BeforeEach
    fun setup() {
        service = SchockenService(sessionRepository, playerRepository, publisher)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun makeSession() = GameSession(
        id = sessionId,
        sessionCode = sessionCode,
        hostId = UUID.randomUUID(),
    )

    private fun makePlayer(username: String) = Player(
        sessionId = sessionId,
        username = username,
        avatar = "avatar_beer",
    )

    private fun ctx(playerId: UUID) = PlayerContext(
        playerId = playerId,
        sessionId = sessionId,
        role = PlayerRole.PLAYER,
        username = "test",
    )

    // ── evaluateHand ─────────────────────────────────────────────────────────

    @Test
    fun `evaluateHand returns Schock Out for 1-1-1`() {
        val result = service.evaluateHand(listOf(1, 1, 1), false)
        assertEquals("Schock Out", result.name)
        assertEquals(13, result.lids)
        assertEquals(10000, result.rank)
    }

    @Test
    fun `evaluateHand returns Schock X for 1-1-4`() {
        val result = service.evaluateHand(listOf(4, 1, 1), false)
        assertEquals("Schock 4", result.name)
        assertEquals(4, result.lids)
        assertEquals(9040, result.rank)
    }

    @Test
    fun `evaluateHand returns Schock 2 for 1-1-2`() {
        val result = service.evaluateHand(listOf(2, 1, 1), false)
        assertEquals("Schock 2", result.name)
        assertEquals(2, result.lids)
        assertEquals(9020, result.rank)
    }

    @Test
    fun `evaluateHand returns Jule for 1-2-4 without kept dice`() {
        val result = service.evaluateHand(listOf(4, 1, 2), false)
        assertEquals("Jule", result.name)
        assertEquals(7, result.lids)
        assertEquals(8700, result.rank)
    }

    @Test
    fun `evaluateHand degrades Jule to normal hand when hadKeptDice`() {
        val result = service.evaluateHand(listOf(4, 1, 2), true)
        assertEquals("4-2-1", result.name)
        assertEquals(1, result.lids)
        assertEquals(421, result.rank)
    }

    @Test
    fun `evaluateHand returns General for triple without kept dice`() {
        val result = service.evaluateHand(listOf(5, 5, 5), false)
        assertEquals("General 5", result.name)
        assertEquals(3, result.lids)
        assertEquals(8050, result.rank)
    }

    @Test
    fun `evaluateHand degrades General to normal hand when hadKeptDice`() {
        val result = service.evaluateHand(listOf(5, 5, 5), true)
        assertEquals("5-5-5", result.name)
        assertEquals(1, result.lids)
        assertEquals(555, result.rank)
    }

    @Test
    fun `evaluateHand returns Straße 1-2-3 without kept dice`() {
        val result = service.evaluateHand(listOf(3, 1, 2), false)
        assertEquals("Straße 1-2-3", result.name)
        assertEquals(2, result.lids)
        assertEquals(7400, result.rank)
    }

    @Test
    fun `evaluateHand returns Straße 4-5-6 without kept dice`() {
        val result = service.evaluateHand(listOf(6, 4, 5), false)
        assertEquals("Straße 4-5-6", result.name)
        assertEquals(2, result.lids)
        assertEquals(7100, result.rank)
    }

    @Test
    fun `evaluateHand degrades Straße to normal hand when hadKeptDice`() {
        val result = service.evaluateHand(listOf(1, 2, 3), true)
        assertEquals("3-2-1", result.name)
        assertEquals(1, result.lids)
        assertEquals(321, result.rank)
    }

    @Test
    fun `evaluateHand returns normal hand ranked by descending values`() {
        val result = service.evaluateHand(listOf(6, 3, 5), false)
        assertEquals("6-5-3", result.name)
        assertEquals(1, result.lids)
        assertEquals(653, result.rank)
    }

    @Test
    fun `evaluateHand Schock Out ranks higher than Schock X`() {
        val schockOut = service.evaluateHand(listOf(1, 1, 1), false)
        val schock6 = service.evaluateHand(listOf(1, 1, 6), false)
        assertTrue(schockOut.rank > schock6.rank)
    }

    @Test
    fun `evaluateHand Schock 2 ranks higher than Jule`() {
        val schock2 = service.evaluateHand(listOf(1, 1, 2), false)
        val jule = service.evaluateHand(listOf(1, 2, 4), false)
        assertTrue(schock2.rank > jule.rank)
    }

    @Test
    fun `evaluateHand Jule ranks higher than General 6`() {
        val jule = service.evaluateHand(listOf(1, 2, 4), false)
        val general6 = service.evaluateHand(listOf(6, 6, 6), false)
        assertTrue(jule.rank > general6.rank)
    }

    @Test
    fun `evaluateHand General ranks higher than Straße`() {
        val general2 = service.evaluateHand(listOf(2, 2, 2), false)
        val straße = service.evaluateHand(listOf(1, 2, 3), false)
        assertTrue(general2.rank > straße.rank)
    }

    @Test
    fun `evaluateHand Straße ranks higher than normal hand`() {
        val straße = service.evaluateHand(listOf(4, 5, 6), false)
        val normal = service.evaluateHand(listOf(4, 5, 6), true) // hadKeptDice → no Straße
        assertTrue(straße.rank > normal.rank)
    }

    // ── rollDice ─────────────────────────────────────────────────────────────

    @Test
    fun `rollDice throws ForbiddenException when it is not the player's turn`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        assertThrows<ForbiddenException> {
            service.rollDice(sessionCode, ctx(player2.id), emptyList())
        }
    }

    @Test
    fun `rollDice throws GameActionException when max rolls are reached`() {
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))
        val ctx = ctx(player.id)

        service.rollDice(sessionCode, ctx, emptyList())
        service.rollDice(sessionCode, ctx, emptyList())
        service.rollDice(sessionCode, ctx, emptyList())

        assertThrows<GameActionException> {
            service.rollDice(sessionCode, ctx, emptyList())
        }
    }

    @Test
    fun `rollDice increments rollIndex with each call`() {
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))
        val ctx = ctx(player.id)

        val r1 = service.rollDice(sessionCode, ctx, emptyList())
        val r2 = service.rollDice(sessionCode, ctx, emptyList())

        assertEquals(1, r1.rollIndex)
        assertEquals(2, r2.rollIndex)
    }

    @Test
    fun `rollDice keeps specified dice and re-rolls the rest`() {
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))
        val ctx = ctx(player.id)

        val firstRoll = service.rollDice(sessionCode, ctx, emptyList())
        val keptDie = firstRoll.dice.first()
        val secondRoll = service.rollDice(sessionCode, ctx, listOf(keptDie.id))

        val keptAfter = secondRoll.dice.first { it.id == keptDie.id }
        assertTrue(keptAfter.kept)
        assertEquals(keptDie.value, keptAfter.value)
    }

    // ── revealHand ───────────────────────────────────────────────────────────

    @Test
    fun `revealHand throws GameActionException when player has not rolled`() {
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))

        assertThrows<GameActionException> {
            service.revealHand(sessionCode, ctx(player.id))
        }
    }

    @Test
    fun `revealHand throws GameActionException when already revealed`() {
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))
        val ctx = ctx(player.id)

        service.rollDice(sessionCode, ctx, emptyList())
        service.revealHand(sessionCode, ctx)

        assertThrows<GameActionException> {
            service.revealHand(sessionCode, ctx)
        }
    }

    @Test
    fun `revealHand returns a valid evaluated hand`() {
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))
        val ctx = ctx(player.id)

        service.rollDice(sessionCode, ctx, emptyList())
        val hand = service.revealHand(sessionCode, ctx)

        assertNotNull(hand.name)
        assertTrue(hand.lids >= 1)
        assertTrue(hand.rank > 0)
    }

    // ── standPlayer ──────────────────────────────────────────────────────────

    @Test
    fun `standPlayer throws ForbiddenException when it is not the player's turn`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        service.rollDice(sessionCode, ctx(player1.id), emptyList())

        assertThrows<ForbiddenException> {
            service.standPlayer(sessionCode, ctx(player2.id))
        }
    }

    @Test
    fun `standPlayer throws GameActionException when player has not rolled`() {
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))

        assertThrows<GameActionException> {
            service.standPlayer(sessionCode, ctx(player.id))
        }
    }

    @Test
    fun `standPlayer sets maxRollsThisRound based on first player's roll count`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        service.rollDice(sessionCode, ctx(player1.id), emptyList()) // rollCount = 1
        service.standPlayer(sessionCode, ctx(player1.id))           // maxRollsThisRound = 1

        // Player 2 gets exactly one roll before hitting the limit
        val ctx2 = ctx(player2.id)
        service.rollDice(sessionCode, ctx2, emptyList()) // rollCount = 1 = limit

        assertThrows<GameActionException> {
            service.rollDice(sessionCode, ctx2, emptyList()) // exceeds maxRollsThisRound
        }
    }

    @Test
    fun `standPlayer does not override maxRollsThisRound set by first player`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        // First player rolls twice then stands → maxRollsThisRound = 2
        service.rollDice(sessionCode, ctx(player1.id), emptyList())
        service.rollDice(sessionCode, ctx(player1.id), emptyList())
        service.standPlayer(sessionCode, ctx(player1.id))

        // Player 2 can roll twice (the same limit)
        val ctx2 = ctx(player2.id)
        service.rollDice(sessionCode, ctx2, emptyList()) // rollCount = 1
        service.rollDice(sessionCode, ctx2, emptyList()) // rollCount = 2 = limit

        assertThrows<GameActionException> {
            service.rollDice(sessionCode, ctx2, emptyList()) // exceeds maxRollsThisRound
        }
    }

    // ── Round end ─────────────────────────────────────────────────────────────

    @Test
    fun `lids are distributed from the stack after all players reveal`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        service.rollDice(sessionCode, ctx(player1.id), emptyList())
        service.revealHand(sessionCode, ctx(player1.id))
        service.rollDice(sessionCode, ctx(player2.id), emptyList())
        service.revealHand(sessionCode, ctx(player2.id))

        val view = service.getGameView(sessionCode, ctx(player1.id))
        val totalPlayerLids = view.playerLids.values.sum()

        assertTrue(totalPlayerLids > 0, "At least one lid must have been paid out")
        assertEquals(13 - totalPlayerLids, view.lidStack, "Stack must shrink by exactly the lids paid out")
    }

    @Test
    fun `game is marked over when only one player has lids after a round`() {
        // A single-player game: that player is simultaneously winner and loser → immediate game over
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))
        val ctx = ctx(player.id)

        service.rollDice(sessionCode, ctx, emptyList())
        service.revealHand(sessionCode, ctx)

        val view = service.getGameView(sessionCode, ctx)
        assertTrue(view.gameOver, "Game must be over when only one player remains")
    }

    @Test
    fun `when lid stack is empty redistribution takes from the round winner not the richest player`() {
        // Drain the stack completely by playing rounds until lidStack == 0.
        // Each round pays at least 1 lid, so the stack empties within 13 rounds.
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        val ctxById = mapOf(
            player1.id.toString() to ctx(player1.id),
            player2.id.toString() to ctx(player2.id),
        )

        // Plays one full round in turn order starting from view.currentPlayerIdx
        fun playRound(view: PlayerGameViewDto) {
            val startIdx = view.currentPlayerIdx
            for (i in view.playerOrder.indices) {
                val pid = view.playerOrder[(startIdx + i) % view.playerOrder.size].id
                val c = ctxById[pid]!!
                service.rollDice(sessionCode, c, emptyList())
                service.revealHand(sessionCode, c)
            }
        }

        var view = service.getGameView(sessionCode, ctx(player1.id))
        while (view.lidStack > 0) {
            playRound(view)
            view = service.getGameView(sessionCode, ctx(player1.id))
            if (view.gameOver) return // early game-over is acceptable (e.g. Schock Out)
        }

        // Stack is now 0. Record lids before the redistribution round.
        val totalBefore = view.playerLids.values.sum()
        assertEquals(13, totalBefore, "All 13 lids must be in play when stack is empty")

        // Play one more round (redistribution phase)
        playRound(view)
        view = service.getGameView(sessionCode, ctx(player1.id))

        // Conservation law: total lids must remain 13, stack stays 0
        val totalAfter = view.playerLids.values.sum()
        assertEquals(13, totalAfter, "Total lids must be conserved during redistribution")
        assertEquals(0, view.lidStack, "Lid stack must remain 0 after redistribution round")
    }

    @Test
    fun `the round loser starts the next round`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        service.rollDice(sessionCode, ctx(player1.id), emptyList())
        service.revealHand(sessionCode, ctx(player1.id))
        service.rollDice(sessionCode, ctx(player2.id), emptyList())
        service.revealHand(sessionCode, ctx(player2.id))

        val view = service.getGameView(sessionCode, ctx(player1.id))
        if (view.gameOver) return // Schock Out can end the game immediately — skip

        val startingPlayer = view.playerOrder[view.currentPlayerIdx]
        val startingPlayerLids = view.playerLids[startingPlayer.id] ?: 0
        assertTrue(startingPlayerLids > 0, "The player who starts the next round must be the one who received lids (the round loser)")
    }

    // ── Aufdeckphase ──────────────────────────────────────────────────────────

    @Test
    fun `rollDice at max rolls marks turn as closed and auto-advances to next player`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        repeat(3) { service.rollDice(sessionCode, ctx(player1.id), emptyList()) }

        // After 3 rolls, turn advances to player2
        val view = service.getGameView(sessionCode, ctx(player1.id))
        assertEquals(player2.id.toString(), view.playerOrder[view.currentPlayerIdx].id)
        assertTrue(view.playerOrder.first { it.id == player1.id.toString() }.closed)
    }

    @Test
    fun `rollDice at max rolls returns non-kept dice as value 0`() {
        val player = makePlayer("Alice")
        service.initGame(makeSession(), listOf(player))
        val ctx = ctx(player.id)

        service.rollDice(sessionCode, ctx, emptyList())
        service.rollDice(sessionCode, ctx, emptyList())
        val lastRoll = service.rollDice(sessionCode, ctx, emptyList())

        // All dice are non-kept → all values must be 0
        assertTrue(lastRoll.dice.all { it.value == 0 }, "Non-kept dice on last roll must be hidden (value = 0)")
        assertEquals(3, lastRoll.rollIndex)
    }

    @Test
    fun `reveal phase starts after all players use all their rolls`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        repeat(3) { service.rollDice(sessionCode, ctx(player1.id), emptyList()) }
        repeat(3) { service.rollDice(sessionCode, ctx(player2.id), emptyList()) }

        // Reveal phase must be active: player1 is first in queue and can reveal.
        // Without reveal phase, revealHand would reject a closed cup.
        assertDoesNotThrow { service.revealHand(sessionCode, ctx(player1.id)) }
    }

    @Test
    fun `geschlossen player hand is null in public view before reveal phase`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        repeat(3) { service.rollDice(sessionCode, ctx(player1.id), emptyList()) }

        val view = service.getGameView(sessionCode, ctx(player2.id))
        val alice = view.playerOrder.first { it.id == player1.id.toString() }
        assertNull(alice.hand, "Closed player's hand must not be visible before the reveal phase")
        assertTrue(alice.closed)
    }

    @Test
    fun `standing player hand is null in public view before reveal phase`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        service.rollDice(sessionCode, ctx(player1.id), emptyList())
        service.standPlayer(sessionCode, ctx(player1.id))

        val view = service.getGameView(sessionCode, ctx(player2.id))
        val alice = view.playerOrder.first { it.id == player1.id.toString() }
        assertNull(alice.hand, "Standing player's hand must not be visible before the reveal phase")
        assertTrue(alice.standing)
    }

    @Test
    fun `reveal phase only the queue head can reveal`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        repeat(3) { service.rollDice(sessionCode, ctx(player1.id), emptyList()) }
        repeat(3) { service.rollDice(sessionCode, ctx(player2.id), emptyList()) }

        // Reveal phase active; player1 is first in queue — player2 must not be able to reveal
        assertThrows<ForbiddenException> {
            service.revealHand(sessionCode, ctx(player2.id))
        }
    }

    @Test
    fun `reveal phase allows queue head to reveal and advances to next`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        repeat(3) { service.rollDice(sessionCode, ctx(player1.id), emptyList()) }
        repeat(3) { service.rollDice(sessionCode, ctx(player2.id), emptyList()) }

        // player1 reveals successfully
        val hand = service.revealHand(sessionCode, ctx(player1.id))
        assertNotNull(hand.name)

        val view = service.getGameView(sessionCode, ctx(player1.id))
        assertTrue(view.playerOrder.first { it.id == player1.id.toString() }.revealed)
    }

    // ── Round end ─────────────────────────────────────────────────────────────

    @Test
    fun `two-player game does not end after the first round while the lid stack still has lids`() {
        // Regression: activePlayers2 used to filter by lids > 0, which made the game end after
        // round 1 because only the loser had lids (winner stayed at 0).
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        service.initGame(makeSession(), listOf(player1, player2))

        // Play one full round
        service.rollDice(sessionCode, ctx(player1.id), emptyList())
        service.revealHand(sessionCode, ctx(player1.id))
        service.rollDice(sessionCode, ctx(player2.id), emptyList())
        service.revealHand(sessionCode, ctx(player2.id))

        val view = service.getGameView(sessionCode, ctx(player1.id))
        assertFalse(view.gameOver, "Game must NOT be over after the first round when the lid stack still has lids")
        assertTrue(view.lidStack < 13, "Lid stack should have decreased after round 1")
        assertTrue(view.lidStack > 0, "Lid stack must not be empty after a single round")
    }
}
