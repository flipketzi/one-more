package com.example.onemore.game.kingscup.util

object KingsCupData {
    val RHYME_SEEDS = listOf(
        "cat", "day", "night", "beer", "love", "moon", "hat",
        "lake", "fire", "stone", "rain", "king", "run", "bright", "song", "fun"
    )

    val CATEGORIES = listOf(
        "Countries", "Car brands", "Pizza toppings", "Superheroes",
        "Things in a kitchen", "Types of beer", "Animal sounds", "Famous athletes",
        "Things at a beach", "Movie villains", "TV shows", "Cocktail names", "Board games", "App names"
    )

    fun randomRhymeSeed() = RHYME_SEEDS.random()

    fun randomCategory() = CATEGORIES.random()
}
