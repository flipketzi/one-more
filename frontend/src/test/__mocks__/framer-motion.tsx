import React from 'react'

type AnyProps = Record<string, unknown> & { children?: React.ReactNode }

// Strips all framer-motion-specific props and renders the plain HTML element
export const motion = new Proxy({} as Record<string, React.FC<AnyProps>>, {
  get: (_, tag: string) =>
    ({ children, initial, animate, exit, transition, whileTap, whileHover, layout, ...rest }: AnyProps) => {
      void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout
      return React.createElement(tag, rest, children)
    },
})

export const AnimatePresence: React.FC<{ children?: React.ReactNode }> =
  ({ children }) => <>{children}</>
