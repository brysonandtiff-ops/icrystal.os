import { createContext } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'

export interface AuthContextValue {
  user: SupabaseUser | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})
