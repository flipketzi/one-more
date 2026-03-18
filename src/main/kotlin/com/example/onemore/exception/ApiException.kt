package com.example.onemore.exception

import org.springframework.http.HttpStatus

sealed class ApiException(val status: HttpStatus, message: String) : RuntimeException(message)

class SessionNotFoundException(code: String) :
    ApiException(HttpStatus.NOT_FOUND, "Session '$code' not found")

class SessionFullException :
    ApiException(HttpStatus.CONFLICT, "Session is full")

class SessionNotOpenException(code: String) :
    ApiException(HttpStatus.GONE, "Session '$code' is no longer accepting players")

class DuplicateUsernameException(username: String) :
    ApiException(HttpStatus.CONFLICT, "Username '$username' is already taken in this session")

class ForbiddenException(message: String = "You do not have permission to perform this action") :
    ApiException(HttpStatus.FORBIDDEN, message)

class RateLimitExceededException :
    ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests — please wait before trying again")

class PlayerNotFoundException(playerId: String) :
    ApiException(HttpStatus.NOT_FOUND, "Player '$playerId' not found in this session")

class GameActionException(message: String) :
    ApiException(HttpStatus.CONFLICT, message)
