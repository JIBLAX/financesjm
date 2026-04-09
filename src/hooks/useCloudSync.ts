import { useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { loadStore } from '@/lib/storage'
import type { FinanceStore } from '@/types/finance'

/** Debounced cloud sync for FinanceStore */
export function useCloudSync() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Upload the full store to the cloud (upsert) */
  const pushToCloud = useCallback(async (store: FinanceStore) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // We can't use typed .from() because the types file hasn't been regenerated yet.
    // Use a raw rpc-style approach via .from() with any cast.
    const { error } = await (supabase as any).from('finance_stores').upsert(
      { user_id: user.id, data: store },
      { onConflict: 'user_id' }
    )
    if (error) console.error('[CloudSync] push error', error.message)
  }, [])

  /** Debounced push — waits 2s after last call */
  const debouncedPush = useCallback((store: FinanceStore) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => pushToCloud(store), 2000)
  }, [pushToCloud])

  /** Download from cloud. Returns null if nothing stored yet. */
  const pullFromCloud = useCallback(async (): Promise<FinanceStore | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await (supabase as any)
      .from('finance_stores')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[CloudSync] pull error', error.message)
      return null
    }
    if (!data?.data) return null
    // Merge cloud data with local defaults so new fields are always initialized
    const local = loadStore()
    return { ...local, ...data.data } as FinanceStore
  }, [])

  return { pushToCloud, debouncedPush, pullFromCloud }
}
