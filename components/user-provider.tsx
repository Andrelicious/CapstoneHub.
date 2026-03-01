'use client'

import { ReactNode } from 'react'
import { UserContext, UserContextType } from '@/lib/user-context'

interface UserProviderProps {
  children: ReactNode
  user: UserContextType
}

export function UserProvider({ children, user }: UserProviderProps) {
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  )
}
