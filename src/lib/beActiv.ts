// ── BE ACTIV Business Offer Catalog ─────────────────────────────────────────
// Single source of truth for offers recognised across Business / CRM / Finance.
// Finance JM never creates offers — it references them from this catalog.
// Offers are fetched live from the shared Supabase `offres` table.
// Static arrays below are fallbacks for offline / cold-start.

import { supabase } from '@/integrations/supabase/client'

export interface BusinessOffer {
  id: string
  name: string
  catalogPrice: number   // Standard / reference price (0 = price set at point of sale)
  type: 'sessions' | 'program' | 'product'
  description?: string
}

// ── Static fallback (cold-start / offline) ───────────────────────────────────
export const BUSINESS_OFFERS: BusinessOffer[] = [
  { id: 'ba_jm_pass_coaching',        name: 'JM Pass Coaching',        catalogPrice: 0, type: 'sessions', description: 'Séances à la carte — tarif variable' },
  { id: 'ba_coaching_a_la_carte',     name: 'Coaching À la Carte',     catalogPrice: 0, type: 'sessions', description: 'Séance individuelle' },
  { id: 'ba_activ_program_essentiel', name: 'Activ Program Essentiel', catalogPrice: 0, type: 'program',  description: 'Programme coaching complet' },
  { id: 'ba_activ_reset_online',      name: 'Activ Reset Online',      catalogPrice: 0, type: 'program',  description: 'Programme en ligne' },
  { id: 'ba_activ_reset_hybride',     name: 'Activ Reset Hybride',     catalogPrice: 0, type: 'program',  description: 'Programme hybride présentiel + ligne' },
  { id: 'ba_cardio_mouv',             name: 'Cardio Mouv',             catalogPrice: 0, type: 'sessions', description: 'Cours collectif cardio' },
  { id: 'ba_activ_training',          name: 'Activ Training',          catalogPrice: 0, type: 'sessions', description: 'Entraînement personnalisé' },
  { id: 'ba_boutique',                name: 'Boutique',                catalogPrice: 0, type: 'product',  description: 'Vente produit / merchandising' },
]

// ── Static legacy map fallback ────────────────────────────────────────────────
export const LEGACY_OFFER_MAP: Record<string, string> = {
  jm_pass_coaching:         'ba_jm_pass_coaching',
  coaching_a_la_carte:      'ba_coaching_a_la_carte',
  activ_program_essentiel:  'ba_activ_program_essentiel',
  activ_reset_online:       'ba_activ_reset_online',
  activ_reset_hybride:      'ba_activ_reset_hybride',
  cardio_mouv:              'ba_cardio_mouv',
  activ_training:           'ba_activ_training',
  boutique:                 'ba_boutique',
}

// ── Supabase row → BusinessOffer ─────────────────────────────────────────────

function mapOfferType(t: string | null): 'sessions' | 'program' | 'product' {
  if (!t) return 'sessions'
  const l = t.toLowerCase()
  if (l.includes('program') || l.includes('programme')) return 'program'
  if (l === 'product' || l.includes('produit') || l.includes('boutique')) return 'product'
  return 'sessions'
}

function rowToOffer(row: Record<string, unknown>): BusinessOffer {
  return {
    id: String(row.id),
    name: String(row.name),
    catalogPrice: Number(row.unit_price ?? row.price ?? 0),
    type: mapOfferType(row.offer_type as string | null),
  }
}

// ── Live fetch from Supabase ─────────────────────────────────────────────────

/** Fetch active offers from shared `offres` table. Falls back to static list on error. */
export async function fetchBusinessOffers(): Promise<BusinessOffer[]> {
  const { data, error } = await supabase
    .from('offres')
    .select('id, name, price, unit_price, offer_type')
    .eq('active', true)
    .eq('is_draft', false)
    .order('name')

  if (error || !data || data.length === 0) return BUSINESS_OFFERS
  return (data as Record<string, unknown>[]).map(rowToOffer)
}

/** Build legacy alias map from `offres.aliases[]`. Falls back to static map on error. */
export async function fetchLegacyOfferMap(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('offres')
    .select('id, aliases')
    .not('aliases', 'is', null)

  if (!data || data.length === 0) return LEGACY_OFFER_MAP
  const map: Record<string, string> = {}
  ;(data as { id: string; aliases: string[] | null }[]).forEach(row => {
    row.aliases?.forEach(alias => { map[alias] = row.id })
  })
  return Object.keys(map).length > 0 ? map : LEGACY_OFFER_MAP
}

// ── Helpers (work with static or dynamic data) ───────────────────────────────

/** Resolve a legacy offer key using the provided map (or static fallback). */
export function resolveLegacyOffer(
  legacyKey: string,
  offers: BusinessOffer[] = BUSINESS_OFFERS,
  legacyMap: Record<string, string> = LEGACY_OFFER_MAP,
): BusinessOffer | null {
  const id = legacyMap[legacyKey]
  return id ? (offers.find(o => o.id === id) ?? null) : null
}

/** Get an offer by its Business ID. */
export function getBusinessOffer(
  id: string,
  offers: BusinessOffer[] = BUSINESS_OFFERS,
): BusinessOffer | null {
  return offers.find(o => o.id === id) ?? null
}
