package com.example.onemore.game.kingscup.util

/** Translation keys — the client renders the localized word. */
object KingsCupData {
    val RHYME_SEEDS = listOf(
        "cat", "day", "night", "beer", "love", "moon", "hat",
        "lake", "fire", "stone", "rain", "king", "run", "bright", "song", "fun"
    )

    val CATEGORIES = listOf(
        "countries", "car_brands", "pizza_toppings", "superheroes",
        "kitchen_things", "beer_types", "animal_sounds", "athletes",
        "beach_things", "movie_villains", "tv_shows", "cocktails", "board_games", "apps"
    )

    fun randomRhymeSeed() = RHYME_SEEDS.random()

    fun randomCategory() = CATEGORIES.random()
}
