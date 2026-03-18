package com.example.onemore.security

import com.example.onemore.service.InvalidTokenException
import com.example.onemore.service.TokenService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(private val tokenService: TokenService) : OncePerRequestFilter() {

    companion object {
        private val UNAUTHENTICATED_PATHS = setOf(
            "/api/v1/sessions" to "POST",
        )
        private val UNAUTHENTICATED_PATH_PATTERNS = listOf(
            Regex("^/api/v1/sessions/[^/]+/join$"),
        )
    }

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        val path = request.requestURI
        val method = request.method

        if (UNAUTHENTICATED_PATHS.any { (p, m) -> path == p && method == m }) return true
        if (UNAUTHENTICATED_PATH_PATTERNS.any { it.matches(path) }) return true

        // Allow H2 console and non-API paths through
        if (!path.startsWith("/api/")) return true

        return false
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendUnauthorized(response, "Missing or invalid Authorization header")
            return
        }

        val token = authHeader.removePrefix("Bearer ")
        try {
            val context = tokenService.validateToken(token)
            PlayerContextHolder.set(context)
            filterChain.doFilter(request, response)
        } catch (e: InvalidTokenException) {
            sendUnauthorized(response, e.message ?: "Unauthorized")
        } finally {
            PlayerContextHolder.clear()
        }
    }

    private fun sendUnauthorized(response: HttpServletResponse, message: String) {
        response.status = HttpStatus.UNAUTHORIZED.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.writer.write("""{"error":"UNAUTHORIZED","message":"$message"}""")
    }
}
