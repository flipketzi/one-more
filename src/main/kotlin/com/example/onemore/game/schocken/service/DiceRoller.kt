package com.example.onemore.game.schocken.service

import org.springframework.stereotype.Component
import kotlin.random.Random

/** Source of die values — injectable so game rules can be tested with scripted rolls. */
fun interface DiceRoller {
    fun roll(): Int
}

@Component
class RandomDiceRoller : DiceRoller {
    override fun roll(): Int = Random.nextInt(MIN_PIPS, MAX_PIPS + 1)

    private companion object {
        const val MIN_PIPS = 1
        const val MAX_PIPS = 6
    }
}
