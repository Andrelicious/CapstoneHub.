import { createContext } from 'react'

export interface UserContextType {
  userId: string
  email: string
  role: 'student' | 'adviser' | 'admin'
  displayName: string
}

export const UserContext = createContext<UserContextType | null>(null)
