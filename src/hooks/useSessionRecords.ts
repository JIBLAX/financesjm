import { useState } from 'react'
import type { SessionRecord } from '../types'

const STORAGE_KEY = 'beactiv_session_records'

function load(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function save(records: SessionRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function useSessionRecords() {
  const [records, setRecords] = useState<SessionRecord[]>(load)

  const addRecord = (record: Omit<SessionRecord, 'id'>) => {
    const newRecord: SessionRecord = { ...record, id: crypto.randomUUID() }
    setRecords(prev => {
      const next = [newRecord, ...prev]
      save(next)
      return next
    })
  }

  const removeRecord = (id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id)
      save(next)
      return next
    })
  }

  return { records, addRecord, removeRecord }
}
