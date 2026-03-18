package com.example.onemore.game.kingscup.api

import com.example.onemore.game.kingscup.api.dto.*
import com.example.onemore.game.kingscup.service.KingsCupService
import com.example.onemore.security.CurrentPlayer
import com.example.onemore.security.PlayerContext
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/sessions/{code}/game")
class KingsCupController(private val kingsCupService: KingsCupService) {

    @GetMapping("/state")
    fun getState(
        @PathVariable code: String,
        @CurrentPlayer ctx: PlayerContext
    ) = kingsCupService.getState(ctx, code)

    @PostMapping("/draw")
    fun drawCard(
        @PathVariable code: String,
        @CurrentPlayer ctx: PlayerContext
    ) = kingsCupService.drawCard(ctx, code)

    @PostMapping("/pick-target")
    fun pickTarget(
        @PathVariable code: String,
        @RequestBody request: PickTargetRequest,
        @CurrentPlayer ctx: PlayerContext
    ) = kingsCupService.pickTarget(ctx, code, request.targetPlayerId)

    @PostMapping("/touch")
    fun registerTouch(
        @PathVariable code: String,
        @RequestBody request: TouchRequest,
        @CurrentPlayer ctx: PlayerContext
    ) = kingsCupService.registerTouch(ctx, code, request.raceId)

    @PostMapping("/queen-activate")
    fun activateQueenButton(
        @PathVariable code: String,
        @CurrentPlayer ctx: PlayerContext
    ) = kingsCupService.activateQueenButton(ctx, code)

    @PostMapping("/word-submit")
    fun submitWord(
        @PathVariable code: String,
        @RequestBody request: WordSubmitRequest,
        @CurrentPlayer ctx: PlayerContext
    ) = kingsCupService.submitWord(ctx, code, request.word, request.passed)

    @PostMapping("/submit-rule")
    fun submitJackRule(
        @PathVariable code: String,
        @RequestBody request: SubmitRuleRequest,
        @CurrentPlayer ctx: PlayerContext
    ) = kingsCupService.submitJackRule(ctx, code, request.ruleText)

    @PostMapping("/advance")
    fun advanceTurn(
        @PathVariable code: String,
        @CurrentPlayer ctx: PlayerContext
    ) = kingsCupService.advanceTurn(ctx, code)
}
