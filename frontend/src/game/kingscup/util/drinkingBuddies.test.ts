import { describe, expect, it } from 'vitest'
import { pairBuddies } from './drinkingBuddies'

describe('pairBuddies', () => {
  it('pairs two players both ways', () => {
    expect(pairBuddies({}, 'a', 'b')).toEqual({ a: 'b', b: 'a' })
  })

  it('dissolves the previous pairs of both players', () => {
    const buddies = { a: 'd', d: 'a', b: 'c', c: 'b' }
    expect(pairBuddies(buddies, 'a', 'b')).toEqual({ a: 'b', b: 'a' })
  })

  it('does not mutate the input', () => {
    const buddies = { a: 'c', c: 'a' }
    pairBuddies(buddies, 'a', 'b')
    expect(buddies).toEqual({ a: 'c', c: 'a' })
  })
})
