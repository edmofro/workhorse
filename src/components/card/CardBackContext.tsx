'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

type CardBackHandler = (() => void) | null

/**
 * Ref-based store for the back-button handler. The store lives in a ref so the
 * context value never changes — this avoids cascading re-renders of every
 * consumer when the handler updates. Consumers read via useSyncExternalStore
 * which only re-renders when the snapshot (handler) actually changes.
 */
interface CardBackStore {
  subscribe: (cb: () => void) => () => void
  getSnapshot: () => CardBackHandler
  setHandler: (h: CardBackHandler) => void
}

function createCardBackStore(): CardBackStore {
  let handler: CardBackHandler = null
  const listeners = new Set<() => void>()
  return {
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getSnapshot() {
      return handler
    },
    setHandler(h) {
      if (h === handler) return // no-op, avoid unnecessary notifications
      handler = h
      listeners.forEach((cb) => cb())
    },
  }
}

const CardBackStoreContext = createContext<CardBackStore>(createCardBackStore())

export function CardBackStoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<CardBackStore>(null)
  if (!storeRef.current) storeRef.current = createCardBackStore()
  return (
    <CardBackStoreContext.Provider value={storeRef.current}>
      {children}
    </CardBackStoreContext.Provider>
  )
}

/** Called by CardWorkspace to register the current back handler. */
export function useCardBackRegister(handler: CardBackHandler) {
  const store = useContext(CardBackStoreContext)
  useEffect(() => {
    store.setHandler(handler)
    return () => store.setHandler(null)
  }, [store, handler])
}

/** Called by CardDetailShell to read the current back handler. */
export function useCardBack(): CardBackHandler {
  const store = useContext(CardBackStoreContext)
  const subscribe = useCallback(
    (cb: () => void) => store.subscribe(cb),
    [store],
  )
  const getSnapshot = useCallback(() => store.getSnapshot(), [store])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
