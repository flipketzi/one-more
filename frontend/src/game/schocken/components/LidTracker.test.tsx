import React from 'react'
import { render, screen } from '@testing-library/react'
import { LidTracker } from './LidTracker'
import { PublicPlayerState } from '../types'

function makePlayer(overrides: Partial<PublicPlayerState> = {}): PublicPlayerState {
  return {
    id: 'p1',
    username: 'Alice',
    avatar: 'avatar_beer',
    lids: 3,
    rollIndex: 0,
    revealed: false,
    standing: false,
    hand: null,
    dice: null,
    ...overrides,
  }
}

describe('LidTracker', () => {
  it('renders the stack size', () => {
    render(<LidTracker playerOrder={[]} lidStack={13} currentPlayerIdx={0} />)
    expect(screen.getByText('13')).toBeInTheDocument()
  })

  it('renders all player usernames', () => {
    const players = [
      makePlayer({ id: 'p1', username: 'Alice' }),
      makePlayer({ id: 'p2', username: 'Bob' }),
    ]
    render(<LidTracker playerOrder={players} lidStack={10} currentPlayerIdx={0} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders lid count for each player', () => {
    const players = [
      makePlayer({ id: 'p1', username: 'Alice', lids: 5 }),
    ]
    render(<LidTracker playerOrder={players} lidStack={8} currentPlayerIdx={0} />)
    // "5 Deckel" appears in the player tile
    expect(screen.getAllByText('5 Deckel').length).toBeGreaterThan(0)
  })

  it('applies active highlight to the current player', () => {
    const players = [
      makePlayer({ id: 'p1', username: 'Alice' }),
      makePlayer({ id: 'p2', username: 'Bob' }),
    ]
    render(<LidTracker playerOrder={players} lidStack={10} currentPlayerIdx={1} />)
    // The tile for Bob (idx 1) should have the amber class
    const bobTile = screen.getByText('Bob').closest('div[class*="amber"]')
    expect(bobTile).toBeInTheDocument()
  })

  it('applies reduced opacity to eliminated players (lids=0, not current)', () => {
    const players = [
      makePlayer({ id: 'p1', username: 'Alice', lids: 3 }),
      makePlayer({ id: 'p2', username: 'Bob', lids: 0 }),
    ]
    render(<LidTracker playerOrder={players} lidStack={10} currentPlayerIdx={0} />)
    const bobTile = screen.getByText('Bob').closest('div[class*="opacity"]')
    expect(bobTile).toBeInTheDocument()
  })
})
