'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Provides a DOM element in the topbar where child components can portal
 * content (e.g. status chip, properties button). CardDetailShell sets the
 * target via a callback ref; CardWorkspace reads it to createPortal.
 */

const TopbarPortalContext = createContext<{
  target: HTMLDivElement | null
  setTarget: (el: HTMLDivElement | null) => void
}>({ target: null, setTarget: () => {} })

export function TopbarPortalProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  const value = useMemo(() => ({ target, setTarget }), [target])
  return (
    <TopbarPortalContext.Provider value={value}>
      {children}
    </TopbarPortalContext.Provider>
  )
}

/** Callback ref for the portal target div. Used by CardDetailShell. */
export function useTopbarPortalCallbackRef(): (
  el: HTMLDivElement | null,
) => void {
  const { setTarget } = useContext(TopbarPortalContext)
  return useCallback(
    (el: HTMLDivElement | null) => {
      setTarget(el)
    },
    [setTarget],
  )
}

/** Read the portal target element. Used by TopbarCardActions. */
export function useTopbarPortalTarget(): HTMLDivElement | null {
  return useContext(TopbarPortalContext).target
}
