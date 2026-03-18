package com.example.onemore.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.jwt")
data class JwtProperties(
    val secret: String,
    val expiryHours: Long = 4
)
