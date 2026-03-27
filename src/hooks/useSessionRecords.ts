import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { SessionRecord, ParticipantScore } from '../types'
import { supabase, supabaseConfigured } from '../lib/supabase'

const LOCAL_KEY = 'beactiv_session_records'

function loadLocal(): SessionRecord[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') } catch { return [] }
}
function saveLocal(records: SessionRecord[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records))
}

export function useSessionRecords(user: User | null) {
  const [records, setRecords] = useState<SessionRecord[]>(loadLocal)

  // Sync depuis Supabase au montage
  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user) return
    supabase
      .from('session_records')
      .select('*, participant_scores(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return
        const mapped: SessionRecord[] = data.map(r => ({
          id: r.id,
          date: r.date,
          mode: r.mode,
          totalTime: r.total_time,
          rounds: r.rounds,
          notes: r.notes,
          participants: (r.participant_scores ?? []).map((ps: any): ParticipantScore => ({
            clientId: ps.client_id ?? '',
            score: ps.score,
          })),
        }))
        setRecords(mapped)
        saveLocal(mapped)
      })
  }, [user])

  const addRecord = async (record: Omit<SessionRecord, 'id'>) => {
    const newRecord: SessionRecord = { ...record, id: crypto.randomUUID() }

    setRecords(prev => {
      const next = [newRecord, ...prev]
      saveLocal(next)
      return next
    })

    if (supabaseConfigured && supabase && user) {
      // Insère le session_record
      const { data: inserted } = await supabase.from('session_records').insert({
        id: newRecord.id,
        user_id: user.id,
        date: record.date,
        mode: record.mode,
        total_time: record.totalTime,
        rounds: record.rounds,
        notes: record.notes,
      }).select().single()

      if (inserted && record.participants.length > 0) {
        await supabase.from('participant_scores').insert(
          record.participants.map(p => ({
            session_record_id: inserted.id,
            client_id: p.clientId || null,
            score: p.score,
          }))
        )
      }
    }
  }

  const removeRecord = async (id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id)
      saveLocal(next)
      return next
    })
    if (supabaseConfigured && supabase && user) {
      await supabase.from('session_records').delete().eq('id', id)
    }
  }

  return { records, addRecord, removeRecord }
}
