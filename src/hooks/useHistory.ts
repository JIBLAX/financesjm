import { useState, useEffect } from 'react'
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

export function useHistory(user: User | null) {
  const [sessions, setSessions] = useState<SessionResult[]>(loadLocal)

  // Sync depuis Supabase au montage
  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user) return
    supabase
      .from('timer_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error || !data) return
        const mapped: SessionResult[] = data.map(r => ({
          id: r.id,
          mode: r.mode,
          date: r.date,
          totalTime: r.total_time,
          rounds: r.rounds,
          exercises: r.exercises,
          config: r.config,
        }))
        setSessions(mapped)
        saveLocal(mapped)
      })
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
