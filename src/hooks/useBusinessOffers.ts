import { useState, useEffect } from 'react'
import {
  BUSINESS_OFFERS, LEGACY_OFFER_MAP,
  fetchBusinessOffers, fetchLegacyOfferMap,
} from '@/lib/beActiv'
import type { BusinessOffer } from '@/lib/beActiv'

interface UseBusinessOffersResult {
  offers: BusinessOffer[]
  legacyMap: Record<string, string>
  loading: boolean
}

/**
 * Fetches active offers from the shared Supabase `offres` table.
 * Falls back to the static BUSINESS_OFFERS list while loading or on error.
 */
export function useBusinessOffers(): UseBusinessOffersResult {
  const [offers, setOffers] = useState<BusinessOffer[]>(BUSINESS_OFFERS)
  const [legacyMap, setLegacyMap] = useState<Record<string, string>>(LEGACY_OFFER_MAP)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchBusinessOffers(), fetchLegacyOfferMap()])
      .then(([fetchedOffers, fetchedMap]) => {
        setOffers(fetchedOffers)
        setLegacyMap(fetchedMap)
      })
      .finally(() => setLoading(false))
  }, [])

  return { offers, legacyMap, loading }
}
