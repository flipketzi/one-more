import React from 'react'
import { render, screen } from '@testing-library/react'

vi.mock('framer-motion', () => import('../../../test/__mocks__/framer-motion'))

import { HandLabel } from './HandLabel'

describe('HandLabel', () => {
  it('renders the hand name', () => {
    render(<HandLabel hand={{ name: 'Schock Out', lids: 13, rank: 10000 }} />)
    expect(screen.getByText('Schock Out')).toBeInTheDocument()
  })

  it('renders "1 Deckel" for lids=1', () => {
    render(<HandLabel hand={{ name: '6-5-3', lids: 1, rank: 653 }} />)
    expect(screen.getByText('1 Deckel')).toBeInTheDocument()
  })

  it('renders "4 Deckel" for lids=4', () => {
    render(<HandLabel hand={{ name: 'Schock 4', lids: 4, rank: 9040 }} />)
    expect(screen.getByText('4 Deckel')).toBeInTheDocument()
  })

  it('applies amber badge class for rank >= 9000 (Schock)', () => {
    render(<HandLabel hand={{ name: 'Schock 4', lids: 4, rank: 9040 }} />)
    const badge = screen.getByText('4 Deckel')
    expect(badge.className).toContain('amber')
  })

  it('applies violet badge class for rank >= 8000 (General/Jule)', () => {
    render(<HandLabel hand={{ name: 'Jule', lids: 7, rank: 8700 }} />)
    const badge = screen.getByText('7 Deckel')
    expect(badge.className).toContain('violet')
  })

  it('applies blue badge class for rank >= 7100 (Straße)', () => {
    render(<HandLabel hand={{ name: 'Straße 1-2-3', lids: 2, rank: 7400 }} />)
    const badge = screen.getByText('2 Deckel')
    expect(badge.className).toContain('blue')
  })

  it('applies slate badge class for normal hand', () => {
    render(<HandLabel hand={{ name: '6-5-3', lids: 1, rank: 653 }} />)
    const badge = screen.getByText('1 Deckel')
    expect(badge.className).toContain('slate')
  })
})
