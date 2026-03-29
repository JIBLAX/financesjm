import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'disabled'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      // Mode sans Supabase : localStorage uniquement
      setStatus('disabled')
      return
    }

    // Récupère la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setStatus(session?.user ? 'authenticated' : 'unauthenticated')
    })

    // Écoute les changements de session (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setStatus(session?.user ? 'authenticated' : 'unauthenticated')
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase non configuré') }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase non configuré') }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return { user, status, signIn, signUp, signOut }
}
