import { useState, useEffect } from 'react'
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

export function useClients(user: User | null) {
  const [clients, setClients] = useState<Client[]>(loadLocal)
  const [synced, setSynced] = useState(false)

  // Sync depuis Supabase au montage (si connecté)
  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user) return
    supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return
        const mapped: Client[] = data.map(r => ({
          id: r.id,
          firstName: r.first_name,
          lastName: r.last_name,
          createdAt: r.created_at,
        }))
        setClients(mapped)
        saveLocal(mapped)
        setSynced(true)
      })
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

    // Optimistic local update
    setClients(prev => {
      const next = [client, ...prev]
      saveLocal(next)
      return next
    })

    // Sync Supabase en arrière-plan
    if (supabaseConfigured && supabase && user) {
      const { data } = await supabase.from('clients').insert({
        id: client.id,
        user_id: user.id,
        first_name: trimFirst,
        last_name: trimLast,
        created_at: client.createdAt,
      }).select().single()

      if (data) {
        // Met à jour l'id avec celui retourné (identique ici, mais bonne pratique)
        setClients(prev => {
          const next = prev.map(c => c.id === client.id ? { ...c, id: data.id } : c)
          saveLocal(next)
          return next
        })
      }
    }
  }

  const removeClient = async (id: string) => {
    setClients(prev => {
      const next = prev.filter(c => c.id !== id)
      saveLocal(next)
      return next
    })
    if (supabaseConfigured && supabase && user) {
      await supabase.from('clients').delete().eq('id', id)
    }
  }

  return { clients, addClient, removeClient, synced }
}
