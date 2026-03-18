package com.example.onemore.ratelimit

import com.example.onemore.exception.RateLimitExceededException
import jakarta.servlet.Filter
import jakarta.servlet.FilterChain
import jakarta.servlet.ServletRequest
import jakarta.servlet.ServletResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Component

@Component
class RateLimitFilter(private val rateLimitService: RateLimitService) : Filter {

    private val joinPathRegex = Regex("^/api/v1/sessions/([^/]+)/join$")

    override fun doFilter(request: ServletRequest, response: ServletResponse, chain: FilterChain) {
        val httpRequest = request as HttpServletRequest
        val httpResponse = response as HttpServletResponse

        val path = httpRequest.requestURI
        val match = joinPathRegex.matchEntire(path)

        if (match != null && httpRequest.method == "POST") {
            val sessionCode = match.groupValues[1]
            val ip = getClientIp(httpRequest)

            try {
                rateLimitService.checkJoinAttempt(ip, sessionCode)
            } catch (e: RateLimitExceededException) {
                httpResponse.status = HttpStatus.TOO_MANY_REQUESTS.value()
                httpResponse.contentType = MediaType.APPLICATION_JSON_VALUE
                httpResponse.setHeader("Retry-After", "60")
                httpResponse.writer.write("""{"error":"RATE_LIMIT_EXCEEDED","message":"${e.message}"}""")
                return
            }
        }

        chain.doFilter(request, response)
    }

    private fun getClientIp(request: HttpServletRequest): String {
        val forwarded = request.getHeader("X-Forwarded-For")
        return if (!forwarded.isNullOrBlank()) {
            forwarded.split(",").first().trim()
        } else {
            request.remoteAddr ?: "unknown"
        }
    }
}
