package com.example.onemore.api.dto.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class CreateSessionRequest(
    @field:NotBlank(message = "Username is required")
    @field:Size(min = 2, max = 32, message = "Username must be between 2 and 32 characters")
    @field:Pattern(regexp = "[A-Za-z0-9_\\- ]+", message = "Username may only contain letters, digits, spaces, hyphens and underscores")
    val username: String,

    @field:NotBlank(message = "Avatar is required")
    @field:Size(max = 50, message = "Avatar identifier must not exceed 50 characters")
    val avatar: String
)
