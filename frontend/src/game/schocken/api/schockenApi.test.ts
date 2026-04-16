import { vi } from 'vitest'

// Mock the axios client before importing the API functions
vi.mock('../../../api/client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import { api } from '../../../api/client'
import { rollDice, revealHand, standPlayer, getSchockenState } from './schockenApi'

const mockPost = vi.mocked(api.post)
const mockGet = vi.mocked(api.get)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rollDice', () => {
  it('POSTs to /sessions/{code}/schocken/roll with keptDieIds', async () => {
    mockPost.mockResolvedValue({ data: { dice: [], rollIndex: 1 } })

    await rollDice('ABCDE', [0, 2])

    expect(mockPost).toHaveBeenCalledWith('/sessions/ABCDE/schocken/roll', { keptDieIds: [0, 2] })
  })

  it('returns the response data', async () => {
    const payload = { dice: [{ id: 0, value: 4, kept: false }], rollIndex: 2 }
    mockPost.mockResolvedValue({ data: payload })

    const result = await rollDice('ABCDE', [])

    expect(result).toEqual(payload)
  })
})

describe('revealHand', () => {
  it('POSTs to /sessions/{code}/schocken/reveal', async () => {
    mockPost.mockResolvedValue({ data: { name: 'Schock 4', lids: 4, rank: 9040 } })

    await revealHand('ABCDE')

    expect(mockPost).toHaveBeenCalledWith('/sessions/ABCDE/schocken/reveal')
  })

  it('returns the HandResult', async () => {
    const hand = { name: 'Jule', lids: 7, rank: 8700 }
    mockPost.mockResolvedValue({ data: hand })

    const result = await revealHand('ABCDE')

    expect(result).toEqual(hand)
  })
})

describe('standPlayer', () => {
  it('POSTs to /sessions/{code}/schocken/stand', async () => {
    mockPost.mockResolvedValue({ data: { name: '6-5-4', lids: 1, rank: 654 } })

    await standPlayer('ABCDE')

    expect(mockPost).toHaveBeenCalledWith('/sessions/ABCDE/schocken/stand')
  })

  it('returns the HandResult', async () => {
    const hand = { name: 'General 3', lids: 3, rank: 8030 }
    mockPost.mockResolvedValue({ data: hand })

    const result = await standPlayer('ABCDE')

    expect(result).toEqual(hand)
  })
})

describe('getSchockenState', () => {
  it('GETs /sessions/{code}/schocken/state', async () => {
    mockGet.mockResolvedValue({ data: {} })

    await getSchockenState('ABCDE')

    expect(mockGet).toHaveBeenCalledWith('/sessions/ABCDE/schocken/state')
  })

  it('returns the game state', async () => {
    const state = { myDice: [], myRollIndex: 0, playerOrder: [], currentPlayerIdx: 0, lidStack: 13, playerLids: {}, gameOver: false, maxRollsThisRound: null }
    mockGet.mockResolvedValue({ data: state })

    const result = await getSchockenState('ABCDE')

    expect(result).toEqual(state)
  })
})
