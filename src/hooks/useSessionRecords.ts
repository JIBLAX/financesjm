import { useState, useEffect, useRef } from 'react'
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

function rowToRecord(r: any): SessionRecord {
  return {
    id: r.id,
    date: r.date,
    mode: r.mode,
    totalTime: r.total_time,
    rounds: r.rounds,
    notes: r.notes ?? '',
    participants: (r.participant_scores ?? []).map((ps: any): ParticipantScore => ({
      clientId: ps.client_id ?? '',
      score: ps.score,
    })),
  }
}

export function useSessionRecords(user: User | null) {
  const [records, setRecords] = useState<SessionRecord[]>(loadLocal)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user) return

    // 1. Fetch initial avec participant_scores joinés
    supabase
      .from('session_records')
      .select('*, participant_scores(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return
        const mapped = data.map(rowToRecord)
        setRecords(mapped)
        saveLocal(mapped)
      })

    // 2. Realtime sur session_records (INSERT / DELETE)
    //    Pour les updates complexes (avec participant_scores), on refetch complet
    const channel = supabase
      .channel(`session_records:${user.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'session_records', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          // On refetch ce record avec ses participant_scores
          supabase!
            .from('session_records')
            .select('*, participant_scores(*)')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (!data) return
              const newRecord = rowToRecord(data)
              setRecords(prev => {
                if (prev.some(r => r.id === newRecord.id)) return prev
                const next = [newRecord, ...prev]
                saveLocal(next)
                return next
              })
            })
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'session_records', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setRecords(prev => {
            const next = prev.filter(r => r.id !== payload.old.id)
            saveLocal(next)
            return next
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe(); channelRef.current = null }
  }, [user])

  const addRecord = async (record: Omit<SessionRecord, 'id'>) => {
    const newRecord: SessionRecord = { ...record, id: crypto.randomUUID() }

    // Update optimiste local
    setRecords(prev => { const next = [newRecord, ...prev]; saveLocal(next); return next })

    if (supabaseConfigured && supabase && user) {
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
      // Realtime diffuse l'INSERT aux autres appareils
    }
  }

  const removeRecord = async (id: string) => {
    setRecords(prev => { const next = prev.filter(r => r.id !== id); saveLocal(next); return next })
    if (supabaseConfigured && supabase && user) {
      await supabase.from('session_records').delete().eq('id', id)
    }
  }

  return { records, addRecord, removeRecord }
}
