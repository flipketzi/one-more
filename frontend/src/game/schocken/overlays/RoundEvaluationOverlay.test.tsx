import { render, screen, within } from '@testing-library/react'

vi.mock('framer-motion', () => import('../../../test/__mocks__/framer-motion'))

import { RoundEvaluationOverlay } from './RoundEvaluationOverlay'

function makeRevealedPlayer(id: string, username: string, values: number[], handName: string, rank: number) {
  return {
    id, username, avatar: 'avatar_beer',
    lids: 0, rollIndex: 3,
    revealed: true, standing: false, closed: false,
    hand: { name: handName, lids: 1, rank },
    dice: values.map((value, i) => ({ id: i, value, kept: false })),
  }
}

const evaluation = {
  players: [
    makeRevealedPlayer('a', 'Alice', [2, 6, 4], '6-4-2', 642),
    makeRevealedPlayer('b', 'Bob', [1, 2, 3], 'Straße', 7300),
  ],
  result: { loserName: 'Alice', winnerHandName: 'Straße', lidValue: 2 },
}

describe('RoundEvaluationOverlay', () => {
  it('shows the evaluating heading with a progress bar', () => {
    render(<RoundEvaluationOverlay evaluation={evaluation} playerId="a" />)
    expect(screen.getByRole('heading', { name: 'Wertet aus…' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Auswertung' })).toBeInTheDocument()
  })

  it('shows the own dice as die faces, highest first, with the own hand', () => {
    render(<RoundEvaluationOverlay evaluation={evaluation} playerId="a" />)
    const dice = screen.getAllByRole('img', { name: /^Würfel/ }).map(el => el.getAttribute('aria-label'))
    expect(dice).toEqual(['Würfel 6', 'Würfel 4', 'Würfel 2'])
    expect(screen.getByText('Dein Wurf')).toBeInTheDocument()
    expect(screen.getByText('6-4-2')).toBeInTheDocument()
  })

  it('lists only the other players with their throws', () => {
    render(<RoundEvaluationOverlay evaluation={evaluation} playerId="a" />)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByText('Bob')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Straße')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('does not reveal the round result yet', () => {
    render(<RoundEvaluationOverlay evaluation={evaluation} playerId="a" />)
    expect(screen.queryByText(/trinkt/)).not.toBeInTheDocument()
  })

  it('omits the own section for a player without a throw in the round', () => {
    render(<RoundEvaluationOverlay evaluation={evaluation} playerId="spectator" />)
    expect(screen.queryByText('Dein Wurf')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
