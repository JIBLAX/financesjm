import React, { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, X, Check, Settings2 } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { SegmentedSwitch } from '@/components/SegmentedSwitch'
import { formatCurrency, getCurrentMonthKey, getPreviousMonthKey, getNextMonthKey, getMonthLabel } from '@/lib/constants'
import type { FinanceStore, Operation, OperationFamily, OperationScope, OpCategory, OpSubcategory } from '@/types/finance'

interface Props {
  store: FinanceStore
  onAdd: (op: Operation) => void
  onUpdate: (id: string, patch: Partial<Operation>) => void
  onRemove: (id: string) => void
  onInitMonth: (monthKey: string) => void
  onAddOpCategory: (c: OpCategory) => void
  onUpdateOpCategory: (id: string, patch: Partial<OpCategory>) => void
  onRemoveOpCategory: (id: string) => void
  onAddOpSubcategory: (s: OpSubcategory) => void
  onRemoveOpSubcategory: (id: string) => void
}

type FamilyTab = OperationFamily
type ScopeTab = OperationScope

const FAMILY_TABS: { key: FamilyTab; label: string; icon?: string }[] = [
  { key: 'charge_fixe',    label: 'Fixes',    icon: '🔒' },
  { key: 'charge_variable', label: 'Variables', icon: '📊' },
  { key: 'revenu',          label: 'Revenus',   icon: '💰' },
]

const SCOPE_TABS: { key: ScopeTab; label: string }[] = [
  { key: 'perso', label: 'Perso' },
  { key: 'pro',   label: 'Pro'   },
]

type ModalState =
  | { mode: 'add' }
  | { mode: 'edit'; op: Operation }
  | { mode: 'cat_manage' }
  | null

const todayISO = () => new Date().toISOString().split('T')[0]

function emptyForm(family: FamilyTab, scope: ScopeTab, monthKey: string): Omit<Operation, 'id'> {
  return { monthKey, family, scope, label: '', categoryId: '', subcategoryId: '', forecast: 0, actual: 0, isTemplate: family === 'charge_fixe', note: '', date: todayISO() }
}

const deltaColor = (forecast: number, actual: number) => {
  if (actual === 0) return 'text-muted-foreground'
  const diff = actual - forecast
  if (forecast === 0) return 'text-muted-foreground'
  if (diff > 0) return 'text-destructive'    // overspent / underearned
  return 'text-emerald-400'
}
const deltaColorRev = (forecast: number, actual: number) => {
  if (actual === 0) return 'text-muted-foreground'
  const diff = actual - forecast
  if (forecast === 0) return 'text-muted-foreground'
  return diff >= 0 ? 'text-emerald-400' : 'text-destructive'
}

export const OperationsPage: React.FC<Props> = ({
  store, onAdd, onUpdate, onRemove, onInitMonth,
  onAddOpCategory, onUpdateOpCategory, onRemoveOpCategory,
  onAddOpSubcategory, onRemoveOpSubcategory,
}) => {
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [family, setFamily] = useState<FamilyTab>('charge_fixe')
  const [scope, setScope] = useState<ScopeTab>('perso')
  const [modal, setModal] = useState<ModalState>(null)
  const [scopePicker, setScopePicker] = useState<{ categoryId?: string } | null>(null)
  const [form, setForm] = useState<Omit<Operation, 'id'>>(emptyForm('charge_fixe', 'perso', getCurrentMonthKey()))
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('')
  const currentMonthKey = getCurrentMonthKey()

  // Auto-init month from templates when switching to a new month
  useEffect(() => {
    onInitMonth(monthKey)
  }, [monthKey, onInitMonth])

  const categories = useMemo(
    () => store.opCategories.filter(c => c.family === family).sort((a, b) => a.order - b.order),
    [store.opCategories, family]
  )

  const subcategories = useMemo(
    () => (catId: string) => store.opSubcategories.filter(s => s.categoryId === catId),
    [store.opSubcategories]
  )

  const operations = useMemo(
    () => store.operations.filter(op => op.monthKey === monthKey && op.family === family && op.scope === scope),
    [store.operations, monthKey, family, scope]
  )

  const totals = useMemo(() => {
    const forecast = operations.reduce((s, op) => s + op.forecast, 0)
    const actual = operations.reduce((s, op) => s + op.actual, 0)
    return { forecast, actual, delta: actual - forecast }
  }, [operations])

  const openAdd = (categoryId?: string) => {
    setScopePicker({ categoryId })
  }

  const confirmScope = (s: ScopeTab) => {
    const pending = scopePicker
    setScopePicker(null)
    setScope(s)
    const base = emptyForm(family, s, monthKey)
    setForm(pending?.categoryId ? { ...base, categoryId: pending.categoryId } : base)
    setModal({ mode: 'add' })
  }

  const openEdit = (op: Operation) => {
    setForm({ monthKey: op.monthKey, family: op.family, scope: op.scope, label: op.label, categoryId: op.categoryId, subcategoryId: op.subcategoryId || '', forecast: op.forecast, actual: op.actual, isTemplate: op.isTemplate, note: op.note || '', date: op.date || todayISO() })
    setModal({ mode: 'edit', op })
  }

  const closeModal = () => { setModal(null); setScopePicker(null); setDeleteConfirm(null); setNewCatName(''); setNewCatIcon('') }

  const handleSave = () => {
    if (!form.label.trim() || !form.categoryId) return
    const clean = { ...form, subcategoryId: form.subcategoryId || undefined, note: form.note || undefined, clientName: form.clientName || undefined }
    if (modal?.mode === 'add') {
      onAdd({ ...clean, id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` })
    } else if (modal?.mode === 'edit') {
      onUpdate(modal.op.id, clean)
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) { onRemove(id); setDeleteConfirm(null) }
    else setDeleteConfirm(id)
  }

  const handleAddCategory = () => {
    if (!newCatName.trim()) return
    const maxOrder = Math.max(0, ...store.opCategories.filter(c => c.family === family).map(c => c.order))
    onAddOpCategory({ id: `opc_custom_${Date.now()}`, family, name: newCatName.trim(), icon: newCatIcon.trim() || '📦', order: maxOrder + 1 })
    setNewCatName(''); setNewCatIcon('')
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Operation[]>()
    operations.forEach(op => {
      const list = map.get(op.categoryId) || []
      list.push(op)
      map.set(op.categoryId, list)
    })
    return map
  }, [operations])

  const isRevenu = family === 'revenu'

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Opérations</h1>
        <div className="flex gap-2">
          <button onClick={() => setModal({ mode: 'cat_manage' })} className="w-9 h-9 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center active:bg-muted/50">
            <Settings2 className="w-4 h-4" />
          </button>
          <button onClick={() => openAdd()} className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:bg-primary/20">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonthKey(k => getPreviousMonthKey(k))} className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(monthKey)}</span>
        <button onClick={() => setMonthKey(k => getNextMonthKey(k))} disabled={monthKey >= currentMonthKey} className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground active:bg-muted/50 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Family switch */}
      <SegmentedSwitch options={FAMILY_TABS} value={family} onChange={setFamily} />

      {/* Scope switch */}
      <SegmentedSwitch options={SCOPE_TABS} value={scope} onChange={setScope} className="max-w-[180px]" />

      {/* Totals bar */}
      {operations.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <FinanceCard className="!py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Prévision</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(totals.forecast)}</p>
          </FinanceCard>
          <FinanceCard className="!py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Réel</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(totals.actual)}</p>
          </FinanceCard>
          <FinanceCard className="!py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Écart</p>
            <p className={`text-sm font-bold ${isRevenu ? deltaColorRev(totals.forecast, totals.actual) : deltaColor(totals.forecast, totals.actual)}`}>
              {totals.delta >= 0 ? '+' : ''}{formatCurrency(totals.delta)}
            </p>
          </FinanceCard>
        </div>
      )}

      {/* Operations grouped by category */}
      {categories.map(cat => {
        const ops = grouped.get(cat.id) || []
        const orphans = operations.filter(op => op.categoryId === cat.id)
        // Only show categories that have operations OR always show all with the + action to add
        if (ops.length === 0 && orphans.length === 0) return null
        return (
          <div key={cat.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{cat.icon}</span>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">{cat.name}</h2>
              <button onClick={() => openAdd(cat.id)}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted/50">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {ops.map(op => {
                const sub = op.subcategoryId ? store.opSubcategories.find(s => s.id === op.subcategoryId) : null
                const gap = op.actual - op.forecast
                const gapColor = isRevenu ? deltaColorRev(op.forecast, op.actual) : deltaColor(op.forecast, op.actual)
                return (
                  <div key={op.id} className="bg-card/60 rounded-xl border border-border/30 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{op.label}</p>
                        {sub && <p className="text-[10px] text-muted-foreground">{sub.icon} {sub.name}</p>}
                        {op.clientName && <p className="text-[10px] text-muted-foreground italic">{op.clientName}</p>}
                        {op.isTemplate && <span className="text-[9px] text-primary/60">↻ récurrent</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(op)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted/50">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDelete(op.id)} className={`w-7 h-7 rounded-lg flex items-center justify-center active:bg-muted/50 ${deleteConfirm === op.id ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {deleteConfirm === op.id ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="text-muted-foreground">Prév <span className="font-medium text-foreground">{formatCurrency(op.forecast)}</span></span>
                      <span className="text-muted-foreground">Réel <span className={`font-medium ${op.actual > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{op.actual > 0 ? formatCurrency(op.actual) : '—'}</span></span>
                      {op.forecast > 0 && op.actual > 0 && (
                        <span className={`font-semibold ml-auto ${gapColor}`}>{gap >= 0 ? '+' : ''}{formatCurrency(gap)}</span>
                      )}
                    </div>
                    {deleteConfirm === op.id && (
                      <div className="mt-2 flex gap-2 items-center">
                        <p className="text-xs text-destructive flex-1">Confirmer la suppression ?</p>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded-lg text-xs bg-muted/50 text-foreground">Annuler</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {operations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground mb-1">Aucune opération pour ce mois</p>
          <p className="text-xs text-muted-foreground">Appuyez sur + pour ajouter une ligne</p>
        </div>
      )}

      {/* Perso / Pro picker */}
      {scopePicker !== null && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={() => setScopePicker(null)}>
          <div className="w-full bg-background rounded-t-2xl px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]" onClick={e => e.stopPropagation()}>
            <p className="text-base font-bold text-foreground text-center mb-5">C'est pour…</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => confirmScope('perso')}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 active:bg-cyan-500/20 shadow-[0_0_14px_rgba(34,211,238,0.15)]">
                <span className="text-3xl">👤</span>
                <span className="text-sm font-bold">Perso</span>
              </button>
              <button onClick={() => confirmScope('pro')}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl bg-violet-500/10 border border-violet-500/25 text-violet-400 active:bg-violet-500/20 shadow-[0_0_14px_rgba(167,139,250,0.15)]">
                <span className="text-3xl">💼</span>
                <span className="text-sm font-bold">Pro</span>
              </button>
            </div>
            <button onClick={() => setScopePicker(null)} className="w-full py-2.5 rounded-xl bg-muted/30 text-sm text-muted-foreground">Annuler</button>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {(modal?.mode === 'add' || modal?.mode === 'edit') && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={closeModal}>
          <div className="w-full bg-background rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {modal.mode === 'add' ? 'Nouvelle opération' : 'Modifier'}
                </h2>
                <p className={`text-xs font-semibold ${form.scope === 'perso' ? 'text-cyan-400' : 'text-violet-400'}`}>
                  {form.scope === 'perso' ? '👤 Personnel' : '💼 Professionnel'}
                </p>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-5 py-4 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              {/* Label */}
              <div>
                <label className="text-xs text-muted-foreground">Libellé *</label>
                <input
                  className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1"
                  placeholder={family === 'revenu' ? 'Nom Prénom / Libellé' : 'Ex: Loyer, Netflix, Coaching…'}
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))}
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <input
                  type="date"
                  className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1"
                  value={form.date || todayISO()}
                  max={todayISO()}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-muted-foreground">Catégorie *</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setForm(f => ({ ...f, categoryId: cat.id, subcategoryId: '' }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 ${form.categoryId === cat.id ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory (for revenus) */}
              {form.categoryId && store.opSubcategories.filter(s => s.categoryId === form.categoryId).length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground">Offre / Sous-catégorie</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button onClick={() => setForm(f => ({ ...f, subcategoryId: '' }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium ${!form.subcategoryId ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                      Aucune
                    </button>
                    {store.opSubcategories.filter(s => s.categoryId === form.categoryId).map(sub => (
                      <button key={sub.id} onClick={() => setForm(f => ({ ...f, subcategoryId: sub.id }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 ${form.subcategoryId === sub.id ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                        {sub.icon} {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Forecast + Actual */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Prévision (€)</label>
                  <input type="number" inputMode="decimal" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="0" value={form.forecast || ''} onFocus={e => e.target.select()} onChange={e => setForm(f => ({ ...f, forecast: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Réel (€)</label>
                  <input type="number" inputMode="decimal" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="0" value={form.actual || ''} onFocus={e => e.target.select()} onChange={e => setForm(f => ({ ...f, actual: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs text-muted-foreground">Note (optionnelle)</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Optionnel" value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              {/* Template toggle */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-foreground">Récurrent</p>
                  <p className="text-xs text-muted-foreground">Repris automatiquement les mois suivants</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, isTemplate: !f.isTemplate }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.isTemplate ? 'bg-primary' : 'bg-muted/50'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${form.isTemplate ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <button onClick={handleSave} disabled={!form.label.trim() || !form.categoryId}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                {modal?.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category management modal */}
      {modal?.mode === 'cat_manage' && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={closeModal}>
          <div className="w-full bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
              <h2 className="text-base font-bold text-foreground">Catégories — {family === 'charge_fixe' ? 'Fixes' : family === 'charge_variable' ? 'Variables' : 'Revenus'}</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 bg-muted/20 rounded-xl px-3 py-2">
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-sm text-foreground flex-1">{cat.name}</span>
                  <button onClick={() => onRemoveOpCategory(cat.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted/50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-2">Ajouter une catégorie</p>
                <div className="flex gap-2">
                  <input className="w-10 bg-muted/50 rounded-xl px-2 py-2 text-sm text-foreground outline-none text-center" placeholder="🏷️" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} maxLength={2} />
                  <input className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" placeholder="Nom de la catégorie" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                  <button onClick={handleAddCategory} disabled={!newCatName.trim()} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
