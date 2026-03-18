package com.example.onemore.api.websocket

import com.example.onemore.api.websocket.event.LobbyEvent
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

@Component
class LobbyEventPublisher(private val messagingTemplate: SimpMessagingTemplate) {

    fun publish(event: LobbyEvent) {
        messagingTemplate.convertAndSend("/topic/sessions/${event.sessionCode}/lobby", event)
    }
}
