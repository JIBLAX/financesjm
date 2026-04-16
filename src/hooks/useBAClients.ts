import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface BAClient {
  id: string
  nom: string
  prenom: string
  displayName: string
}

/**
 * Fetches active clients from the shared `be_activ_clients` table.
 */
export function useBAClients() {
  const [clients, setClients] = useState<BAClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('be_activ_clients')
      .select('id, nom, prenom')
      .order('nom')
      .then(({ data }) => {
        setClients(
          (data ?? []).map(c => ({
            id: c.id,
            nom: c.nom ?? '',
            prenom: c.prenom ?? '',
            displayName: `${c.prenom ?? ''} ${c.nom ?? ''}`.trim(),
          }))
        )
        setLoading(false)
      })
  }, [])

  return { clients, loading }
}
