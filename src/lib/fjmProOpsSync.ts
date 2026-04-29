import { beActivClient } from '@/integrations/supabase/beActivClient'
import type { Operation, OpCategory, OpSubcategory } from '@/types/finance'

export function syncProOpUpsert(
  op: Operation,
  categories: OpCategory[],
  subcategories: OpSubcategory[],
) {
  if (op.scope !== 'pro') return
  const cat    = categories.find(c => c.id === op.categoryId)
  const subcat = subcategories.find(s => s.id === op.subcategoryId)
  beActivClient.from('operations_pro').upsert({
    external_ref: op.id,
    month_key:   op.monthKey,
    family:      op.family,
    category:    cat?.name    ?? op.categoryId,
    subcategory: subcat?.name ?? null,
    label:       op.label,
    forecast:    op.forecast,
    actual:      op.actual,
    operation_date: op.date   ?? null,
    source_type: op.sourceType ?? null,
  }, { onConflict: 'external_ref' }).then(({ error }) => {
    if (error) console.error('[fjmProOpsSync] upsert', error.message)
  })
}

export function syncProOpDelete(opId: string) {
  beActivClient.from('operations_pro').delete().eq('external_ref', opId).then(({ error }) => {
    if (error) console.error('[fjmProOpsSync] delete', error.message)
  })
}
