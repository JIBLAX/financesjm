import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Pencil, X, Check, Plus, Minus } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/constants'
import type { FinanceStore, MonthlySnapshot } from '@/types/finance'

interface Props {
  store: FinanceStore
  onSaveSnapshot: (s: MonthlySnapshot) => void
}

// Months that are manual (no connected data)
const MANUAL_CUTOFF = '2026-04' // April 2026+ is auto-connected

const ASSET_CLASSES = [
  { key: 'crypto', label: 'Crypto', emoji: '🪙' },
  { key: 'assurance_vie', label: 'Assurance Vie', emoji: '🛡️' },
  { key: 'livret', label: 'Livret épargne', emoji: '💰' },
  { key: 'actions_etf', label: 'Actions / ETF', emoji: '📈' },
  { key: 'immobilier', label: 'Immobilier', emoji: '🏠' },
  { key: 'cash', label: 'Cash / Comptes', emoji: '🏦' },
  { key: 'autres', label: 'Autres actifs', emoji: '📦' },
]

function getAllMonthKeys(): string[] {
  const keys: string[] = []
  const start = new Date(2026, 0) // Jan 2026
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth())
  const d = new Date(start)
  while (d <= end) {
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  return keys.reverse()
}

function isManualMonth(monthKey: string): boolean {
  return monthKey < MANUAL_CUTOFF
}

interface FormState {
  totalIncomeBank: string
  totalIncomeCash: string
  totalExpenses: string
  totalDebts: string
  assetBreakdown: Record<string, string>
}

function emptyForm(): FormState {
  return {
    totalIncomeBank: '',
    totalIncomeCash: '',
    totalExpenses: '',
    totalDebts: '',
    assetBreakdown: {},
  }
}

export const HistoriquePage: React.FC<Props> = ({ store, onSaveSnapshot }) => {
  const navigate = useNavigate()
  const months = useMemo(() => getAllMonthKeys(), [])
  const [editingMonth, setEditingMonth] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const snapshotMap = useMemo(() =>
    new Map(store.monthlySnapshots.map(s => [s.monthKey, s])),
    [store.monthlySnapshots]
  )

  const openEdit = (monthKey: string) => {
    const existing = snapshotMap.get(monthKey)
    if (existing) {
      setForm({
        totalIncomeBank: String(existing.totalIncomeBank || ''),
        totalIncomeCash: String(existing.totalIncomeCash || ''),
        totalExpenses: String(existing.totalExpenses || ''),
        totalDebts: String(existing.totalDebts || ''),
        assetBreakdown: Object.fromEntries(
          Object.entries(existing.assetBreakdown || {}).map(([k, v]) => [k, String(v)])
        ),
      })
    } else {
      setForm(emptyForm())
    }
    setEditingMonth(monthKey)
  }

  const handleSave = () => {
    if (!editingMonth) return
    const assetBreakdown: Record<string, number> = {}
    Object.entries(form.assetBreakdown).forEach(([k, v]) => {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) assetBreakdown[k] = n
    })
    const totalAssets = Object.values(assetBreakdown).reduce((s, v) => s + v, 0)
    const incomeBank = parseFloat(form.totalIncomeBank) || 0
    const incomeCash = parseFloat(form.totalIncomeCash) || 0
    const expenses = parseFloat(form.totalExpenses) || 0
    const debts = parseFloat(form.totalDebts) || 0
    const existing = snapshotMap.get(editingMonth)
    const snapshot: MonthlySnapshot = {
      id: existing?.id || crypto.randomUUID(),
      monthKey: editingMonth,
      totalIncomeBank: incomeBank,
      totalIncomeCash: incomeCash,
      totalExpenses: expenses,
      totalAssets,
      totalDebts: debts,
      netWorth: totalAssets - debts,
      isManual: true,
      assetBreakdown,
      dismissed: existing?.dismissed,
    }
    onSaveSnapshot(snapshot)
    setEditingMonth(null)
  }

  const setAssetValue = (key: string, val: string) => {
    setForm(f => ({ ...f, assetBreakdown: { ...f.assetBreakdown, [key]: val } }))
  }

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Historique</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Bilan mensuel — toutes périodes</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[11px] text-muted-foreground">Saisie manuelle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-muted-foreground">Données connectées</span>
        </div>
      </div>

      {/* Month list */}
      <div className="space-y-2">
        {months.map(monthKey => {
          const snapshot = snapshotMap.get(monthKey)
          const isManual = isManualMonth(monthKey)
          const isCurrent = monthKey === getCurrentMonthKey()
          const totalIncome = snapshot ? snapshot.totalIncomeBank + snapshot.totalIncomeCash : null
          const hasData = !!snapshot

          return (
            <FinanceCard key={monthKey}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isManual ? 'bg-primary' : 'bg-emerald-500'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(monthKey)}</p>
                      {isCurrent && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">En cours</span>}
                    </div>
                    {hasData ? (
                      <div className="flex gap-3 mt-0.5">
                        {totalIncome !== null && <span className="text-[11px] text-emerald-400">+{formatCurrency(totalIncome)}</span>}
                        {snapshot!.totalExpenses > 0 && <span className="text-[11px] text-rose-400">−{formatCurrency(snapshot!.totalExpenses)}</span>}
                        {snapshot!.totalAssets > 0 && <span className="text-[11px] text-blue-400">Actifs {formatCurrency(snapshot!.totalAssets)}</span>}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                        {isManual ? 'Aucune donnée — cliquer pour saisir' : 'Données auto'}
                      </p>
                    )}
                  </div>
                </div>
                {isManual ? (
                  <button
                    onClick={() => openEdit(monthKey)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium flex-shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                    {hasData ? 'Modifier' : 'Saisir'}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/mois')}
                    className="flex items-center gap-1 text-muted-foreground flex-shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Asset breakdown preview */}
              {hasData && snapshot!.assetBreakdown && Object.keys(snapshot!.assetBreakdown).length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(snapshot!.assetBreakdown).map(([key, val]) => {
                      const cls = ASSET_CLASSES.find(c => c.key === key)
                      return (
                        <div key={key} className="flex items-center gap-1 bg-muted/30 rounded-lg px-2 py-0.5">
                          <span className="text-[10px]">{cls?.emoji || '📦'}</span>
                          <span className="text-[10px] text-muted-foreground">{cls?.label || key}</span>
                          <span className="text-[10px] font-semibold text-foreground">{formatCurrency(val)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </FinanceCard>
          )
        })}
      </div>

      {/* Edit modal */}
      {editingMonth && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={() => setEditingMonth(null)}>
          <div
            className="bg-card w-full max-w-lg rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(editingMonth)}</h3>
                <p className="text-[11px] text-primary mt-0.5">Saisie manuelle du bilan</p>
              </div>
              <button onClick={() => setEditingMonth(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Entrées */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entrées</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Revenus bancaires</label>
                  <input
                    type="number" inputMode="decimal"
                    className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                    placeholder="0 €"
                    value={form.totalIncomeBank}
                    onFocus={e => e.target.select()}
                    onChange={e => setForm(f => ({ ...f, totalIncomeBank: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Revenus en espèces</label>
                  <input
                    type="number" inputMode="decimal"
                    className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                    placeholder="0 €"
                    value={form.totalIncomeCash}
                    onFocus={e => e.target.select()}
                    onChange={e => setForm(f => ({ ...f, totalIncomeCash: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Dépenses */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dépenses</p>
              <input
                type="number" inputMode="decimal"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                placeholder="0 €"
                value={form.totalExpenses}
                onFocus={e => e.target.select()}
                onChange={e => setForm(f => ({ ...f, totalExpenses: e.target.value }))}
              />
            </div>

            {/* Dettes */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dettes totales</p>
              <input
                type="number" inputMode="decimal"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                placeholder="0 €"
                value={form.totalDebts}
                onFocus={e => e.target.select()}
                onChange={e => setForm(f => ({ ...f, totalDebts: e.target.value }))}
              />
            </div>

            {/* Actifs */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actifs</p>
              <div className="space-y-2">
                {ASSET_CLASSES.map(cls => (
                  <div key={cls.key} className="flex items-center gap-2">
                    <span className="text-base w-6 flex-shrink-0">{cls.emoji}</span>
                    <span className="text-[11px] text-muted-foreground w-28 flex-shrink-0">{cls.label}</span>
                    <input
                      type="number" inputMode="decimal"
                      className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                      placeholder="0 €"
                      value={form.assetBreakdown[cls.key] || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setAssetValue(cls.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Total preview */}
              {Object.values(form.assetBreakdown).some(v => parseFloat(v) > 0) && (
                <div className="mt-3 flex justify-between items-center bg-muted/30 rounded-xl px-3 py-2">
                  <span className="text-xs text-muted-foreground">Total actifs</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(Object.values(form.assetBreakdown).reduce((s, v) => s + (parseFloat(v) || 0), 0))}
                  </span>
                </div>
              )}
            </div>

            {/* Bilan preview */}
            {(form.totalIncomeBank || form.totalIncomeCash || form.totalExpenses) && (
              <div className="mb-4 bg-muted/20 rounded-xl p-3 border border-border/30">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Aperçu du bilan</p>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Entrées totales</span>
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency((parseFloat(form.totalIncomeBank) || 0) + (parseFloat(form.totalIncomeCash) || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Dépenses</span>
                  <span className="text-rose-400 font-semibold">−{formatCurrency(parseFloat(form.totalExpenses) || 0)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-border/30">
                  <span className="text-muted-foreground font-semibold">Solde net</span>
                  <span className={`font-bold ${((parseFloat(form.totalIncomeBank) || 0) + (parseFloat(form.totalIncomeCash) || 0) - (parseFloat(form.totalExpenses) || 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(
                      (parseFloat(form.totalIncomeBank) || 0) +
                      (parseFloat(form.totalIncomeCash) || 0) -
                      (parseFloat(form.totalExpenses) || 0)
                    )}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              <Check className="w-4 h-4 inline mr-1.5" />
              Enregistrer le bilan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
