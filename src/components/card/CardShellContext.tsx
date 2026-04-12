'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { TopbarPortalProvider } from './TopbarPortalContext'

/**
 * Shared navigation state between CardDetailShell (topbar) and
 * CardWorkspace (content). Values only change on view navigation events.
 */

interface CardShellState {
  /** Label shown as breadcrumb after the card title (e.g. "Chat", spec name). Null = card home. */
  breadcrumb: string | null
  /** Whether the card title should be a clickable link back to card home */
  titleClickable: boolean
  /** Handler to navigate back to card home (called when title is clicked) */
  goToCardHome: (() => void) | null
}

type CardShellUpdater = (partial: Partial<CardShellState>) => void

const DEFAULT_STATE: CardShellState = {
  breadcrumb: null,
  titleClickable: false,
  goToCardHome: null,
}

const CardShellStateContext = createContext<CardShellState>(DEFAULT_STATE)
const CardShellUpdaterContext = createContext<CardShellUpdater>(() => {})

export function CardShellStoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, setState] = useState<CardShellState>(DEFAULT_STATE)
  const update: CardShellUpdater = useMemo(
    () => (partial) => setState((prev) => ({ ...prev, ...partial })),
    [],
  )

  return (
    <CardShellStateContext.Provider value={state}>
      <CardShellUpdaterContext.Provider value={update}>
        <TopbarPortalProvider>{children}</TopbarPortalProvider>
      </CardShellUpdaterContext.Provider>
    </CardShellStateContext.Provider>
  )
}

/** Read the current shell state (breadcrumb, clickability). Used by CardDetailShell. */
export function useCardShell(): CardShellState {
  return useContext(CardShellStateContext)
}

/** Update the shell state. Used by CardWorkspace. */
export function useCardShellUpdate(): CardShellUpdater {
  return useContext(CardShellUpdaterContext)
}
