package com.example.onemore.game.schocken.websocket

import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

@Component
class SchockenEventPublisher(private val messagingTemplate: SimpMessagingTemplate) {
    fun publish(code: String, event: SchockenEvent) {
        messagingTemplate.convertAndSend("/topic/sessions/$code/schocken", event)
    }
}
