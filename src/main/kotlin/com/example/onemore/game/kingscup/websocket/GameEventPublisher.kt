package com.example.onemore.game.kingscup.websocket

import com.example.onemore.game.kingscup.websocket.event.GameEvent
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

@Component
class GameEventPublisher(private val messagingTemplate: SimpMessagingTemplate) {
    fun publish(event: GameEvent) =
        messagingTemplate.convertAndSend("/topic/sessions/${event.sessionCode}/game", event)
}
