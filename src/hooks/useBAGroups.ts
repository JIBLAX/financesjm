import { useState, useEffect } from 'react'
import { beActivClient as supabase } from '@/integrations/supabase/beActivClient'
import type { BAClient } from './useBAClients'

export interface BAGroup {
  group_id:   string
  group_name: string | null
  members:    BAClient[]
}

export function useBAGroups() {
  const [groups, setGroups] = useState<BAGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('clients_pro')
      .select('*')
      .not('group_id', 'is', null)
      .order('name', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) { console.error('[useBAGroups]', err.message); setError('Impossible de charger les groupes'); setLoading(false); return }
        setError(null)
        if (!data) { setLoading(false); return }
        const byGroup = new Map<string, BAGroup>()
        ;(data as any[]).forEach(c => {
          const gid = String(c.group_id ?? '')
          if (!gid) return
          const name = c.name ?? `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
          const member: BAClient = {
            id:          c.id          ?? '',
            nom:         c.nom         ?? '',
            prenom:      c.prenom      ?? '',
            displayName: name,
            offre:       c.offre       ?? null,
            montant:     c.montant     ?? null,
            profil_code: c.profil_code ?? null,
            date_rdv:    c.date_rdv    ?? null,
            is_client:   c.is_client   ?? true,
            sap_enabled: c.sap_enabled ?? false,
            group_id:    gid,
            group_name:  c.group_name  ?? null,
          }
          if (!byGroup.has(gid)) byGroup.set(gid, { group_id: gid, group_name: c.group_name ?? null, members: [] })
          byGroup.get(gid)!.members.push(member)
        })
        setGroups(Array.from(byGroup.values()).filter(g => g.members.length >= 2))
        setLoading(false)
      })
  }, [])

  return { groups, loading, error }
}
