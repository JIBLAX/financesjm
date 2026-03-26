import { useState } from 'react'
import type { Client } from '../types'

const STORAGE_KEY = 'beactiv_clients'

function load(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function save(clients: Client[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>(load)

  const addClient = (firstName: string, lastName: string) => {
    const client: Client = {
      id: crypto.randomUUID(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      createdAt: new Date().toISOString(),
    }
    setClients(prev => {
      const next = [client, ...prev]
      save(next)
      return next
    })
  }

  const removeClient = (id: string) => {
    setClients(prev => {
      const next = prev.filter(c => c.id !== id)
      save(next)
      return next
    })
  }

  return { clients, addClient, removeClient }
}
