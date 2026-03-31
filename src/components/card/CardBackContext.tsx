'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type CardBackHandler = (() => void) | null

interface CardBackContextValue {
  handler: CardBackHandler
  setHandler: (h: CardBackHandler) => void
}

const CardBackContext = createContext<CardBackContextValue>({
  handler: null,
  setHandler: () => {},
})

export function CardBackStoreProvider({ children }: { children: React.ReactNode }) {
  const [handler, setHandler] = useState<CardBackHandler>(null)
  return (
    <CardBackContext.Provider value={{ handler, setHandler }}>
      {children}
    </CardBackContext.Provider>
  )
}

/** Called by CardWorkspace to register the current back handler */
export function useCardBackRegister(handler: CardBackHandler) {
  const { setHandler } = useContext(CardBackContext)
  useEffect(() => {
    setHandler(handler)
    return () => setHandler(null)
  }, [handler, setHandler])
}

/** Called by CardDetailShell to read the current back handler */
export function useCardBack(): CardBackHandler {
  return useContext(CardBackContext).handler
}
