package com.example.onemore.game.kingscup.domain.model

data class KingsCupGameState(
    val deck: MutableList<String>,
    val turnOrder: List<String>,
    var currentTurnIndex: Int = 0,
    var phase: GamePhase = GamePhase.WAITING_TO_DRAW,
    var currentCard: String? = null,
    val drinkingBuddies: MutableMap<String, String> = mutableMapOf(),
    var thumbQueenId: String? = null,
    var thumbQueenUsesLeft: Int = 0,
    val jackRules: MutableList<JackRule> = mutableListOf(),
    var kingsDrawn: Int = 0,
    val kingsCupContents: MutableList<String> = mutableListOf(),
    var touchRace: TouchRaceState? = null,
    var wordRound: WordRoundState? = null,
    var pendingPickTarget: PendingPickTarget? = null,
    var pendingCategory: String? = null
)

data class TouchRaceState(
    val raceId: String,
    val raceType: TouchRaceType,
    val initiatorId: String,
    val eligiblePlayerIds: List<String>,
    val touchOrder: MutableList<String> = mutableListOf(),
    val touchTimestamps: MutableMap<String, Long> = mutableMapOf(),
    val startedAt: Long,
    val windowSeconds: Int = 10,
    var resolved: Boolean = false,
    var loserId: String? = null
)

data class WordRoundState(
    val roundId: String,
    val roundType: WordRoundType,
    val seedWord: String,
    var currentSpeakerIndex: Int,
    val submissions: MutableList<WordSubmission> = mutableListOf(),
    var resolved: Boolean = false,
    var loserId: String? = null
)

data class WordSubmission(val playerId: String, val username: String, val word: String, val passed: Boolean)

data class JackRule(val ruleText: String, val authorName: String, val authorId: String)

data class PendingPickTarget(val pickType: PickTargetType, val pickerPlayerId: String)
