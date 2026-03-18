package com.example.onemore.ratelimit

import com.example.onemore.exception.RateLimitExceededException
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Service
class InMemoryRateLimitService(
    @Value("\${app.rate-limit.max-attempts:10}") private val maxAttempts: Int,
    @Value("\${app.rate-limit.window-seconds:60}") private val windowSeconds: Long
) : RateLimitService {

    private data class Bucket(val count: Int, val windowStart: Instant)

    private val ipBuckets = ConcurrentHashMap<String, Bucket>()
    private val codeBuckets = ConcurrentHashMap<String, Bucket>()

    override fun checkJoinAttempt(ip: String, sessionCode: String) {
        checkAndIncrement(ipBuckets, ip, maxAttempts)
        checkAndIncrement(codeBuckets, sessionCode, maxAttempts * 2)
    }

    private fun checkAndIncrement(buckets: ConcurrentHashMap<String, Bucket>, key: String, limit: Int) {
        val now = Instant.now()
        val windowStart = now.minusSeconds(windowSeconds)

        val updated = buckets.compute(key) { _, current ->
            when {
                current == null || current.windowStart.isBefore(windowStart) -> Bucket(1, now)
                else -> Bucket(current.count + 1, current.windowStart)
            }
        }!!

        if (updated.count > limit) {
            throw RateLimitExceededException()
        }
    }
}
