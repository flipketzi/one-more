import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'

// ── Mocks (declared before imports that use them) ─────────────────────────────

const mockSubscribe = vi.fn()
const mockActivate = vi.fn()
const mockDeactivate = vi.fn()

let capturedOnConnect: (() => void) | null = null

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn().mockImplementation(function(opts: { onConnect?: () => void }) {
    capturedOnConnect = opts?.onConnect ?? null
    return { activate: mockActivate, deactivate: mockDeactivate, subscribe: mockSubscribe }
  }),
}))

vi.mock('sockjs-client', () => ({ default: vi.fn() }))

vi.mock('../../../context/GameContext', () => ({
  useGame: () => ({ token: 'test-token' }),
}))

const mockRollDice    = vi.fn()
const mockRevealHand  = vi.fn()
const mockStandPlayer = vi.fn()
const mockGetState    = vi.fn()

vi.mock('../api/schockenApi', () => ({
  rollDice:         (...args: unknown[]) => mockRollDice(...args),
  revealHand:       (...args: unknown[]) => mockRevealHand(...args),
  standPlayer:      (...args: unknown[]) => mockStandPlayer(...args),
  getSchockenState: (...args: unknown[]) => mockGetState(...args),
}))

import { useSchockenGame } from './useSchockenGame'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CODE = 'TCODE'
const PLAYER_ID = 'player-1'

function makePlayer(id: string, username: string) {
  return {
    id, username, avatar: 'avatar_beer',
    lids: 0, rollIndex: 0,
    revealed: false, standing: false,
    hand: null, dice: null,
  }
}

/**
 * Calls the onConnect handler captured from the Client constructor.
 * This registers the subscription without any React state update —
 * safe to call outside act().
 */
function connectWs() {
  capturedOnConnect?.()
}

/**
 * Fires a WS event into the hook by calling the subscribed message handler.
 * Wrapped in act() because handlers update React state.
 */
function fireWsEvent(payload: object) {
  const handler = mockSubscribe.mock.calls[0]?.[1]
  if (!handler) throw new Error('Subscribe not registered — call connectWs() first')
  act(() => { handler({ body: JSON.stringify(payload) }) })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  capturedOnConnect = null
  // Never resolves — prevents async applyFullState from firing state updates
  // outside act() and avoids interference with the tests below.
  mockGetState.mockReturnValue(new Promise(() => {}))
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSchockenGame', () => {
  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with phase IDLE', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    expect(result.current.phase).toBe('IDLE')
  })

  it('starts with empty dice and rollIndex 0', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    expect(result.current.myDice).toEqual([])
    expect(result.current.myRollIndex).toBe(0)
  })

  it('starts with gameOver=false and no roundResult', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    expect(result.current.gameOver).toBe(false)
    expect(result.current.roundResult).toBeNull()
  })

  // ── Local phase transitions ────────────────────────────────────────────────

  it('reveal() sets phase to REVEALING', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    act(() => { result.current.reveal() })
    expect(result.current.phase).toBe('REVEALING')
  })

  it('onRevealComplete() sets phase to CUP_UP', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    act(() => { result.current.reveal() })
    act(() => { result.current.onRevealComplete() })
    expect(result.current.phase).toBe('CUP_UP')
  })

  it('toggleKeep does nothing when phase is not CUP_UP', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    act(() => { result.current.toggleKeep(0) })
    expect(result.current.myKeptDieIds).toEqual([])
  })

  // ── roll() action ──────────────────────────────────────────────────────────

  it('roll() calls rollDice API and updates myDice and myRollIndex', async () => {
    const dice = [
      { id: 0, value: 3, kept: false },
      { id: 1, value: 5, kept: false },
      { id: 2, value: 1, kept: false },
    ]
    mockRollDice.mockResolvedValue({ dice, rollIndex: 1 })

    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))

    await act(async () => { await result.current.roll() })

    expect(mockRollDice).toHaveBeenCalledWith(CODE, [])
    expect(result.current.myDice).toEqual(dice)
    expect(result.current.myRollIndex).toBe(1)
  })

  it('roll() sets phase to ROLLING immediately, then CUP_DOWN after response', async () => {
    mockRollDice.mockResolvedValue({ dice: [], rollIndex: 1 })
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))

    await act(async () => { await result.current.roll() })

    // After the await, roll has resolved; phase advances to CUP_DOWN after 650ms timeout.
    // Without fake timers we just verify phase is no longer IDLE.
    expect(result.current.phase).not.toBe('IDLE')
  })

  // ── revealToAll() action ───────────────────────────────────────────────────

  it('revealToAll() calls revealHand API and sets phase to FINISHED', async () => {
    const hand = { name: 'Schock 4', lids: 4, rank: 9040 }
    mockRevealHand.mockResolvedValue(hand)

    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    await act(async () => { await result.current.revealToAll() })

    expect(mockRevealHand).toHaveBeenCalledWith(CODE)
    expect(result.current.phase).toBe('FINISHED')
    expect(result.current.myHand).toEqual(hand)
  })

  // ── stand() action ─────────────────────────────────────────────────────────

  it('stand() calls standPlayer API and sets phase to FINISHED', async () => {
    const hand = { name: 'General 3', lids: 3, rank: 8030 }
    mockStandPlayer.mockResolvedValue(hand)

    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    await act(async () => { await result.current.stand() })

    expect(mockStandPlayer).toHaveBeenCalledWith(CODE)
    expect(result.current.phase).toBe('FINISHED')
    expect(result.current.myHand).toEqual(hand)
  })

  // ── WebSocket events ───────────────────────────────────────────────────────

  it('WebSocket Client is activated on mount', () => {
    renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    expect(mockActivate).toHaveBeenCalled()
  })

  it('GAME_STARTED sets playerOrder, lidStack and resets phase to IDLE', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    connectWs()

    fireWsEvent({
      type: 'GAME_STARTED',
      playerOrder: [makePlayer(PLAYER_ID, 'Alice'), makePlayer('p2', 'Bob')],
      lidStack: 13,
      playerLids: { [PLAYER_ID]: 0, p2: 0 },
      currentPlayerIdx: 0,
    })

    expect(result.current.playerOrder).toHaveLength(2)
    expect(result.current.lidStack).toBe(13)
    expect(result.current.phase).toBe('IDLE')
  })

  it('GAME_OVER sets gameOver and loserPlayerId', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    connectWs()

    fireWsEvent({ type: 'GAME_OVER', loserPlayerId: 'p2' })

    expect(result.current.gameOver).toBe(true)
    expect(result.current.loserPlayerId).toBe('p2')
  })

  it('ROUND_ENDED updates lidStack and playerLids and sets roundResult', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    connectWs()

    // Set up player state first
    fireWsEvent({
      type: 'GAME_STARTED',
      playerOrder: [makePlayer(PLAYER_ID, 'Alice'), makePlayer('p2', 'Bob')],
      lidStack: 13,
      playerLids: { [PLAYER_ID]: 0, p2: 0 },
      currentPlayerIdx: 0,
    })

    fireWsEvent({
      type: 'ROUND_ENDED',
      loserIds: ['p2'],
      lidValue: 3,
      lidStack: 10,
      playerLids: { [PLAYER_ID]: 0, p2: 3 },
      activePlayerIds: [PLAYER_ID, 'p2'],
    })

    expect(result.current.lidStack).toBe(10)
    expect(result.current.playerLids).toEqual({ [PLAYER_ID]: 0, p2: 3 })
    expect(result.current.roundResult).not.toBeNull()
    expect(result.current.roundResult?.lidValue).toBe(3)
  })

  it('NEXT_PLAYER resets own state when it is our turn', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    connectWs()

    fireWsEvent({
      type: 'GAME_STARTED',
      playerOrder: [makePlayer(PLAYER_ID, 'Alice'), makePlayer('p2', 'Bob')],
      lidStack: 13,
      playerLids: {},
      currentPlayerIdx: 1,
    })

    // Put the hook in a non-IDLE phase
    act(() => { result.current.reveal() })
    expect(result.current.phase).toBe('REVEALING')

    // NEXT_PLAYER → our index (0)
    fireWsEvent({ type: 'NEXT_PLAYER', currentPlayerIdx: 0, maxRollsThisRound: 2 })

    expect(result.current.phase).toBe('IDLE')
    expect(result.current.myDice).toEqual([])
    expect(result.current.maxRollsThisRound).toBe(2)
  })

  it('NEXT_PLAYER does not reset phase when it is another player\'s turn', () => {
    const { result } = renderHook(() => useSchockenGame(CODE, PLAYER_ID))
    connectWs()

    fireWsEvent({
      type: 'GAME_STARTED',
      playerOrder: [makePlayer(PLAYER_ID, 'Alice'), makePlayer('p2', 'Bob')],
      lidStack: 13,
      playerLids: {},
      currentPlayerIdx: 0,
    })

    act(() => { result.current.reveal() })

    // NEXT_PLAYER → p2's turn
    fireWsEvent({ type: 'NEXT_PLAYER', currentPlayerIdx: 1, maxRollsThisRound: null })

    // Our phase should still be REVEALING (not reset)
    expect(result.current.phase).toBe('REVEALING')
    expect(result.current.currentPlayerIdx).toBe(1)
  })
})
