package com.example.onemore.api.controller

import com.example.onemore.api.dto.request.SelectGameRequest
import com.example.onemore.security.CurrentPlayer
import com.example.onemore.security.PlayerContext
import com.example.onemore.service.LobbyService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/sessions/{code}")
class LobbyController(private val lobbyService: LobbyService) {

    @PatchMapping("/game")
    fun selectGame(
        @PathVariable code: String,
        @Valid @RequestBody request: SelectGameRequest,
        @CurrentPlayer context: PlayerContext
    ) = lobbyService.selectGame(context, code, request.gameType)

    @DeleteMapping("/players/{playerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun kickPlayer(
        @PathVariable code: String,
        @PathVariable playerId: UUID,
        @CurrentPlayer context: PlayerContext
    ) = lobbyService.kickPlayer(context, code, playerId)

    @PostMapping("/start")
    fun startGame(
        @PathVariable code: String,
        @CurrentPlayer context: PlayerContext
    ) = lobbyService.startGame(context, code)

    @PostMapping("/return-to-lobby")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun returnToLobby(
        @PathVariable code: String,
        @CurrentPlayer context: PlayerContext
    ) = lobbyService.returnToLobby(context, code)
}
