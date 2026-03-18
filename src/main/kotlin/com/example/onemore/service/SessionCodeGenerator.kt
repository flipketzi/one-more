package com.example.onemore.service

import com.example.onemore.domain.repository.GameSessionRepository
import org.springframework.stereotype.Component
import java.security.SecureRandom

@Component
class SessionCodeGenerator(private val sessionRepository: GameSessionRepository) {

    companion object {
        // Excludes: 0/O, 1/I/L, A/E/U (vowels prevent accidental words), 8/B (visual ambiguity)
        private const val ALPHABET = "BCDFGHJKMNPQRSTVWXYZ2345679"
        private const val CODE_LENGTH = 5
        private const val MAX_RETRIES = 5
    }

    private val random = SecureRandom()

    fun generate(): String {
        repeat(MAX_RETRIES) {
            val code = buildString(CODE_LENGTH) {
                repeat(CODE_LENGTH) { append(ALPHABET[random.nextInt(ALPHABET.length)]) }
            }
            if (sessionRepository.findBySessionCode(code) == null) {
                return code
            }
        }
        throw IllegalStateException("Failed to generate a unique session code after $MAX_RETRIES attempts")
    }
}
