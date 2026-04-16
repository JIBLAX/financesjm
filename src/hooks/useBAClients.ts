import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface BAClient {
  id: string
  nom: string
  prenom: string
  displayName: string
}

export function useBAClients() {
  const [clients, setClients] = useState<BAClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('be_activ_clients')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('[useBAClients]', error.message, error.code)
          setLoading(false)
          return
        }
        setClients(
          ((data ?? []) as any[]).map(c => {
            const prenom = c.prenom ?? c.Prenom ?? c['Prénom'] ?? ''
            const nom    = c.nom    ?? c.Nom    ?? ''
            const name   = c.name   ?? c.Name   ?? ''
            const displayName = (name || `${prenom} ${nom}`).trim()
            return { id: c.id ?? c.Id, nom, prenom, displayName }
          }).filter(c => c.displayName && c.id)
        )
        setLoading(false)
      })
  }, [])

  return { clients, loading }
}
