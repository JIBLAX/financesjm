import React, { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Pencil, Trash2, X, Check, Settings2, ArrowLeftRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  { key: 'charge_fixe',     label: 'Fixes',    icon: '🔒' },
  { key: 'charge_variable', label: 'Variables', icon: '📊' },
  { key: 'revenu',          label: 'Revenus',   icon: '💰' },
]


type ModalState = { mode: 'add' } | { mode: 'edit'; op: Operation } | { mode: 'cat_manage' } | null

const todayISO = () => new Date().toISOString().split('T')[0]
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function emptyForm(family: OperationFamily, scope: ScopeTab, monthKey: string): Omit<Operation, 'id'> {
  return { monthKey, family, scope, label: '', categoryId: '', subcategoryId: '', forecast: 0, actual: 0, isTemplate: family === 'charge_fixe', note: '', date: todayISO() }
}


export const OperationsPage: React.FC<Props> = ({
  store, onAdd, onUpdate, onRemove, onInitMonth,
  onAddOpCategory, onUpdateOpCategory, onRemoveOpCategory,
  onAddOpSubcategory, onRemoveOpSubcategory,
}) => {
  const navigate = useNavigate()
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [family, setFamily] = useState<FamilyTab>('charge_fixe')
  const [scope, setScope] = useState<ScopeTab>('perso')
  const [modal, setModal] = useState<ModalState>(null)
  const [scopePicker, setScopePicker] = useState<{ categoryId?: string } | null>(null)
  const [form, setForm] = useState<Omit<Operation, 'id'>>(emptyForm('charge_fixe', 'perso', getCurrentMonthKey()))
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('')
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('ops_collapsed_cats')
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
    } catch { return new Set<string>() }
  })
  const toggleCatCollapse = (id: string) => {
    setCollapsedCats(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      try { sessionStorage.setItem('ops_collapsed_cats', JSON.stringify([...n])) } catch {}
      return n
    })
  }
  const currentMonthKey = getCurrentMonthKey()

  const [revenuType, setRevenuType] = useState<'fixe' | 'variable'>('variable')
  const [recurrenceMode, setRecurrenceMode] = useState<'indefinite' | 'x_months'>('indefinite')
  const [recurrenceCount, setRecurrenceCount] = useState<number>(3)

  useEffect(() => {
    onInitMonth(monthKey)
    // Pré-initialiser le mois suivant pour que les récurrences apparaissent en prévision
    if (monthKey === currentMonthKey) onInitMonth(getNextMonthKey(currentMonthKey))
  }, [monthKey, currentMonthKey, onInitMonth])

  // Lock body scroll when any modal/sheet is open
  useEffect(() => {
    const isOpen = modal !== null || scopePicker !== null
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modal, scopePicker])

  const familyTabs = FAMILY_TABS

  const categories = useMemo(
    () => store.opCategories
      .filter(c => c.family === family && (!c.scope || c.scope === scope))
      .sort((a, b) => a.order - b.order),
    [store.opCategories, family, scope]
  )

  const operations = useMemo(
    () => store.operations.filter(op => op.monthKey === monthKey && op.family === family && op.scope === scope && !op.skipped),
    [store.operations, monthKey, family, scope]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Operation[]>()
    operations.forEach(op => {
      const list = map.get(op.categoryId) || []
      list.push(op)
      map.set(op.categoryId, list)
    })
    // Trier chaque groupe par date décroissante (plus récent en haut)
    map.forEach((ops, key) => {
      map.set(key, [...ops].sort((a, b) =>
        (b.date || '').localeCompare(a.date || '')
      ))
    })
    return map
  }, [operations])

  // Catégories triées par date de l'opération la plus récente
  // On se base sur les ops réelles (grouped), pas sur la famille de la catégorie :
  // une op peut avoir une catégorie d'une autre famille après un switch Fixe↔Variable.
  const sortedCategories = useMemo(() => {
    const usedCatIds = new Set(grouped.keys())
    return store.opCategories
      .filter(cat => usedCatIds.has(cat.id))
      .sort((a, b) => {
        const latestA = (grouped.get(a.id) || []).reduce((m, op) => op.date && op.date > m ? op.date : m, '')
        const latestB = (grouped.get(b.id) || []).reduce((m, op) => op.date && op.date > m ? op.date : m, '')
        return latestB.localeCompare(latestA)
      })
  }, [store.opCategories, grouped])

  const openAdd = (categoryId?: string) => setScopePicker({ categoryId })

  const confirmScope = (s: ScopeTab) => {
    const pending = scopePicker
    setScopePicker(null)
    setScope(s)
    const base = emptyForm(family, s, monthKey)
    setForm(pending?.categoryId ? { ...base, categoryId: pending.categoryId } : base)
    setModal({ mode: 'add' })
  }

  const openEdit = (op: Operation) => {
    setForm({ monthKey: op.monthKey, family: op.family, scope: op.scope, label: op.label, categoryId: op.categoryId, subcategoryId: op.subcategoryId || '', forecast: op.forecast, actual: op.actual, isTemplate: op.isTemplate, recurrenceMonths: op.recurrenceMonths, note: op.note || '', date: op.date || todayISO() })
    if (op.family === 'revenu') {
      setRevenuType(op.isTemplate ? 'fixe' : 'variable')
      if (op.recurrenceMonths) { setRecurrenceMode('x_months'); setRecurrenceCount(op.recurrenceMonths) }
      else { setRecurrenceMode('indefinite') }
    } else {
      setRevenuType('variable')
    }
    setModal({ mode: 'edit', op })
  }

  const closeModal = () => {
    setModal(null); setScopePicker(null); setDeleteConfirm(null); setNewCatName(''); setNewCatIcon('')
    setRevenuType('variable'); setRecurrenceMode('indefinite'); setRecurrenceCount(3)
  }

  const changeFormScope = (newScope: ScopeTab) => {
    setForm(f => ({ ...f, scope: newScope, categoryId: '', subcategoryId: '' }))
  }

  const handleSave = () => {
    if (!form.label.trim() || !form.categoryId) return
    // isTemplate: charges → driven by toggle, revenus → driven by revenuType
    const isTemplate = form.family !== 'revenu'
      ? form.isTemplate
      : revenuType === 'fixe'
    // recurrenceMonths: only meaningful for fixed revenus
    const recurrenceMonths = (form.family === 'revenu' && revenuType === 'fixe' && recurrenceMode === 'x_months')
      ? recurrenceCount
      : undefined
    const clean = { ...form, isTemplate, recurrenceMonths, subcategoryId: form.subcategoryId || undefined, note: form.note || undefined }
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
    onAddOpCategory({ id: `opc_custom_${Date.now()}`, family: family, name: newCatName.trim(), icon: newCatIcon.trim() || '📦', order: maxOrder + 1 })
    setNewCatName(''); setNewCatIcon('')
  }

  const isRevenu = family === 'revenu'
  const isPerso  = scope === 'perso'

  const formCategories = useMemo(
    () => store.opCategories
      .filter(c => {
        const matchScope = !c.scope || c.scope === form.scope
        if (form.family === 'revenu') return c.family === 'revenu' && matchScope
        // Pour les charges : montrer fixe + variable ensemble (la catégorie est juste un label)
        return (c.family === 'charge_fixe' || c.family === 'charge_variable') && matchScope
      })
      .sort((a, b) => a.order - b.order),
    [store.opCategories, form.family, form.scope]
  )

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      {/* Header — title + action buttons */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Opérations</h1>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => navigate('/transactions')}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-400 border border-amber-500/25 active:bg-amber-500/25"
            title="Transfert interne"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <button onClick={() => setModal({ mode: 'cat_manage' })} className="w-9 h-9 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center active:bg-muted/50">
            <Settings2 className="w-4 h-4" />
          </button>
          <button onClick={() => openAdd()} className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${isPerso ? 'bg-cyan-500' : 'bg-violet-500'}`}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scope toggle — dedicated full-width row */}
      <div className="flex bg-muted/25 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setScope('perso')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${isPerso
            ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.25)]'
            : 'text-muted-foreground'}`}
        >
          <span>👤</span>
          <span>Personnel</span>
        </button>
        <button
          onClick={() => setScope('pro')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${!isPerso
            ? 'bg-violet-500/20 text-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.25)]'
            : 'text-muted-foreground'}`}
        >
          <span>💼</span>
          <span>Professionnel</span>
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonthKey(k => getPreviousMonthKey(k))} className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(monthKey)}</span>
        <button onClick={() => setMonthKey(k => getNextMonthKey(k))} disabled={monthKey >= getNextMonthKey(currentMonthKey)} className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground active:bg-muted/50 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Family tabs — scope-aware */}
      <SegmentedSwitch options={familyTabs} value={family} onChange={(v) => setFamily(v as FamilyTab)} />

      {/* ── BUDGET VIEW (Fixes / Variables / Revenus) ── */}
      <>
        {sortedCategories.map(cat => {
            const ops = grouped.get(cat.id) || []
            if (ops.length === 0) return null
            const catTotal = ops.reduce((s, op) => s + (op.actual || op.forecast || 0), 0)
            const isCollapsed = collapsedCats.has(cat.id)
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => toggleCatCollapse(cat.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <span className="text-base flex-shrink-0">{cat.icon}</span>
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1 truncate">{cat.name}</h2>
                    <span className={`text-xs font-semibold shrink-0 ${isRevenu ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isRevenu ? '+' : '−'}{formatCurrency(catTotal)}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                  <button onClick={() => openAdd(cat.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted/50 ml-1 flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {!isCollapsed && <div className="space-y-1.5">
                  {ops.map(op => {
                    const sub = op.subcategoryId ? store.opSubcategories.find(s => s.id === op.subcategoryId) : null
                    const amount = op.actual || op.forecast || 0
                    const isPending = !op.actual || op.actual === 0
                    return (
                      <div key={op.id} className={`rounded-xl border px-3 py-2.5 ${isPending && op.templateId ? 'bg-card/30 border-border/20 border-dashed' : 'bg-card/60 border-border/30'}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isPending && op.templateId ? 'text-foreground/60' : 'text-foreground'}`}>{op.label}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isRevenu ? '#10b981' : '#ef4444' }} />
                                <span className="text-[10px] text-muted-foreground">{cat.icon} {cat.name}</span>
                              </div>
                              {sub && <span className="text-[10px] text-muted-foreground/70">{sub.icon} {sub.name}</span>}
                              {op.date && <span className="text-[10px] text-muted-foreground/50">{fmtDate(op.date)}</span>}
                              {op.isTemplate && <span className="text-[9px] text-primary/60">↻</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="text-right">
                              <p className={`text-sm font-bold ${isPending ? 'text-muted-foreground/50' : isRevenu ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPending ? '' : isRevenu ? '+' : '−'}{formatCurrency(amount)}
                              </p>
                              {isPending && amount > 0 && (
                                <p className="text-[9px] text-muted-foreground/40">prévu</p>
                              )}
                            </div>
                            {isPending ? (
                              <>
                                {/* ✅ Confirmer */}
                                <button
                                  onClick={() => {
                                    if (op.forecast > 0) {
                                      onUpdate(op.id, { actual: op.forecast })
                                    } else {
                                      openEdit(op)
                                    }
                                  }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 bg-emerald-500/10 active:bg-emerald-500/20 text-base"
                                  title="Confirmer"
                                >✅</button>
                                {/* ❌ Passer ce mois */}
                                <button
                                  onClick={() => onUpdate(op.id, { skipped: true })}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 bg-rose-500/10 active:bg-rose-500/20 text-base"
                                  title="Passer ce mois"
                                >❌</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => openEdit(op)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted/50">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDelete(op.id)} className={`w-7 h-7 rounded-lg flex items-center justify-center active:bg-muted/50 ${deleteConfirm === op.id ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {deleteConfirm === op.id ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {deleteConfirm === op.id && (
                          <div className="mt-2 flex gap-2 items-center border-t border-border/30 pt-2">
                            <p className="text-xs text-destructive flex-1">Confirmer la suppression ?</p>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded-lg text-xs bg-muted/50 text-foreground">Annuler</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>}
              </div>
            )
          })}

          {operations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-1">Aucune opération pour ce mois</p>
              <p className="text-xs text-muted-foreground">Appuyez sur + pour ajouter une ligne</p>
            </div>
          )}
        </>

      {/* ── Perso / Pro picker ── */}
      {scopePicker !== null && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" style={{ overscrollBehavior: 'none' }} onClick={() => setScopePicker(null)}>
          <div className="w-full bg-background rounded-t-2xl px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]" style={{ touchAction: 'pan-y' }} onClick={e => e.stopPropagation()}>
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

      {/* ── Add / Edit modal ── */}
      {(modal?.mode === 'add' || modal?.mode === 'edit') && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" style={{ overscrollBehavior: 'none' }} onClick={closeModal}>
          <div className="w-full bg-background rounded-t-2xl max-h-[92vh] overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground mb-2">
                  {modal.mode === 'add' ? 'Nouvelle opération' : 'Modifier'}
                </h2>
                {/* Scope toggle inline */}
                <div className="flex bg-muted/25 rounded-xl p-0.5 gap-0.5 w-fit">
                  <button onClick={() => changeFormScope('perso')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${form.scope === 'perso' ? 'bg-cyan-500/20 text-cyan-400' : 'text-muted-foreground'}`}>
                    👤 Perso
                  </button>
                  <button onClick={() => changeFormScope('pro')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${form.scope === 'pro' ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground'}`}>
                    💼 Pro
                  </button>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground ml-3"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-5 py-4 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              {/* Label */}
              <div>
                <label className="text-xs text-muted-foreground">Libellé *</label>
                <input
                  className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1"
                  placeholder={form.family === 'revenu' ? 'Nom Prénom / Libellé' : 'Ex: Loyer, Netflix, Coaching…'}
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
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
                  onChange={e => {
                    const newDate = e.target.value
                    const newMonthKey = newDate.substring(0, 7)
                    setForm(f => ({ ...f, date: newDate, monthKey: newMonthKey }))
                  }}
                />
                {form.date && form.date.substring(0, 7) !== monthKey && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    ⚠️ Cette opération sera enregistrée en {getMonthLabel(form.date.substring(0, 7))}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-muted-foreground">Catégorie *</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {formCategories.map(cat => (
                    <button key={cat.id} onClick={() => setForm(f => ({ ...f, categoryId: cat.id, subcategoryId: '' }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 ${form.categoryId === cat.id ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory */}
              {form.categoryId && store.opSubcategories.filter(s => s.categoryId === form.categoryId).length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground">Offre / Sous-catégorie</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {store.opSubcategories.filter(s => s.categoryId === form.categoryId).map(sub => (
                      <button key={sub.id} onClick={() => setForm(f => ({ ...f, subcategoryId: sub.id }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 ${form.subcategoryId === sub.id ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                        {sub.icon} {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Somme */}
              <div>
                <label className="text-xs text-muted-foreground">Somme (€)</label>
                <input
                  type="number" inputMode="decimal"
                  className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1"
                  placeholder="0"
                  value={form.actual || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0
                    setForm(f => ({ ...f, forecast: v, actual: v }))
                  }}
                />
              </div>

              {/* Type de charge — Fixe / Variable */}
              {form.family !== 'revenu' && (
                <div>
                  <label className="text-xs text-muted-foreground">Type de charge</label>
                  <div className="flex bg-muted/25 rounded-xl p-0.5 gap-0.5 mt-1">
                    <button
                      onClick={() => { if (form.family !== 'charge_fixe') setForm(f => ({ ...f, family: 'charge_fixe', subcategoryId: '', isTemplate: true })) }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${form.family === 'charge_fixe' ? 'bg-rose-500/20 text-rose-400' : 'text-muted-foreground'}`}>
                      🔒 Fixe
                    </button>
                    <button
                      onClick={() => { if (form.family !== 'charge_variable') setForm(f => ({ ...f, family: 'charge_variable', subcategoryId: '', isTemplate: false })) }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${form.family === 'charge_variable' ? 'bg-amber-500/20 text-amber-400' : 'text-muted-foreground'}`}>
                      📊 Variable
                    </button>
                  </div>
                </div>
              )}

              {/* Type de revenu — Fixe / Variable */}
              {form.family === 'revenu' && (
                <div>
                  <label className="text-xs text-muted-foreground">Type de revenu</label>
                  <div className="flex bg-muted/25 rounded-xl p-0.5 gap-0.5 mt-1">
                    <button
                      onClick={() => setRevenuType('fixe')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${revenuType === 'fixe' ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground'}`}>
                      🔒 Fixe
                    </button>
                    <button
                      onClick={() => setRevenuType('variable')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${revenuType === 'variable' ? 'bg-amber-500/20 text-amber-400' : 'text-muted-foreground'}`}>
                      📊 Variable
                    </button>
                  </div>
                </div>
              )}

              {/* Récurrence — revenus fixes uniquement */}
              {form.family === 'revenu' && revenuType === 'fixe' && (
                <div>
                  <label className="text-xs text-muted-foreground">Durée de récurrence</label>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setRecurrenceMode('indefinite')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium ${recurrenceMode === 'indefinite' ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                      Indéterminée
                    </button>
                    <button onClick={() => setRecurrenceMode('x_months')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium ${recurrenceMode === 'x_months' ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                      X mois
                    </button>
                  </div>
                  {recurrenceMode === 'x_months' && (
                    <div className="flex items-center gap-2 mt-2">
                      <input type="number" min="1" max="60" inputMode="numeric"
                        className="w-24 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                        value={recurrenceCount}
                        onFocus={e => e.target.select()}
                        onChange={e => setRecurrenceCount(Math.max(1, parseInt(e.target.value) || 1))} />
                      <span className="text-xs text-muted-foreground">mois au total</span>
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              <div>
                <label className="text-xs text-muted-foreground">Note (optionnelle)</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Optionnel" value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              {/* Récurrent toggle — charges uniquement */}
              {form.family !== 'revenu' && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Récurrent</p>
                    <p className="text-xs text-muted-foreground">Désactiver le mois où tu arrêtes</p>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, isTemplate: !f.isTemplate }))}
                    className={`w-12 h-6 rounded-full transition-colors ${form.isTemplate ? 'bg-primary' : 'bg-muted/50'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${form.isTemplate ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}

              <button onClick={handleSave} disabled={!form.label.trim() || !form.categoryId}
                className={`w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 ${form.scope === 'perso' ? 'bg-cyan-500' : 'bg-violet-500'}`}>
                {modal?.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category management modal ── */}
      {modal?.mode === 'cat_manage' && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" style={{ overscrollBehavior: 'none' }} onClick={closeModal}>
          <div className="w-full bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
              <h2 className="text-base font-bold text-foreground">Catégories — {family === 'revenu' ? 'Revenus' : scope === 'pro' ? 'Charges' : family === 'charge_fixe' ? 'Fixes' : 'Variables'}</h2>
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
