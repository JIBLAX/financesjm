import React, { useState, useMemo } from 'react'
import { Building2, Banknote, PiggyBank, Briefcase, Star, Plus, X, Check, ChevronDown, TrendingUp, Settings2 } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency } from '@/lib/constants'
import type { FinanceStore, Account } from '@/types/finance'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'

interface Props {
  store: FinanceStore
  onAdd: (a: Account) => void
  onUpdate: (id: string, patch: Partial<Account>) => void
  onRemove: (id: string) => void
}

// Each type: label, icon, Tailwind color class, hex color for chart
const TYPE_CFG: Record<string, { label: string; icon: React.ReactNode; tw: string; hex: string }> = {
  pro:            { label: 'Professionnel',  icon: <Briefcase className="w-4 h-4" />,   tw: 'text-indigo-400', hex: '#818cf8' },
  courant:        { label: 'Courant',        icon: <Building2 className="w-4 h-4" />,   tw: 'text-emerald-400', hex: '#34d399' },
  livret:         { label: 'Épargne',        icon: <PiggyBank className="w-4 h-4" />,   tw: 'text-amber-400',  hex: '#fbbf24' },
  liquide:        { label: 'Espèces',        icon: <Banknote className="w-4 h-4" />,    tw: 'text-violet-400', hex: '#a78bfa' },
  epargne_projet: { label: 'Épargne Projet', icon: <Star className="w-4 h-4" />,        tw: 'text-cyan-400',   hex: '#22d3ee' },
  investissement: { label: 'Investissement', icon: <TrendingUp className="w-4 h-4" />,  tw: 'text-green-400',  hex: '#4ade80' },
  dette:          { label: 'Dette',          icon: <Banknote className="w-4 h-4" />,    tw: 'text-rose-400',   hex: '#fb7185' },
}

const TYPE_ORDER = ['pro', 'courant', 'livret', 'liquide', 'epargne_projet', 'investissement', 'dette']

const emptyForm = (): Omit<Account, 'id'> => ({
  name: '', institution: '', type: 'courant', subtype: '', currency: 'EUR',
  currentBalance: 0, isActive: true, group: '', note: '',
})

type ModalState = { mode: 'add' } | { mode: 'edit'; account: Account } | null

export const AccountsPage: React.FC<Props> = ({ store, onAdd, onUpdate, onRemove }) => {
  const [modal, setModal]       = useState<ModalState>(null)
  const [form, setForm]         = useState<Omit<Account, 'id'>>(emptyForm())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteStep, setDeleteStep] = useState(false)

  const toggleCollapse = (key: string) => setCollapsed(s => {
    const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  const toggleSelect = (id: string) => setSelectedIds(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const cancelEdit = () => { setEditMode(false); setSelectedIds(new Set()); setDeleteStep(false) }

  const openAdd = () => { setForm(emptyForm()); setModal({ mode: 'add' }) }

  const openEdit = (a: Account) => {
    setForm({ name: a.name, institution: a.institution, type: a.type, subtype: a.subtype,
      currency: a.currency, currentBalance: a.currentBalance, isActive: a.isActive,
      group: a.group || '', note: a.note || '' })
    setModal({ mode: 'edit', account: a })
  }

  const closeModal = () => setModal(null)

  const handleSave = () => {
    if (!form.name.trim()) return
    const clean = { ...form, group: form.group || undefined, note: form.note || undefined }
    if (modal?.mode === 'add') onAdd({ ...clean, id: `acc_${Date.now()}` })
    else if (modal?.mode === 'edit') onUpdate(modal.account.id, clean)
    closeModal()
    cancelEdit()
  }

  const handleEditSelected = () => {
    if (selectedIds.size === 1) {
      const acc = store.accounts.find(a => a.id === [...selectedIds][0])
      if (acc) openEdit(acc)
    }
  }

  const handleDeleteSelected = () => {
    if (!deleteStep) { setDeleteStep(true); return }
    selectedIds.forEach(id => onRemove(id))
    cancelEdit()
  }

  // Chart data: accounts with same group → merged into one bar
  const chartData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>()
    store.accounts.filter(a => a.isActive).forEach(a => {
      const key = a.group || a.id
      const name = a.group
        ? a.group.charAt(0).toUpperCase() + a.group.slice(1)
        : (a.name.length > 13 ? a.name.slice(0, 13) + '…' : a.name)
      if (!map.has(key)) map.set(key, { name, value: 0, color: TYPE_CFG[a.type]?.hex || '#6b7280' })
      map.get(key)!.value += a.currentBalance
    })
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [store.accounts])

  // Groups: by type, in TYPE_ORDER
  const groupedByType = useMemo(() => {
    const map = new Map<string, Account[]>()
    store.accounts.filter(a => a.isActive).forEach(a => {
      if (!map.has(a.type)) map.set(a.type, [])
      map.get(a.type)!.push(a)
    })
    return map
  }, [store.accounts])

  const total = store.accounts.filter(a => a.isActive).reduce((s, a) => s + a.currentBalance, 0)

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Comptes</h1>
        <div className="flex gap-2">
          {editMode ? (
            <button onClick={cancelEdit} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/30 text-muted-foreground">
              Annuler
            </button>
          ) : (
            <>
              <button onClick={() => setEditMode(true)} className="w-9 h-9 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center active:bg-muted/50">
                <Settings2 className="w-4 h-4" />
              </button>
              <button onClick={openAdd} className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:bg-primary/20">
                <Plus className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Total + chart card */}
      <div className="p-px rounded-3xl bg-gradient-to-br from-sky-500/30 via-primary/20 to-cyan-500/10">
        <div className="rounded-[calc(1.5rem-1px)] bg-card px-5 py-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total comptes</p>
          <p className="text-4xl font-extrabold text-gradient-sky leading-none mb-4">{formatCurrency(total)}</p>

          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 30 + 8, 60)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }} barSize={16}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Solde']}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} fillOpacity={d.value >= 0 ? 0.85 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Groups */}
      {TYPE_ORDER.map(type => {
        const accounts = groupedByType.get(type)
        if (!accounts || accounts.length === 0) return null
        const cfg = TYPE_CFG[type] || { label: type, icon: null, tw: 'text-muted-foreground', hex: '#6b7280' }
        const groupTotal = accounts.reduce((s, a) => s + a.currentBalance, 0)
        const isCollapsed = collapsed.has(type)

        return (
          <div key={type}>
            {/* Group header — tap to collapse */}
            <button onClick={() => toggleCollapse(type)} className="flex items-center justify-between w-full mb-2 active:opacity-70">
              <div className="flex items-center gap-2">
                <span className={cfg.tw}>{cfg.icon}</span>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cfg.label}</h2>
                <span className="text-[10px] text-muted-foreground/50">{accounts.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{formatCurrency(groupTotal)}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
              </div>
            </button>

            {/* Account rows */}
            {!isCollapsed && (
              <div className="space-y-1.5">
                {accounts.map(a => {
                  const isSelected = selectedIds.has(a.id)
                  return (
                    <div
                      key={a.id}
                      onClick={() => editMode ? toggleSelect(a.id) : undefined}
                      className={`bg-card/60 rounded-xl border transition-colors px-3 py-2.5 flex items-center gap-3 ${
                        editMode ? 'cursor-pointer active:bg-muted/30' : ''
                      } ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/30'}`}
                    >
                      {/* Selection circle */}
                      {editMode && (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.institution}{a.subtype ? ` · ${a.subtype}` : ''}</p>
                        {a.group && <p className="text-[10px] text-muted-foreground/50">🔗 {a.group}</p>}
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${a.currentBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        {formatCurrency(a.currentBalance)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {store.accounts.filter(a => a.isActive).length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Aucun compte — appuyez sur + pour en ajouter un</p>
        </div>
      )}

      {/* Edit mode bottom action bar */}
      {editMode && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 px-4">
          <div className="max-w-lg mx-auto bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
            <span className="text-xs text-muted-foreground flex-1">
              {selectedIds.size === 0 ? 'Sélectionner des comptes' : `${selectedIds.size} sélectionné${selectedIds.size > 1 ? 's' : ''}`}
            </span>
            <button
              onClick={handleEditSelected}
              disabled={selectedIds.size !== 1}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/20 text-primary disabled:opacity-30"
            >
              Modifier
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-30 transition-colors ${
                deleteStep ? 'bg-destructive text-white' : 'bg-destructive/20 text-destructive'
              }`}
            >
              {deleteStep ? 'Confirmer ?' : 'Supprimer'}
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={closeModal}>
          <div className="w-full bg-background rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
              <h2 className="text-base font-bold text-foreground">
                {modal.mode === 'add' ? 'Nouveau compte' : 'Modifier le compte'}
              </h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground active:bg-muted/50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <label className="text-xs text-muted-foreground">Nom *</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Ex: Compte courant" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Banque / Institution</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Ex: BNP Paribas" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(Object.keys(TYPE_CFG) as Account['type'][]).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium ${form.type === t ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                      {TYPE_CFG[t]?.label || t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Sous-type (ex: PEA, Livret A…)</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Optionnel" value={form.subtype} onChange={e => setForm(f => ({ ...f, subtype: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Solde actuel (€)</label>
                <input type="number" inputMode="decimal" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="0" value={form.currentBalance || ''} onFocus={e => e.target.select()} onChange={e => setForm(f => ({ ...f, currentBalance: parseFloat(e.target.value) || 0 }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Lier à un groupe <span className="text-muted-foreground/50">(même nom = fusionnés dans le graphe)</span></label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Ex: voyage, urgence…" value={form.group || ''} onChange={e => setForm(f => ({ ...f, group: e.target.value.toLowerCase() }))} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Note</label>
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" placeholder="Optionnel" value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-foreground flex-1">Compte actif</label>
                <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))} className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-muted/50'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {modal.mode === 'edit' && (
                <button
                  onClick={() => { if (modal.mode === 'edit') { onRemove(modal.account.id); closeModal() } }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-destructive bg-destructive/10"
                >
                  Supprimer ce compte
                </button>
              )}

              <button onClick={handleSave} disabled={!form.name.trim()} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                {modal.mode === 'add' ? 'Ajouter le compte' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
