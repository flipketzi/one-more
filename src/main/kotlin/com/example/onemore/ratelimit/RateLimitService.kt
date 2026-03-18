package com.example.onemore.ratelimit

interface RateLimitService {
    /**
     * Checks rate limits for a join attempt.
     * @throws RateLimitExceededException if any limit is exceeded
     */
    fun checkJoinAttempt(ip: String, sessionCode: String)
}
