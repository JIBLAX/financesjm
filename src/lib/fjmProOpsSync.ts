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
  beActivClient.from('fjm_pro_operations').upsert({
    fjm_op_id:   op.id,
    month_key:   op.monthKey,
    family:      op.family,
    category:    cat?.name    ?? op.categoryId,
    subcategory: subcat?.name ?? null,
    label:       op.label,
    forecast:    op.forecast,
    actual:      op.actual,
    date:        op.date      ?? null,
    source_type: op.sourceType ?? null,
  }, { onConflict: 'fjm_op_id' }).then(({ error }) => {
    if (error) console.error('[fjmProOpsSync] upsert', error.message)
  })
}

export function syncProOpDelete(opId: string) {
  beActivClient.from('fjm_pro_operations').delete().eq('fjm_op_id', opId).then(({ error }) => {
    if (error) console.error('[fjmProOpsSync] delete', error.message)
  })
}
