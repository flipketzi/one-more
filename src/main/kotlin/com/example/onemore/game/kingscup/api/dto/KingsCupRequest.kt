package com.example.onemore.game.kingscup.api.dto

data class PickTargetRequest(val targetPlayerId: String)
data class TouchRequest(val raceId: String)
data class WordSubmitRequest(val word: String?, val passed: Boolean)
data class SubmitRuleRequest(val ruleText: String)
