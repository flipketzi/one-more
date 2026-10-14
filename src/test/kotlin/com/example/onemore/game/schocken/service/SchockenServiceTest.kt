package com.example.onemore.game.schocken.service

import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.PlayerRole
import com.example.onemore.domain.model.SessionStatus
import com.example.onemore.domain.repository.GameSessionRepository
import com.example.onemore.domain.repository.PlayerRepository
import com.example.onemore.exception.ForbiddenException
import com.example.onemore.exception.GameActionException
import com.example.onemore.game.schocken.websocket.HandResultDto
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
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@ExtendWith(MockitoExtension::class)
class SchockenServiceTest {

    @Mock private lateinit var sessionRepository: GameSessionRepository
    @Mock private lateinit var playerRepository: PlayerRepository
    @Mock private lateinit var publisher: SchockenEventPublisher

    private lateinit var service: SchockenService

    private val sessionId: UUID = UUID.randomUUID()
    private val sessionCode = "TCODE"
    private val diceRoller = ScriptedDiceRoller()

    private companion object {
        // A fresh throw is Jule/General/Straße with p = 1/6, so 500 attempts never realistically miss
        const val MAX_RANDOM_ATTEMPTS = 500

        // Opening throws used by startGame: the first player loses with a normal hand (1 lid)
        val LOSING_OPENING_THROW = listOf(5, 3, 2)
        val WINNING_OPENING_THROW = listOf(6, 5, 2)
    }

    /** Returns scripted values first, then falls back to random rolls. */
    private class ScriptedDiceRoller : DiceRoller {
        private val scripted = ArrayDeque<Int>()
        private val fallback = RandomDiceRoller()

        fun script(vararg throws: List<Int>) = throws.forEach { scripted.addAll(it) }

        override fun roll(): Int = scripted.removeFirstOrNull() ?: fallback.roll()
    }

    @BeforeEach
    fun setup() {
        service = SchockenService(sessionRepository, playerRepository, publisher, diceRoller)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Starts a game whose "Erster Hoch" opening round is lost by the first player, so the
     * first player also starts the first regular round and the stack holds 12 lids.
     */
    private fun startGame(vararg players: Player) {
        diceRoller.script(LOSING_OPENING_THROW, *Array(players.size - 1) { WINNING_OPENING_THROW })
        service.initGame(makeSession(), players.toList())
    }

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
        startGame(player1, player2)

        assertThrows<ForbiddenException> {
            service.rollDice(sessionCode, ctx(player2.id), emptyList())
        }
    }

    @Test
    fun `rollDice throws GameActionException when max rolls are reached`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        startGame(player1, player2)
        repeat(3) { service.rollDice(sessionCode, ctx(player1.id), emptyList()) }
        // The last player stays current once all rolls are used (reveal phase starts)
        repeat(3) { service.rollDice(sessionCode, ctx(player2.id), emptyList()) }

        assertThrows<GameActionException> {
            service.rollDice(sessionCode, ctx(player2.id), emptyList())
        }
    }

    @Test
    fun `rollDice increments rollIndex with each call`() {
        val player = makePlayer("Alice")
        startGame(player, makePlayer("Bob"))
        val ctx = ctx(player.id)

        val r1 = service.rollDice(sessionCode, ctx, emptyList())
        val r2 = service.rollDice(sessionCode, ctx, emptyList())

        assertEquals(1, r1.rollIndex)
        assertEquals(2, r2.rollIndex)
    }

    @Test
    fun `rollDice throws GameActionException when keeping dice on the first roll`() {
        // Dice start at value 1 — keeping all three before rolling would be a free Schock Out
        val player = makePlayer("Alice")
        startGame(player, makePlayer("Bob"))

        assertThrows<GameActionException> {
            service.rollDice(sessionCode, ctx(player.id), listOf(0, 1, 2))
        }
        assertEquals(0, service.getGameView(sessionCode, ctx(player.id)).myRollIndex)
    }

    @Test
    fun `rollDice keeps specified dice and re-rolls the rest`() {
        val player = makePlayer("Alice")
        startGame(player, makePlayer("Bob"))
        val ctx = ctx(player.id)

        val firstRoll = service.rollDice(sessionCode, ctx, emptyList())
        val keptDie = firstRoll.dice.first()
        val secondRoll = service.rollDice(sessionCode, ctx, listOf(keptDie.id))

        val keptAfter = secondRoll.dice.first { it.id == keptDie.id }
        assertTrue(keptAfter.kept)
        assertEquals(keptDie.value, keptAfter.value)
    }

    @Test
    fun `re-rolling all dice after keeping some counts as a fresh throw`() {
        // Regression: hadKeptDice was never reset, so a full re-roll after keeping dice
        // could no longer score Jule, General or Straße. Dice are random, so play until
        // the fresh throw is one of those combinations.
        var specialHandsSeen = 0
        repeat(MAX_RANDOM_ATTEMPTS) {
            if (specialHandsSeen > 0) return@repeat
            val player1 = makePlayer("Alice")
            val player2 = makePlayer("Bob")
            startGame(player1, player2)

            service.rollDice(sessionCode, ctx(player1.id), emptyList())
            service.rollDice(sessionCode, ctx(player1.id), listOf(0))
            service.rollDice(sessionCode, ctx(player1.id), emptyList())
            repeat(3) { service.rollDice(sessionCode, ctx(player2.id), emptyList()) }
            val hand = service.revealHand(sessionCode, ctx(player1.id))

            val values = service.getGameView(sessionCode, ctx(player1.id)).playerOrder
                .first { it.id == player1.id.toString() }.dice!!.map { it.value }
            val freshHand = service.evaluateHand(values, hadKeptDice = false)
            val combinedHand = service.evaluateHand(values, hadKeptDice = true)
            assertEquals(freshHand.name, hand.name)
            if (freshHand != combinedHand) specialHandsSeen++
        }
        assertTrue(specialHandsSeen > 0, "No Jule/General/Straße rolled in $MAX_RANDOM_ATTEMPTS attempts")
    }

    @Test
    fun `keeping dice in the last roll prevents Jule General and Straße`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        startGame(player1, player2)

        service.rollDice(sessionCode, ctx(player1.id), emptyList())
        service.rollDice(sessionCode, ctx(player1.id), emptyList())
        service.rollDice(sessionCode, ctx(player1.id), listOf(0))
        repeat(3) { service.rollDice(sessionCode, ctx(player2.id), emptyList()) }
        val hand = service.revealHand(sessionCode, ctx(player1.id))

        val values = service.getGameView(sessionCode, ctx(player1.id)).playerOrder
            .first { it.id == player1.id.toString() }.dice!!.map { it.value }
        assertEquals(service.evaluateHand(values, hadKeptDice = true).name, hand.name)
    }

    // ── revealHand ───────────────────────────────────────────────────────────

    @Test
    fun `revealHand throws GameActionException when player has not rolled`() {
        val player = makePlayer("Alice")
        startGame(player, makePlayer("Bob"))

        assertThrows<GameActionException> {
            service.revealHand(sessionCode, ctx(player.id))
        }
    }

    @Test
    fun `revealHand throws GameActionException when already revealed`() {
        val player = makePlayer("Alice")
        startGame(player, makePlayer("Bob"))
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
        startGame(player, makePlayer("Bob"))
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
        startGame(player1, player2)

        service.rollDice(sessionCode, ctx(player1.id), emptyList())

        assertThrows<ForbiddenException> {
            service.standPlayer(sessionCode, ctx(player2.id))
        }
    }

    @Test
    fun `standPlayer throws GameActionException when player has not rolled`() {
        val player = makePlayer("Alice")
        startGame(player, makePlayer("Bob"))

        assertThrows<GameActionException> {
            service.standPlayer(sessionCode, ctx(player.id))
        }
    }

    @Test
    fun `standPlayer sets maxRollsThisRound based on first player's roll count`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        startGame(player1, player2)

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
        startGame(player1, player2)

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

    // ── Erster Hoch (opening round) ───────────────────────────────────────────

    @Test
    fun `initGame marks the session as in game so the host can return to the lobby`() {
        // Regression: the session stayed STARTING, so return-to-lobby and restarting were rejected
        val session = makeSession()
        diceRoller.script(LOSING_OPENING_THROW, WINNING_OPENING_THROW)
        service.initGame(session, listOf(makePlayer("Alice"), makePlayer("Bob")))

        assertEquals(SessionStatus.IN_GAME, session.status)
    }

    @Test
    fun `opening round worst throw takes the lids and starts the first round`() {
        val alice = makePlayer("Alice")
        val bob = makePlayer("Bob")
        val carol = makePlayer("Carol")
        diceRoller.script(listOf(6, 5, 2), listOf(5, 3, 2), listOf(6, 4, 2))
        service.initGame(makeSession(), listOf(alice, bob, carol))

        val view = service.getGameView(sessionCode, ctx(alice.id))
        assertEquals(bob.id.toString(), view.playerOrder[view.currentPlayerIdx].id)
        assertEquals(1, view.playerLids[bob.id.toString()])
        assertEquals(12, view.lidStack)
        val opening = view.openingRound!!
        assertEquals(listOf("6-5-2", "5-3-2", "6-4-2"), opening.throws.map { it.hand.name })
        assertEquals(listOf(bob.id.toString()), opening.loserIds)
        assertEquals(1, opening.lidValue)
    }

    @Test
    fun `opening round lid value comes from the best throw`() {
        val alice = makePlayer("Alice")
        val bob = makePlayer("Bob")
        diceRoller.script(listOf(5, 3, 2), listOf(4, 4, 4))
        service.initGame(makeSession(), listOf(alice, bob))

        val view = service.getGameView(sessionCode, ctx(alice.id))
        assertEquals(3, view.playerLids[alice.id.toString()], "General gives 3 lids")
        assertEquals(10, view.lidStack)
    }

    @Test
    fun `opening round tie for worst throw lets the first in player order start`() {
        val alice = makePlayer("Alice")
        val bob = makePlayer("Bob")
        val carol = makePlayer("Carol")
        diceRoller.script(listOf(6, 5, 2), listOf(5, 3, 2), listOf(5, 3, 2))
        service.initGame(makeSession(), listOf(alice, bob, carol))

        val view = service.getGameView(sessionCode, ctx(alice.id))
        assertEquals(bob.id.toString(), view.playerOrder[view.currentPlayerIdx].id)
        assertEquals(listOf(bob.id.toString(), carol.id.toString()), view.openingRound!!.loserIds)
    }

    @Test
    fun `opening round Schock Out ends a two-player game immediately`() {
        val alice = makePlayer("Alice")
        val bob = makePlayer("Bob")
        diceRoller.script(listOf(5, 3, 2), listOf(1, 1, 1))
        service.initGame(makeSession(), listOf(alice, bob))

        val view = service.getGameView(sessionCode, ctx(alice.id))
        assertTrue(view.gameOver)
        assertEquals(alice.id.toString(), view.gameOverLoserId)
        assertEquals(13, view.playerLids[alice.id.toString()])
        assertNotNull(view.openingRound, "Opening result must stay visible when it ended the game")
    }

    @Test
    fun `opening round result is cleared by the first roll of the regular game`() {
        val alice = makePlayer("Alice")
        val bob = makePlayer("Bob")
        startGame(alice, bob)
        assertNotNull(service.getGameView(sessionCode, ctx(alice.id)).openingRound)

        service.rollDice(sessionCode, ctx(alice.id), emptyList())

        assertNull(service.getGameView(sessionCode, ctx(alice.id)).openingRound)
    }

    @Test
    fun `players start the first regular round with fresh turns after the opening round`() {
        val alice = makePlayer("Alice")
        val bob = makePlayer("Bob")
        startGame(alice, bob)

        val view = service.getGameView(sessionCode, ctx(alice.id))
        assertEquals(0, view.myRollIndex)
        assertTrue(view.playerOrder.none { it.revealed || it.rollIndex > 0 })
        assertNull(view.maxRollsThisRound)
    }

    // ── Round end ─────────────────────────────────────────────────────────────

    @Test
    fun `lids are distributed from the stack after all players reveal`() {
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        startGame(player1, player2)

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
        // A single-player game: that player wins and loses the opening round → immediate game over
        val player = makePlayer("Alice")
        startGame(player)

        val view = service.getGameView(sessionCode, ctx(player.id))
        assertTrue(view.gameOver, "Game must be over when only one player remains")
        assertEquals(player.id.toString(), view.gameOverLoserId)
    }

    @Test
    fun `when lid stack is empty redistribution takes from the round winner not the richest player`() {
        // Drain the stack completely by playing rounds until lidStack == 0.
        // Each round pays at least 1 lid, so the stack empties within 13 rounds.
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        startGame(player1, player2)

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
        startGame(player1, player2)

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
        startGame(player1, player2)

        repeat(3) { service.rollDice(sessionCode, ctx(player1.id), emptyList()) }

        // After 3 rolls, turn advances to player2
        val view = service.getGameView(sessionCode, ctx(player1.id))
        assertEquals(player2.id.toString(), view.playerOrder[view.currentPlayerIdx].id)
        assertTrue(view.playerOrder.first { it.id == player1.id.toString() }.closed)
    }

    @Test
    fun `rollDice at max rolls returns non-kept dice as value 0`() {
        val player = makePlayer("Alice")
        startGame(player, makePlayer("Bob"))
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
        startGame(player1, player2)

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
        startGame(player1, player2)

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
        startGame(player1, player2)

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
        startGame(player1, player2)

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
        startGame(player1, player2)

        repeat(3) { service.rollDice(sessionCode, ctx(player1.id), emptyList()) }
        repeat(3) { service.rollDice(sessionCode, ctx(player2.id), emptyList()) }

        // player1 reveals successfully
        val hand = service.revealHand(sessionCode, ctx(player1.id))
        assertNotNull(hand.name)

        val view = service.getGameView(sessionCode, ctx(player1.id))
        assertTrue(view.playerOrder.first { it.id == player1.id.toString() }.revealed)
    }

    @Test
    fun `reveal phase concurrent reveals by the queue head succeed only once`() {
        // Regression: a doubled POST /reveal raced through revealHand and either crashed on an
        // empty queue or removed the next revealer from the queue without them revealing.
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        val player3 = makePlayer("Carol")
        startGame(player1, player2, player3)
        listOf(player1, player2, player3).forEach { p ->
            repeat(3) { service.rollDice(sessionCode, ctx(p.id), emptyList()) }
        }

        val attempts = 8
        val startGate = CountDownLatch(1)
        val pool = Executors.newFixedThreadPool(attempts)
        val outcomes = (1..attempts).map {
            pool.submit<Result<HandResultDto>> {
                startGate.await()
                runCatching { service.revealHand(sessionCode, ctx(player1.id)) }
            }
        }
        startGate.countDown()
        val results = outcomes.map { it.get(5, TimeUnit.SECONDS) }
        pool.shutdown()

        assertEquals(1, results.count { it.isSuccess })
        assertTrue(results.filter { it.isFailure }.all { it.exceptionOrNull() is GameActionException })
        // Bob is still the queue head and must be able to reveal
        assertDoesNotThrow { service.revealHand(sessionCode, ctx(player2.id)) }
    }

    // ── Round end ─────────────────────────────────────────────────────────────

    @Test
    fun `two-player game does not end after the first round while the lid stack still has lids`() {
        // Regression: activePlayers2 used to filter by lids > 0, which made the game end after
        // round 1 because only the loser had lids (winner stayed at 0).
        val player1 = makePlayer("Alice")
        val player2 = makePlayer("Bob")
        startGame(player1, player2)

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
