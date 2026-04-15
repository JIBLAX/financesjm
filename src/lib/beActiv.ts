// ── BE ACTIV Business Offer Catalog ─────────────────────────────────────────
// Single source of truth for offers recognised across Business / CRM / Finance.
// Finance JM never creates offers — it references them from this catalog.

export interface BusinessOffer {
  id: string
  name: string
  catalogPrice: number   // Standard / reference price (0 = price set at point of sale)
  type: 'sessions' | 'program' | 'product'
  description?: string
}

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

// ── Legacy migration map ─────────────────────────────────────────────────────
// Maps old BeActivOffer enum values → Business catalog IDs.
// Used for soft migration: display resolved offer name without deleting old data.
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

/** Resolve a legacy offer key to its Business catalog entry (read-only migration helper). */
export function resolveLegacyOffer(legacyKey: string): BusinessOffer | null {
  const businessId = LEGACY_OFFER_MAP[legacyKey]
  return businessId ? (BUSINESS_OFFERS.find(o => o.id === businessId) ?? null) : null
}

/** Get an offer by its Business ID. */
export function getBusinessOffer(id: string): BusinessOffer | null {
  return BUSINESS_OFFERS.find(o => o.id === id) ?? null
}
