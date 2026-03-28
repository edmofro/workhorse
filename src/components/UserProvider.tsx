'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { UserSetup } from './UserSetup'

interface UserData {
  id: string
  displayName: string
}

interface UserContextValue {
  user: UserData
  setUser: (user: UserData) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}

interface UserProviderProps {
  initialUser: UserData | null
  children: ReactNode
}

export function UserProvider({ initialUser, children }: UserProviderProps) {
  const [user, setUserState] = useState<UserData | null>(initialUser)

  const setUser = useCallback((u: UserData) => {
    setUserState(u)
  }, [])

  if (!user) {
    return <UserSetup onComplete={setUser} />
  }

  return (
    <UserContext value={{ user, setUser }}>
      {children}
    </UserContext>
  )
}
