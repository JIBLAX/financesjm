import { useState, useEffect } from 'react'
import type { SessionResult } from '../types'

const STORAGE_KEY = 'beactiv_history'

export function useHistory() {
  const [sessions, setSessions] = useState<SessionResult[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  const addSession = (s: SessionResult) => setSessions(prev => [s, ...prev].slice(0, 50))
  const clearHistory = () => setSessions([])

  return { sessions, addSession, clearHistory }
}
