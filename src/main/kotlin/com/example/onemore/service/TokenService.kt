package com.example.onemore.service

import com.example.onemore.config.JwtProperties
import com.example.onemore.domain.entity.GameSession
import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.PlayerRole
import com.example.onemore.security.PlayerContext
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey

@Service
class TokenService(private val jwtProperties: JwtProperties) {

    private val signingKey: SecretKey by lazy {
        Keys.hmacShaKeyFor(jwtProperties.secret.toByteArray(Charsets.UTF_8))
    }

    fun mintToken(player: Player, session: GameSession): String {
        val now = Instant.now()
        val expiry = now.plus(jwtProperties.expiryHours, ChronoUnit.HOURS)

        return Jwts.builder()
            .subject(player.id.toString())
            .claim("sid", session.id.toString())
            .claim("role", player.role.name)
            .claim("username", player.username)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(signingKey)
            .compact()
    }

    fun validateToken(token: String): PlayerContext {
        try {
            val claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .payload

            return PlayerContext(
                playerId = UUID.fromString(claims.subject),
                sessionId = UUID.fromString(claims.get("sid", String::class.java)),
                role = PlayerRole.valueOf(claims.get("role", String::class.java)),
                username = claims.get("username", String::class.java)
            )
        } catch (e: JwtException) {
            throw InvalidTokenException("Invalid or expired token")
        } catch (e: IllegalArgumentException) {
            throw InvalidTokenException("Malformed token claims")
        }
    }
}

class InvalidTokenException(message: String) : RuntimeException(message)
