'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

/**
 * Shared state between CardDetailShell (topbar) and CardWorkspace (content).
 *
 * Uses a ref-based store (like the old CardBackContext) to avoid re-rendering
 * the entire tree when the breadcrumb label changes.
 */

interface CardShellSnapshot {
  /** Label shown as breadcrumb after the card title (e.g. "Chat", spec name). Null = card home. */
  breadcrumb: string | null
  /** Whether the card title should be a clickable link back to card home */
  titleClickable: boolean
  /** Handler to navigate back to card home (called when title is clicked) */
  goToCardHome: (() => void) | null
}

interface CardShellStore {
  subscribe: (cb: () => void) => () => void
  getSnapshot: () => CardShellSnapshot
  update: (partial: Partial<CardShellSnapshot>) => void
}

const DEFAULT_SNAPSHOT: CardShellSnapshot = {
  breadcrumb: null,
  titleClickable: false,
  goToCardHome: null,
}

function createCardShellStore(): CardShellStore {
  let snapshot = { ...DEFAULT_SNAPSHOT }
  const listeners = new Set<() => void>()

  return {
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getSnapshot() {
      return snapshot
    },
    update(partial) {
      const next = { ...snapshot, ...partial }
      if (
        next.breadcrumb === snapshot.breadcrumb &&
        next.titleClickable === snapshot.titleClickable &&
        next.goToCardHome === snapshot.goToCardHome
      ) {
        return
      }
      snapshot = next
      listeners.forEach((cb) => cb())
    },
  }
}

/** Separate context for the portal target element — uses React state to trigger re-renders. */
const PortalTargetContext = createContext<{
  target: HTMLDivElement | null
  setTarget: (el: HTMLDivElement | null) => void
}>({ target: null, setTarget: () => {} })

const CardShellStoreContext = createContext<CardShellStore>(
  createCardShellStore(),
)

export function CardShellStoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const storeRef = useRef<CardShellStore>(null)
  if (!storeRef.current) storeRef.current = createCardShellStore()
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null)
  const portalCtx = useMemo(
    () => ({ target: portalTarget, setTarget: setPortalTarget }),
    [portalTarget],
  )

  return (
    <CardShellStoreContext.Provider value={storeRef.current}>
      <PortalTargetContext.Provider value={portalCtx}>
        {children}
      </PortalTargetContext.Provider>
    </CardShellStoreContext.Provider>
  )
}

/** Read the current shell snapshot (breadcrumb, clickability). Used by CardDetailShell. */
export function useCardShell(): CardShellSnapshot {
  const store = useContext(CardShellStoreContext)
  const subscribe = useCallback(
    (cb: () => void) => store.subscribe(cb),
    [store],
  )
  const getSnapshot = useCallback(() => store.getSnapshot(), [store])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Callback ref for the topbar portal target div. Used by CardDetailShell.
 * Sets the DOM element in context so CardWorkspace can portal into it.
 */
export function useCardShellPortalCallbackRef(): (
  el: HTMLDivElement | null,
) => void {
  const { setTarget } = useContext(PortalTargetContext)
  return useCallback(
    (el: HTMLDivElement | null) => {
      setTarget(el)
    },
    [setTarget],
  )
}

/** Update the shell state. Used by CardWorkspace. */
export function useCardShellUpdate() {
  const store = useContext(CardShellStoreContext)
  return store.update
}

/** Get the portal target element. Used by CardWorkspace to createPortal into the topbar. */
export function useCardShellPortalTarget(): HTMLDivElement | null {
  return useContext(PortalTargetContext).target
}
