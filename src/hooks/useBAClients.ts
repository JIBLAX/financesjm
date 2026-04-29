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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Source principale : be_activ_clients (rempli par BILAN CRM via saveToSupabase).
    // clients_pro est un complément éventuel ; ne pas le privilégier seul (liste vide ou partielle).
    supabase
      .from('be_activ_clients')
      .select('*')
      .eq('is_client', true)
      .order('name', { ascending: true })
      .then(({ data, error: err }) => {
        if (err || data == null) {
          console.error('[useBAClients]', err?.message, err?.code)
          setError('Impossible de charger les clients BE ACTIV')
          setLoading(false)
          return
        }
        setError(null)
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
              is_client:   c.is_client   ?? true,
              sap_enabled: c.sap_enabled ?? false,
              group_id:    c.group_id    ?? null,
              group_name:  c.group_name  ?? null,
            }
          }).filter(c => c.displayName && c.id)
        )
        setLoading(false)
      })
  }, [])

  return { clients, loading, error }
}
