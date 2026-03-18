package com.example.onemore.api.dto.request

import com.example.onemore.domain.model.GameType
import jakarta.validation.constraints.NotNull

data class SelectGameRequest(
    @field:NotNull(message = "Game type is required")
    val gameType: GameType
)
