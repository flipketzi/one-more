import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('framer-motion', () => import('../../../test/__mocks__/framer-motion'))

import { OpeningRoundOverlay } from './OpeningRoundOverlay'

function makePlayer(id: string, username: string) {
  return {
    id, username, avatar: 'avatar_beer',
    lids: 0, rollIndex: 0,
    revealed: false, standing: false, closed: false,
    hand: null, dice: null,
  }
}

const players = [makePlayer('a', 'Alice'), makePlayer('b', 'Bob')]
const openingRound = {
  throws: [
    { playerId: 'a', dice: [], hand: { name: '6-5-2', lids: 1, rank: 652 } },
    { playerId: 'b', dice: [], hand: { name: '5-3-2', lids: 1, rank: 532 } },
  ],
  loserIds: ['b'],
  lidValue: 1,
}

describe('OpeningRoundOverlay', () => {
  it('announces the opening round prominently', () => {
    render(<OpeningRoundOverlay openingRound={openingRound} players={players} gameOver={false} onDismiss={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Erster Hoch!' })).toBeInTheDocument()
  })

  it('renders every player throw', () => {
    render(<OpeningRoundOverlay openingRound={openingRound} players={players} gameOver={false} onDismiss={() => {}} />)
    expect(screen.getByText('6-5-2')).toBeInTheDocument()
    expect(screen.getByText('5-3-2')).toBeInTheDocument()
  })

  it('names the loser as starting player', () => {
    render(<OpeningRoundOverlay openingRound={openingRound} players={players} gameOver={false} onDismiss={() => {}} />)
    expect(screen.getByText(/nimmt/)).toHaveTextContent('Bob fängt an')
  })

  it('says the game is over instead of naming a starter when the opening decided the game', () => {
    render(<OpeningRoundOverlay openingRound={openingRound} players={players} gameOver={true} onDismiss={() => {}} />)
    expect(screen.getByText('Das Spiel ist sofort vorbei!')).toBeInTheDocument()
    expect(screen.getByText(/nimmt/)).not.toHaveTextContent('fängt an')
  })

  it('calls onDismiss from the button', () => {
    const onDismiss = vi.fn()
    render(<OpeningRoundOverlay openingRound={openingRound} players={players} gameOver={false} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: "Los geht's!" }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
