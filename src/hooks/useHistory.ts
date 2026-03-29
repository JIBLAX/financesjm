import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { SessionResult } from '../types'
import { supabase, supabaseConfigured } from '../lib/supabase'

const LOCAL_KEY = 'beactiv_history'
const MAX_LOCAL = 50

function loadLocal(): SessionResult[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') } catch { return [] }
}
function saveLocal(sessions: SessionResult[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions.slice(0, MAX_LOCAL)))
}

function rowToSession(r: any): SessionResult {
  return {
    id: r.id,
    mode: r.mode,
    date: r.date,
    totalTime: r.total_time,
    rounds: r.rounds,
    exercises: r.exercises,
    config: r.config,
  }
}

export function useHistory(user: User | null) {
  const [sessions, setSessions] = useState<SessionResult[]>(loadLocal)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user) return

    // 1. Fetch initial
    supabase
      .from('timer_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error || !data) return
        const mapped = data.map(rowToSession)
        setSessions(mapped)
        saveLocal(mapped)
      })

    // 2. Realtime — sync en temps réel entre appareils
    const channel = supabase
      .channel(`timer_sessions:${user.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'timer_sessions', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const newSession = rowToSession(payload.new)
          setSessions(prev => {
            if (prev.some(s => s.id === newSession.id)) return prev
            const next = [newSession, ...prev].slice(0, MAX_LOCAL)
            saveLocal(next)
            return next
          })
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'timer_sessions', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setSessions(prev => {
            const next = prev.filter(s => s.id !== payload.old.id)
            saveLocal(next)
            return next
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe(); channelRef.current = null }
  }, [user])

  const addSession = async (s: SessionResult) => {
    setSessions(prev => {
      const next = [s, ...prev].slice(0, MAX_LOCAL)
      saveLocal(next)
      return next
    })
    if (supabaseConfigured && supabase && user) {
      await supabase.from('timer_sessions').insert({
        id: s.id,
        user_id: user.id,
        mode: s.mode,
        date: s.date,
        total_time: s.totalTime,
        rounds: s.rounds,
        exercises: s.exercises,
        config: s.config,
      })
    }
  }

  const clearHistory = async () => {
    setSessions([])
    saveLocal([])
    if (supabaseConfigured && supabase && user) {
      await supabase.from('timer_sessions').delete().eq('user_id', user.id)
    }
  }

  return { sessions, addSession, clearHistory }
}
