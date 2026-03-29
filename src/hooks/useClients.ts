import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Client } from '../types'
import { supabase, supabaseConfigured } from '../lib/supabase'

const LOCAL_KEY = 'beactiv_clients'

function loadLocal(): Client[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') } catch { return [] }
}
function saveLocal(clients: Client[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(clients))
}

function rowToClient(r: any): Client {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    createdAt: r.created_at,
  }
}

export function useClients(user: User | null) {
  const [clients, setClients] = useState<Client[]>(loadLocal)
  const [synced, setSynced] = useState(false)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user) return

    // 1. Fetch initial depuis Supabase
    supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return
        const mapped = data.map(rowToClient)
        setClients(mapped)
        saveLocal(mapped)
        setSynced(true)
      })

    // 2. Realtime — propage INSERT / UPDATE / DELETE aux autres appareils instantanément
    const channel = supabase
      .channel(`clients:${user.id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'clients', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newClient = rowToClient(payload.new)
            setClients(prev => {
              if (prev.some(c => c.id === newClient.id)) return prev // évite doublon optimistic
              const next = [newClient, ...prev]
              saveLocal(next)
              return next
            })
          } else if (payload.eventType === 'DELETE') {
            setClients(prev => {
              const next = prev.filter(c => c.id !== payload.old.id)
              saveLocal(next)
              return next
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToClient(payload.new)
            setClients(prev => {
              const next = prev.map(c => c.id === updated.id ? updated : c)
              saveLocal(next)
              return next
            })
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe(); channelRef.current = null }
  }, [user])

  const addClient = async (firstName: string, lastName: string) => {
    const trimFirst = firstName.trim()
    const trimLast = lastName.trim()
    if (!trimFirst && !trimLast) return

    const client: Client = {
      id: crypto.randomUUID(),
      firstName: trimFirst,
      lastName: trimLast,
      createdAt: new Date().toISOString(),
    }

    // Update optimiste local
    setClients(prev => { const next = [client, ...prev]; saveLocal(next); return next })

    if (supabaseConfigured && supabase && user) {
      await supabase.from('clients').insert({
        id: client.id,
        user_id: user.id,
        first_name: trimFirst,
        last_name: trimLast,
        created_at: client.createdAt,
      })
      // Realtime diffuse l'INSERT aux autres appareils automatiquement
    }
  }

  const removeClient = async (id: string) => {
    setClients(prev => { const next = prev.filter(c => c.id !== id); saveLocal(next); return next })
    if (supabaseConfigured && supabase && user) {
      await supabase.from('clients').delete().eq('id', id)
    }
  }

  return { clients, addClient, removeClient, synced }
}
