package com.example.onemore.exception

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

data class ErrorResponse(val error: String, val message: String)
data class ValidationErrorResponse(val error: String, val message: String, val fields: Map<String, String>)

@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(ApiException::class)
    fun handleApiException(e: ApiException): ResponseEntity<ErrorResponse> {
        val errorCode = e::class.simpleName
            ?.removeSuffix("Exception")
            ?.replace(Regex("([A-Z])"), "_$1")
            ?.removePrefix("_")
            ?.uppercase()
            ?: "API_ERROR"

        val retryAfter = if (e is RateLimitExceededException) "60" else null
        val response = ResponseEntity.status(e.status)
        retryAfter?.let { response.header("Retry-After", it) }
        return response.body(ErrorResponse(errorCode, e.message ?: "An error occurred"))
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ValidationErrorResponse> {
        val fields = e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "Invalid value") }
        return ResponseEntity.badRequest().body(
            ValidationErrorResponse("VALIDATION_ERROR", "Request validation failed", fields)
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(e: Exception): ResponseEntity<ErrorResponse> {
        log.error("Unexpected error", e)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"))
    }
}
