package com.example.onemore.game.kingscup.websocket.event

import com.example.onemore.game.kingscup.domain.model.JackRule
import java.time.Instant

sealed class GameEvent(val type: String, val sessionCode: String, val timestamp: Instant = Instant.now())

class GameInitializedEvent(sessionCode: String) :
    GameEvent("GAME_INITIALIZED", sessionCode)

class CardDrawnEvent(
    sessionCode: String,
    val card: String,
    val drawnByPlayerId: String,
    val drawnByUsername: String,
    val phase: String
) : GameEvent("CARD_DRAWN", sessionCode)

class SipAssignedEvent(
    sessionCode: String,
    val targetPlayerId: String,
    val targetUsername: String,
    val assignedByUsername: String
) : GameEvent("SIP_ASSIGNED", sessionCode)

class BuddyAssignedEvent(
    sessionCode: String,
    val player1Id: String,
    val player1Username: String,
    val player2Id: String,
    val player2Username: String
) : GameEvent("BUDDY_ASSIGNED", sessionCode)

class TouchRaceStartedEvent(
    sessionCode: String,
    val raceId: String,
    val raceType: String,
    val initiatorUsername: String,
    val eligiblePlayerIds: List<String>,
    val windowSeconds: Int
) : GameEvent("TOUCH_RACE_STARTED", sessionCode)

class TouchRaceResultEvent(
    sessionCode: String,
    val raceId: String,
    val loserPlayerId: String,
    val loserUsername: String,
    val touchOrder: List<String>
) : GameEvent("TOUCH_RACE_RESULT", sessionCode)

class WordRoundStartedEvent(
    sessionCode: String,
    val roundId: String,
    val roundType: String,
    val seedWord: String,
    val firstSpeakerPlayerId: String,
    val firstSpeakerUsername: String
) : GameEvent("WORD_ROUND_STARTED", sessionCode)

class WordRoundTurnEvent(
    sessionCode: String,
    val roundId: String,
    val lastSubmission: WordSubmissionDto?,
    val nextSpeakerPlayerId: String,
    val nextSpeakerUsername: String
) : GameEvent("WORD_ROUND_TURN", sessionCode)

class WordRoundResultEvent(
    sessionCode: String,
    val roundId: String,
    val loserPlayerId: String,
    val loserUsername: String
) : GameEvent("WORD_ROUND_RESULT", sessionCode)

class JackRuleAddedEvent(
    sessionCode: String,
    val ruleText: String,
    val authorUsername: String,
    val allRules: List<JackRuleDto>
) : GameEvent("JACK_RULE_ADDED", sessionCode)

class ThumbQueenAssignedEvent(
    sessionCode: String,
    val queenPlayerId: String,
    val queenUsername: String,
    val usesLeft: Int
) : GameEvent("THUMB_QUEEN_ASSIGNED", sessionCode)

class KingDrawnEvent(
    sessionCode: String,
    val kingsDrawn: Int,
    val drawerUsername: String,
    val kingsCupContents: List<String>,
    val isLastKing: Boolean,
    val lastKingDrinkerPlayerId: String?
) : GameEvent("KING_DRAWN", sessionCode)

class TurnAdvancedEvent(
    sessionCode: String,
    val nextDrawerPlayerId: String,
    val nextDrawerUsername: String,
    val cardsRemaining: Int
) : GameEvent("TURN_ADVANCED", sessionCode)

class GameOverEvent(
    sessionCode: String,
    val reason: String
) : GameEvent("GAME_OVER", sessionCode)

class GameAbandonedEvent(sessionCode: String) : GameEvent("GAME_ABANDONED", sessionCode)

data class WordSubmissionDto(val playerId: String, val username: String, val word: String, val passed: Boolean)
data class JackRuleDto(val ruleText: String, val authorUsername: String)

fun JackRule.toDto() = JackRuleDto(ruleText = ruleText, authorUsername = authorName)
