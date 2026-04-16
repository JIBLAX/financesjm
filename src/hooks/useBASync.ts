import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { FinanceStore, Transaction } from '@/types/finance'

export interface BASale {
  id: string
  offer_id: string | null
  offer_name: string | null
  client_id: string | null
  client_name: string
  amount: number
  catalog_price: number | null
  category: string | null
  date: string
  channel: string | null
  payment_mode: string | null
  status: string
  is_installment: boolean
  total_amount: number | null
  installment_label: string | null
  installment_number: number | null
  installment_total: number | null
  financesjm_tx_id: string | null
  offres?: { name: string; price: number } | null
}

interface UseBASync {
  pendingSales: BASale[]
  loading: boolean
  synced: boolean
  fetchPending: () => Promise<void>
  importSale: (sale: BASale, store: FinanceStore, onAdd: (t: Transaction) => void) => Promise<void>
  importAll: (store: FinanceStore, onAdd: (t: Transaction) => void) => Promise<void>
}

/**
 * Manages the sync between ba_sales (BE ACTIV Business) and Finances JM transactions.
 * Fetches sales where financesjm_tx_id IS NULL (not yet imported).
 */
export function useBASync(): UseBASync {
  const [pendingSales, setPendingSales] = useState<BASale[]>([])
  const [loading, setLoading] = useState(false)
  const [synced, setSynced] = useState(false)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ba_sales')
      .select('*, offres(name, price)')
      .is('financesjm_tx_id', null)
      .order('date', { ascending: false })
    setPendingSales((data as BASale[]) ?? [])
    setLoading(false)
    setSynced(true)
  }, [])

  const importSale = useCallback(async (
    sale: BASale,
    store: FinanceStore,
    onAdd: (t: Transaction) => void,
  ) => {
    const txId = crypto.randomUUID()
    const monthKey = sale.date.substring(0, 7)
    const proAccount = store.accounts.find(a => a.type === 'pro' && a.isActive)

    const tx: Transaction = {
      id: txId,
      date: new Date(sale.date + 'T12:00:00').toISOString(),
      label: sale.client_name,
      amount: sale.amount,
      direction: 'income',
      sourceType: 'bank',
      accountId: proAccount?.id || store.accounts.find(a => a.isActive)?.id || '',
      categoryId: store.categories[0]?.id || '',
      monthKey,
      note: '',
      isRecurring: false,
      revenueSource: 'be_activ',
      revenueType: 'revenu_pro_recurrent',
      isRealRevenue: true,
      beActivDetails: {
        client: sale.client_name,
        business_offer_id: sale.offer_id || undefined,
        business_offer_name: sale.offres?.name,
        catalog_price_snapshot: sale.catalog_price ?? undefined,
        actual_amount: sale.amount,
        needs_review: !sale.offer_id,
        channel: (sale.channel as any) || '',
        paymentMode: (sale.payment_mode as any) || '',
        status: (sale.status as any) || 'recu',
        isInstallment: sale.is_installment ?? false,
        totalAmount: sale.total_amount ?? undefined,
        installmentLabel: sale.installment_label ?? undefined,
      },
    }

    onAdd(tx)

    // Mark the sale as imported in Supabase
    await supabase
      .from('ba_sales')
      .update({ financesjm_tx_id: txId })
      .eq('id', sale.id)

    setPendingSales(prev => prev.filter(s => s.id !== sale.id))
  }, [])

  const importAll = useCallback(async (
    store: FinanceStore,
    onAdd: (t: Transaction) => void,
  ) => {
    for (const sale of pendingSales) {
      await importSale(sale, store, onAdd)
    }
  }, [pendingSales, importSale])

  return { pendingSales, loading, synced, fetchPending, importSale, importAll }
}
