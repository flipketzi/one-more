import { render, screen } from '@testing-library/react'
import { ReactNode } from 'react'

vi.mock('framer-motion', () => import('../../../test/__mocks__/framer-motion'))

import { LocaleProvider } from '../../../context/LocaleContext'
import { SipNotificationOverlay } from './SipNotificationOverlay'

const renderOverlay = (props: { isMe: boolean; isSelfPick: boolean }) =>
  render(
    <SipNotificationOverlay targetUsername="Ben" assignedByUsername="Anna" onDismiss={() => {}} {...props} />,
    { wrapper: ({ children }: { children: ReactNode }) => <LocaleProvider>{children}</LocaleProvider> },
  )

describe('SipNotificationOverlay', () => {
  beforeEach(() => localStorage.setItem('onemore_locale', 'de'))

  it('tells the target who made them drink', () => {
    renderOverlay({ isMe: true, isSelfPick: false })
    expect(screen.getByText('TRINK!')).toBeInTheDocument()
    expect(screen.getByText('Anna sagt: du trinkst!')).toBeInTheDocument()
  })

  it('omits the assigner when the drawer picked themselves', () => {
    renderOverlay({ isMe: true, isSelfPick: true })
    expect(screen.getByText('TRINK!')).toBeInTheDocument()
    expect(screen.queryByText(/sagt: du trinkst/)).not.toBeInTheDocument()
  })

  it('tells everyone else who drinks', () => {
    renderOverlay({ isMe: false, isSelfPick: false })
    expect(screen.getByText('Ben trinkt!')).toBeInTheDocument()
  })
})
