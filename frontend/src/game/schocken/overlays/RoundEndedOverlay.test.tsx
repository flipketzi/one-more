import React from 'react'
import { render, screen } from '@testing-library/react'

vi.mock('framer-motion', () => import('../../../test/__mocks__/framer-motion'))

import { RoundEndedOverlay } from './RoundEndedOverlay'

describe('RoundEndedOverlay', () => {
  it('renders nothing when roundResult is null', () => {
    const { container } = render(<RoundEndedOverlay roundResult={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders loser name', () => {
    render(<RoundEndedOverlay roundResult={{ loserName: 'Bob', winnerHandName: 'Schock 4', lidValue: 4 }} />)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders winning hand name', () => {
    render(<RoundEndedOverlay roundResult={{ loserName: 'Bob', winnerHandName: 'Schock Out', lidValue: 13 }} />)
    expect(screen.getByText('Schock Out')).toBeInTheDocument()
  })

  it('renders lid count', () => {
    render(<RoundEndedOverlay roundResult={{ loserName: 'Alice', winnerHandName: 'Jule', lidValue: 7 }} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('renders "Rundenende" label', () => {
    render(<RoundEndedOverlay roundResult={{ loserName: 'Alice', winnerHandName: 'Jule', lidValue: 7 }} />)
    expect(screen.getByText('Rundenende')).toBeInTheDocument()
  })
})
