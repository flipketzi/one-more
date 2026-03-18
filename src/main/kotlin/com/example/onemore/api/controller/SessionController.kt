package com.example.onemore.api.controller

import com.example.onemore.api.dto.request.CreateSessionRequest
import com.example.onemore.api.dto.request.JoinSessionRequest
import com.example.onemore.api.dto.response.CreateSessionResponse
import com.example.onemore.api.dto.response.JoinSessionResponse
import com.example.onemore.api.dto.response.SessionInfoResponse
import com.example.onemore.security.CurrentPlayer
import com.example.onemore.security.PlayerContext
import com.example.onemore.service.SessionService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/sessions")
class SessionController(private val sessionService: SessionService) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createSession(@Valid @RequestBody request: CreateSessionRequest): CreateSessionResponse =
        sessionService.createSession(request.username, request.avatar)

    @PostMapping("/{code}/join")
    fun joinSession(
        @PathVariable code: String,
        @Valid @RequestBody request: JoinSessionRequest
    ): JoinSessionResponse =
        sessionService.joinSession(code, request.username, request.avatar)

    @DeleteMapping("/{code}/players/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun leaveSession(
        @PathVariable code: String,
        @CurrentPlayer context: PlayerContext
    ) = sessionService.leaveSession(context)

    @GetMapping("/{code}")
    fun getSessionInfo(
        @PathVariable code: String,
        @CurrentPlayer context: PlayerContext
    ): SessionInfoResponse =
        sessionService.getSessionInfo(context, code)
}
