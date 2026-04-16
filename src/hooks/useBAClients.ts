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
      .select('id, name, nom, prenom')
      .order('name')
      .then(({ data, error }) => {
        if (error) console.error('[useBAClients]', error.message)
        setClients(
          ((data ?? []) as any[]).map(c => {
            const prenom = c.prenom ?? c.Prenom ?? ''
            const nom    = c.nom    ?? c.Nom    ?? ''
            const displayName = (c.name ?? c.Name ?? `${prenom} ${nom}`).trim()
            return { id: c.id, nom, prenom, displayName }
          }).filter(c => c.displayName)
        )
        setLoading(false)
      })
  }, [])

  return { clients, loading }
}
