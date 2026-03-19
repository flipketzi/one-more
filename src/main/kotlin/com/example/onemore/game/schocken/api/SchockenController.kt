package com.example.onemore.game.schocken.api

import com.example.onemore.game.schocken.service.SchockenService
import com.example.onemore.security.CurrentPlayer
import com.example.onemore.security.PlayerContext
import org.springframework.web.bind.annotation.*

data class RollRequest(val keptDieIds: List<Int> = emptyList())

@RestController
@RequestMapping("/api/v1/sessions/{code}/schocken")
class SchockenController(private val schockenService: SchockenService) {

    @PostMapping("/roll")
    fun roll(
        @PathVariable code: String,
        @RequestBody req: RollRequest,
        @CurrentPlayer player: PlayerContext,
    ) = schockenService.rollDice(code.uppercase(), player, req.keptDieIds)

    @PostMapping("/reveal")
    fun reveal(
        @PathVariable code: String,
        @CurrentPlayer player: PlayerContext,
    ) = schockenService.revealHand(code.uppercase(), player)

    @PostMapping("/stand")
    fun stand(
        @PathVariable code: String,
        @CurrentPlayer player: PlayerContext,
    ) = schockenService.standPlayer(code.uppercase(), player)

    @GetMapping("/state")
    fun getState(
        @PathVariable code: String,
        @CurrentPlayer player: PlayerContext,
    ) = schockenService.getGameView(code.uppercase(), player)
}
