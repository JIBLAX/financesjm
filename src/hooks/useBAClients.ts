import { useState, useEffect } from 'react'
import { beActivClient as supabase } from '@/integrations/supabase/beActivClient'

export interface BAClient {
  id:          string
  nom:         string
  prenom:      string
  displayName: string
  offre:       string | null
  montant:     number | null
  profil_code: string | null
  date_rdv:    string | null
  is_client:   boolean
  sap_enabled: boolean
  group_id:    string | null
  group_name:  string | null
}

export function useBAClients() {
  const [clients, setClients] = useState<BAClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('be_activ_clients')
      .select('*')
      .eq('is_client', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('[useBAClients]', error.message, error.code)
          setLoading(false)
          return
        }
        setClients(
          ((data ?? []) as any[]).map(c => {
            const prenom      = c.prenom ?? c.Prenom ?? c['Prénom'] ?? ''
            const nom         = c.nom    ?? c.Nom    ?? ''
            const name        = c.name   ?? c.Name   ?? ''
            const displayName = (name || `${prenom} ${nom}`).trim()
            return {
              id:          c.id          ?? c.Id ?? '',
              nom,
              prenom,
              displayName,
              offre:       c.offre       ?? c.Offre       ?? null,
              montant:     c.montant     ?? c.Montant     ?? null,
              profil_code: c.profil_code ?? c.Profil_code ?? null,
              date_rdv:    c.date_rdv    ?? c.Date_rdv    ?? null,
              is_client:   c.is_client   ?? false,
              sap_enabled: c.sap_enabled ?? false,
              group_id:    c.group_id    ?? null,
              group_name:  c.group_name  ?? null,
            }
          }).filter(c => c.displayName && c.id)
        )
        setLoading(false)
      })
  }, [])

  return { clients, loading }
}
