'use client'

import { createContext, useCallback, useContext, useRef, useSyncExternalStore } from 'react'

type CardBackHandler = (() => void) | null

interface CardBackStore {
  handler: CardBackHandler
  subscribe: (cb: () => void) => () => void
  getSnapshot: () => CardBackHandler
  setHandler: (h: CardBackHandler) => void
}

function createCardBackStore(): CardBackStore {
  let handler: CardBackHandler = null
  const listeners = new Set<() => void>()
  return {
    get handler() { return handler },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getSnapshot() { return handler },
    setHandler(h) {
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

/** Called by CardWorkspace to register the current back handler */
export function useCardBackRegister(handler: CardBackHandler) {
  const store = useContext(CardBackStoreContext)
  const prev = useRef(handler)
  if (prev.current !== handler) {
    prev.current = handler
    store.setHandler(handler)
  }
  // Set on first render too
  const initialized = useRef(false)
  if (!initialized.current) {
    initialized.current = true
    store.setHandler(handler)
  }
}

/** Called by CardDetailShell to read the current back handler */
export function useCardBack(): CardBackHandler {
  const store = useContext(CardBackStoreContext)
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
