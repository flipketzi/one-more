package com.example.onemore.game.kingscup.util

object CardDeck {
    private val RANKS = listOf("2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A")
    private val SUITS = listOf("H", "D", "C", "S")

    fun buildShuffled(): MutableList<String> =
        RANKS.flatMap { r -> SUITS.map { s -> "$r$s" } }.shuffled().toMutableList()

    fun rank(card: String): String = card.dropLast(1)

    fun suit(card: String): String = card.takeLast(1)
}
