'use client'

import { createContext, useContext } from 'react'

type CardBackHandler = (() => void) | null

const CardBackContext = createContext<CardBackHandler>(null)

export function CardBackProvider({
  onBack,
  children,
}: {
  onBack: CardBackHandler
  children: React.ReactNode
}) {
  return (
    <CardBackContext.Provider value={onBack}>
      {children}
    </CardBackContext.Provider>
  )
}

export function useCardBack(): CardBackHandler {
  return useContext(CardBackContext)
}
