package com.example.onemore.api.dto.response

import com.example.onemore.domain.entity.Player
import com.example.onemore.domain.model.PlayerRole
import com.example.onemore.domain.model.PlayerStatus
import java.util.UUID

data class PlayerResponse(
    val id: UUID,
    val username: String,
    val avatar: String,
    val role: PlayerRole,
    val status: PlayerStatus
) {
    companion object {
        fun from(player: Player) = PlayerResponse(
            id = player.id,
            username = player.username,
            avatar = player.avatar,
            role = player.role,
            status = player.status
        )
    }
}
