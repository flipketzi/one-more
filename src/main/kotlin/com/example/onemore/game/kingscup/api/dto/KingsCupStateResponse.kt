package com.example.onemore.game.kingscup.api.dto

import com.example.onemore.game.kingscup.websocket.event.JackRuleDto

data class KingsCupStateResponse(
    val phase: String,
    val currentDrawerPlayerId: String,
    val currentCard: String?,
    val cardsRemaining: Int,
    val turnOrder: List<PlayerSummaryDto>,
    val drinkingBuddies: Map<String, String>,
    val thumbQueenId: String?,
    val thumbQueenUsesLeft: Int,
    val jackRules: List<JackRuleDto>,
    val kingsDrawn: Int,
    val kingsCupContents: List<String>,
    val touchRace: TouchRaceStateDto?,
    val wordRound: WordRoundStateDto?,
    val pendingCategory: String? = null
)

data class PlayerSummaryDto(val id: String, val username: String, val avatar: String)

data class TouchRaceStateDto(
    val raceId: String,
    val raceType: String,
    val eligiblePlayerIds: List<String>,
    val touchedPlayerIds: List<String>,
    val windowSeconds: Int
)

data class WordRoundStateDto(
    val roundId: String,
    val roundType: String,
    val seedWord: String,
    val currentSpeakerPlayerId: String,
    val submissions: List<WordSubmissionResponseDto>
)

data class WordSubmissionResponseDto(
    val playerId: String,
    val username: String,
    val word: String,
    val passed: Boolean
)
