package com.example.onemore.security

object PlayerContextHolder {
    private val holder = ThreadLocal<PlayerContext?>()

    fun set(context: PlayerContext) {
        holder.set(context)
    }

    fun get(): PlayerContext? = holder.get()

    fun clear() {
        holder.remove()
    }
}
