import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('framer-motion', () => import('../../../test/__mocks__/framer-motion'))

import { DiceDisplay } from './DiceDisplay'
import { Die } from '../types'

function makeDie(id: number, value: number, kept = false): Die {
  return { id, value, kept }
}

describe('DiceDisplay', () => {
  it('renders active dice as buttons', () => {
    const dice = [makeDie(0, 3), makeDie(1, 5), makeDie(2, 1)]
    render(<DiceDisplay dice={dice} rolling={false} canToggle={false} onToggle={() => {}} />)
    // 3 buttons for the 3 active dice
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('moves kept dice into the Beiseitegelegt section', () => {
    const dice = [makeDie(0, 3, true), makeDie(1, 5), makeDie(2, 1)]
    render(<DiceDisplay dice={dice} rolling={false} canToggle={false} onToggle={() => {}} />)
    expect(screen.getByText('Beiseitegelegt')).toBeInTheDocument()
    // 2 active + 1 kept = 3 buttons total
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('does not show Beiseitegelegt section when no dice are kept', () => {
    const dice = [makeDie(0, 3), makeDie(1, 5)]
    render(<DiceDisplay dice={dice} rolling={false} canToggle={false} onToggle={() => {}} />)
    expect(screen.queryByText('Beiseitegelegt')).not.toBeInTheDocument()
  })

  it('calls onToggle with die id when canToggle=true and die is clicked', async () => {
    const onToggle = vi.fn()
    const dice = [makeDie(0, 4), makeDie(1, 2), makeDie(2, 6)]
    render(<DiceDisplay dice={dice} rolling={false} canToggle={true} onToggle={onToggle} />)
    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[0])
    expect(onToggle).toHaveBeenCalledWith(0)
  })

  it('does not call onToggle when canToggle=false', async () => {
    const onToggle = vi.fn()
    const dice = [makeDie(0, 4)]
    render(<DiceDisplay dice={dice} rolling={false} canToggle={false} onToggle={onToggle} />)
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('does not call onToggle while rolling', async () => {
    const onToggle = vi.fn()
    const dice = [makeDie(0, 4)]
    render(<DiceDisplay dice={dice} rolling={true} canToggle={true} onToggle={onToggle} />)
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onToggle).not.toHaveBeenCalled()
  })
})
