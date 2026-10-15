import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('framer-motion', () => import('../../../test/__mocks__/framer-motion'))

import { DiceCup } from './DiceCup'

describe('DiceCup', () => {
  it('lifts the cup with Enter or Space', () => {
    const onReveal = vi.fn()
    render(<DiceCup revealing={false} onReveal={onReveal} onRevealComplete={() => {}} />)
    const cup = screen.getByRole('button', { name: 'Becher heben' })
    fireEvent.keyDown(cup, { key: 'Enter' })
    fireEvent.keyDown(cup, { key: ' ' })
    expect(onReveal).toHaveBeenCalledTimes(2)
  })

  it('ignores other keys', () => {
    const onReveal = vi.fn()
    render(<DiceCup revealing={false} onReveal={onReveal} onRevealComplete={() => {}} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Becher heben' }), { key: 'a' })
    expect(onReveal).not.toHaveBeenCalled()
  })

  it('does not lift again while the cup is already lifting', () => {
    const onReveal = vi.fn()
    render(<DiceCup revealing={true} onReveal={onReveal} onRevealComplete={() => {}} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Becher heben' }), { key: 'Enter' })
    expect(onReveal).not.toHaveBeenCalled()
  })
})
