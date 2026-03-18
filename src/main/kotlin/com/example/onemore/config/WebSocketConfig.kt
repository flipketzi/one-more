package com.example.onemore.config

import com.example.onemore.service.InvalidTokenException
import com.example.onemore.service.TokenService
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(private val tokenService: TokenService) : WebSocketMessageBrokerConfigurer {

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("http://localhost:*", "https://*")
            .withSockJS()
    }

    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        registry.enableSimpleBroker("/topic", "/queue")
        registry.setApplicationDestinationPrefixes("/app")
        registry.setUserDestinationPrefix("/user")
    }

    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        registration.interceptors(StompAuthInterceptor(tokenService))
    }
}

private class StompAuthInterceptor(private val tokenService: TokenService) : ChannelInterceptor {

    private val log = LoggerFactory.getLogger(StompAuthInterceptor::class.java)

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*> {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)

        if (accessor?.command == StompCommand.CONNECT) {
            val authHeader = accessor.getFirstNativeHeader("Authorization")
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                val token = authHeader.removePrefix("Bearer ")
                try {
                    val context = tokenService.validateToken(token)
                    accessor.user = StompPrincipal(context.playerId.toString(), context)
                } catch (e: InvalidTokenException) {
                    log.warn("WebSocket CONNECT rejected — invalid token: {}", e.message)
                    throw IllegalStateException("Invalid or missing token")
                }
            }
        }

        return message
    }
}

private class StompPrincipal(
    private val name: String,
    val playerContext: com.example.onemore.security.PlayerContext
) : java.security.Principal {
    override fun getName(): String = name
}
