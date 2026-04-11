import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/constants'
import type { FinanceStore, OperationFamily } from '@/types/finance'

interface Props {
  store: FinanceStore
  journal: Record<string, string>
  onUpdateJournal: (monthKey: string, note: string) => void
  onUpdateBudget: (monthKey: string, categoryId: string, amount: number) => void
  onUpdateInjection: (monthKey: string, accountId: string, amount: number) => void
}


const FAMILY_SECTIONS: { key: OperationFamily; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'revenu', label: 'Revenus', color: 'text-emerald-400', bgColor: 'bg-emerald-500/5', borderColor: 'border-emerald-500/20' },
  { key: 'charge_fixe', label: 'Charges fixes', color: 'text-blue-400', bgColor: 'bg-blue-500/5', borderColor: 'border-blue-500/15' },
  { key: 'charge_variable', label: 'Charges variables', color: 'text-amber-400', bgColor: 'bg-amber-500/5', borderColor: 'border-amber-500/15' },
]

type ViewMode = 'perso' | 'pro' | 'repartition' | 'simulateur'

export const VuePage: React.FC<Props> = ({ store, journal, onUpdateJournal, onUpdateBudget, onUpdateInjection }) => {
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('perso')
  const [editingInjection, setEditingInjection] = useState<string | null>(null) // accountId
  const [injectionInput, setInjectionInput] = useState('')
  const [simBancaire, setSimBancaire] = useState('')
  const [simCash, setSimCash] = useState('')
  const currentMonthKey = getCurrentMonthKey()

  const navigateMonth = (dir: number) => {
    const [y, m] = monthKey.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    const newKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    setMonthKey(newKey)
    setEditingBudget(null)
  }

  // All operations for this month (both perso + pro)
  const operations = useMemo(
    () => store.operations.filter(op => op.monthKey === monthKey),
    [store.operations, monthKey]
  )

  // Monthly budgets for this month
  const budgets = store.monthlyBudgets[monthKey] || {}

  // All categories grouped by family
  const allCategories = useMemo(() => {
    const result: Record<OperationFamily, { id: string; name: string; icon: string; forecast: number; actual: number }[]> = {
      revenu: [], charge_fixe: [], charge_variable: [],
    }
    store.opCategories.forEach(cat => {
      const ops = operations.filter(op => op.categoryId === cat.id)
      const actual = ops.reduce((s, op) => s + op.actual, 0)
      const forecast = budgets[cat.id] || 0
      result[cat.family].push({ id: cat.id, name: cat.name, icon: cat.icon, forecast, actual })
    })
    // Sort by order
    Object.keys(result).forEach(fam => {
      const familyCats = store.opCategories.filter(c => c.family === fam).map(c => c.id)
      result[fam as OperationFamily].sort((a, b) => familyCats.indexOf(a.id) - familyCats.indexOf(b.id))
    })
    return result
  }, [store.opCategories, operations, budgets])

  // Totals
  const totals = useMemo(() => {
    const revActual = allCategories.revenu.reduce((s, c) => s + c.actual, 0)
    const revForecast = allCategories.revenu.reduce((s, c) => s + c.forecast, 0)
    const chargeActual = [...allCategories.charge_fixe, ...allCategories.charge_variable].reduce((s, c) => s + c.actual, 0)
    const chargeForecast = [...allCategories.charge_fixe, ...allCategories.charge_variable].reduce((s, c) => s + c.forecast, 0)
    const solde = revActual - chargeActual
    const soldeForecast = revForecast - chargeForecast

    // Bancaire / Liquide split from note field
    const revOps = operations.filter(op => op.family === 'revenu')
    const liquideActual = revOps.filter(op => op.note && op.note.toLowerCase().includes('espèces')).reduce((s, op) => s + op.actual, 0)
    const liquideForecast = revOps.filter(op => op.note && op.note.toLowerCase().includes('espèces')).reduce((s, op) => s + op.forecast, 0)
    const bancaireActual = revActual - liquideActual
    const bancaireForecast = revOps.filter(op => !op.note || !op.note.toLowerCase().includes('espèces')).reduce((s, op) => s + op.forecast, 0)

    return { revActual, revForecast, chargeActual, chargeForecast, solde, soldeForecast, bancaireActual, bancaireForecast, liquideActual, liquideForecast }
  }, [allCategories, operations])

  // Fallback: si pas d'opérations pour ce mois, utiliser les données de l'historique
  const snapshot = useMemo(
    () => store.monthlySnapshots.find(s => s.monthKey === monthKey),
    [store.monthlySnapshots, monthKey]
  )
  const hasOpsData = totals.revActual > 0 || totals.chargeActual > 0
  const useSnapshotFallback = !hasOpsData && !!snapshot && (
    snapshot.totalIncomeBank > 0 || snapshot.totalIncomeCash > 0 ||
    (snapshot.totalRevenuesPro || 0) > 0 || snapshot.totalExpenses > 0 ||
    (snapshot.totalChargesPro || 0) > 0
  )
  const displayRevActual    = useSnapshotFallback ? snapshot!.totalIncomeBank + snapshot!.totalIncomeCash + (snapshot!.totalRevenuesPro || 0) : totals.revActual
  const displayChargeActual = useSnapshotFallback ? snapshot!.totalExpenses + (snapshot!.totalChargesPro || 0) : totals.chargeActual
  const displayBancaire     = useSnapshotFallback ? snapshot!.totalIncomeBank : totals.bancaireActual
  const displayLiquide      = useSnapshotFallback ? snapshot!.totalIncomeCash : totals.liquideActual

  // Répartition — computed from allocation rules groups
  const repartitionGroups = useMemo(() => {
    return store.settings.allocationRules.groups.map(group => {
      const basePrevu = group.incomeType === 'bancaire' ? totals.bancaireForecast : totals.liquideForecast
      const baseReel  = group.incomeType === 'bancaire' ? totals.bancaireActual  : totals.liquideActual
      const groupTotal = group.slots.reduce((s, sl) => s + sl.percent, 0)
      return {
        id: group.id,
        label: group.label,
        incomeType: group.incomeType,
        groupTotal,
        slots: group.slots.map(slot => {
          const acc = store.accounts.find(a => a.id === slot.accountId)
          return {
            accountId: slot.accountId,
            name: acc?.name || slot.label,
            institution: acc?.institution || '',
            percent: slot.percent,
            prevu: basePrevu * (slot.percent / 100),
            reel:  baseReel  * (slot.percent / 100),
          }
        }),
      }
    })
  }, [store.settings.allocationRules, store.accounts, totals])

  // Over-budget categories
  const overBudgetCats = useMemo(() => {
    const result: string[] = []
    ;[...allCategories.charge_fixe, ...allCategories.charge_variable].forEach(c => {
      if (c.forecast > 0 && c.actual > c.forecast * 1.05) result.push(c.name)
    })
    return result
  }, [allCategories])

  const startEditBudget = (catId: string, currentValue: number) => {
    setEditingBudget(catId)
    setBudgetInput(currentValue > 0 ? String(currentValue) : '')
  }

  const saveBudget = () => {
    if (editingBudget) {
      onUpdateBudget(monthKey, editingBudget, parseFloat(budgetInput) || 0)
      setEditingBudget(null)
    }
  }

  const startEditInjection = (accountId: string, current: number) => {
    setEditingInjection(accountId)
    setInjectionInput(current > 0 ? String(current) : '')
  }

  const saveInjection = () => {
    if (editingInjection) {
      onUpdateInjection(monthKey, editingInjection, parseFloat(injectionInput) || 0)
      setEditingInjection(null)
    }
  }

  const injections = store.allocationInjections?.[monthKey] || {}

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-foreground uppercase tracking-wider shrink-0">Vue</h1>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigateMonth(-1)} className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(monthKey)}</span>
        <button onClick={() => navigateMonth(1)} disabled={monthKey >= currentMonthKey} className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground active:bg-muted/50 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Historique fallback notice */}
      {useSnapshotFallback && (
        <div className="rounded-xl bg-blue-500/8 border border-blue-500/20 px-3 py-2 flex items-center gap-2">
          <span className="text-sm">📋</span>
          <p className="text-[11px] text-blue-300">Données issues de l'historique — pas d'opérations pour ce mois</p>
        </div>
      )}

      {/* Summary 2 tiles */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
          <p className="text-[9px] text-emerald-400/70 uppercase tracking-wider font-semibold mb-0.5">Revenus</p>
          <p className="text-base font-black text-emerald-400">{formatCurrency(displayRevActual)}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">prévu {formatCurrency(totals.revForecast)}</p>
        </div>
        <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-3 text-center">
          <p className="text-[9px] text-rose-400/70 uppercase tracking-wider font-semibold mb-0.5">Dépenses</p>
          <p className="text-base font-black text-rose-400">{formatCurrency(displayChargeActual)}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">prévu {formatCurrency(totals.chargeForecast)}</p>
        </div>
      </div>

      {/* Over-budget alerts */}
      {overBudgetCats.length > 0 && (
        <div className="rounded-2xl bg-amber-500/8 border border-amber-500/25 px-4 py-3">
          <p className="text-xs text-amber-400 font-semibold">⚠ Dépassement : {overBudgetCats.join(', ')}</p>
        </div>
      )}

      {/* Détails Revenus */}
      <FinanceCard>
        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Détails Revenus</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bancaire</p>
            <p className="text-lg font-black text-emerald-400">{formatCurrency(displayBancaire)}</p>
          </div>
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Espèces</p>
            <p className="text-lg font-black text-blue-400">{formatCurrency(displayLiquide)}</p>
          </div>
        </div>
      </FinanceCard>


      {/* 4-button tab switch */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-2xl">
        {([
          { id: 'perso',      label: 'Perso' },
          { id: 'pro',        label: 'Pro' },
          { id: 'repartition',label: 'Répartition' },
          { id: 'simulateur', label: 'Simul' },
        ] as { id: ViewMode; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category sections — PERSO or PRO */}
      {(viewMode === 'perso' || viewMode === 'pro') && FAMILY_SECTIONS.map(({ key, label, color, bgColor, borderColor }) => {
        const cats = allCategories[key].filter(cat => {
          const opCat = store.opCategories.find(c => c.id === cat.id)
          return opCat?.scope === viewMode
        })
        if (cats.length === 0) return null
        const sectionForecast = cats.reduce((s, c) => s + c.forecast, 0)
        const sectionActual = cats.reduce((s, c) => s + c.actual, 0)
        const isRev = key === 'revenu'

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</h2>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-muted-foreground">Prévu <span className="font-semibold text-foreground">{formatCurrency(sectionForecast)}</span></span>
                <span className="text-muted-foreground">Réel <span className={`font-semibold ${isRev ? 'text-emerald-400' : 'text-foreground'}`}>{formatCurrency(sectionActual)}</span></span>
              </div>
            </div>
            <div className={`rounded-2xl border p-3 space-y-0 ${bgColor} ${borderColor}`}>
              {cats.map((cat, i) => {
                const ecart = cat.actual - cat.forecast
                const hasEcart = cat.forecast > 0 && cat.actual > 0
                const isOver = !isRev && cat.actual > cat.forecast * 1.05 && cat.forecast > 0

                return (
                  <div key={cat.id}>
                    <div className="flex items-center py-2">
                      <span className="text-sm mr-2">{cat.icon}</span>
                      <span className="text-xs font-semibold text-foreground flex-1 min-w-0 truncate">{cat.name}</span>
                      {isOver && (
                        <span className="text-[8px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full mr-2 shrink-0">DÉPASSÉ</span>
                      )}
                      <div className="flex items-center gap-2 shrink-0">
                        {editingBudget === cat.id ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            className="w-20 bg-muted/50 rounded-lg px-2 py-1 text-xs text-foreground outline-none text-right"
                            value={budgetInput}
                            autoFocus
                            onFocus={e => e.target.select()}
                            onChange={e => setBudgetInput(e.target.value)}
                            onBlur={saveBudget}
                            onKeyDown={e => e.key === 'Enter' && saveBudget()}
                            placeholder="Prévu"
                          />
                        ) : (
                          <button
                            onClick={() => startEditBudget(cat.id, cat.forecast)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            title="Modifier le prévisionnel"
                          >
                            <span className={cat.forecast > 0 ? 'text-foreground/60 font-medium' : 'text-muted-foreground/40'}>
                              {cat.forecast > 0 ? formatCurrency(cat.forecast) : '—'}
                            </span>
                            <Pencil className="w-2.5 h-2.5 opacity-40" />
                          </button>
                        )}
                        <span className={`text-xs font-semibold w-20 text-right ${cat.actual > 0 ? (isRev ? 'text-emerald-400' : 'text-foreground') : 'text-muted-foreground/30'}`}>
                          {cat.actual > 0 ? formatCurrency(cat.actual) : '—'}
                        </span>
                      </div>
                    </div>
                    {!isRev && cat.forecast > 0 && cat.actual > 0 && (
                      <div className="ml-6 mb-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-400' : 'bg-blue-400/50'}`}
                          style={{ width: `${Math.min(100, (cat.actual / cat.forecast) * 100)}%` }}
                        />
                      </div>
                    )}
                    {hasEcart && (
                      <div className="ml-6 mb-1">
                        <span className={`text-[10px] font-bold ${isRev ? (ecart >= 0 ? 'text-emerald-400' : 'text-rose-400') : (ecart > 0 ? 'text-rose-400' : 'text-emerald-400')}`}>
                          {ecart >= 0 ? '+' : ''}{formatCurrency(ecart)}
                        </span>
                      </div>
                    )}
                    {i < cats.length - 1 && <div className="border-b border-border/15" />}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Simulateur tab */}
      {viewMode === 'simulateur' && (() => {
        const bancaire = parseFloat(simBancaire) || 0
        const cash     = parseFloat(simCash)     || 0
        const total    = bancaire + cash

        const simGroups = store.settings.allocationRules.groups.map(group => {
          const base = group.incomeType === 'bancaire' ? bancaire : cash
          const groupTotal = group.slots.reduce((s, sl) => s + sl.percent, 0)
          const slots = group.slots.map(slot => {
            const acc = store.accounts.find(a => a.id === slot.accountId)
            return {
              name: acc?.name || slot.label,
              institution: acc?.institution || '',
              percent: slot.percent,
              amount: base * (slot.percent / 100),
            }
          })
          return { id: group.id, label: group.label, incomeType: group.incomeType, groupTotal, groupAmount: base * (groupTotal / 100), slots }
        })

        const totalDistribue = simGroups.reduce((s, g) => s + g.groupAmount, 0)

        return (
          <div className="space-y-4">
            {/* Inputs */}
            <FinanceCard>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">💡 Simuler une distribution</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block">Revenus bancaires (virement)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" inputMode="decimal"
                      className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-base font-bold text-foreground outline-none border border-border/30 focus:border-primary/50"
                      placeholder="0"
                      value={simBancaire}
                      onFocus={e => e.target.select()}
                      onChange={e => setSimBancaire(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground font-medium">€</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block">Revenus en espèces (cash)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" inputMode="decimal"
                      className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-base font-bold text-foreground outline-none border border-border/30 focus:border-primary/50"
                      placeholder="0"
                      value={simCash}
                      onFocus={e => e.target.select()}
                      onChange={e => setSimCash(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground font-medium">€</span>
                  </div>
                </div>
                {total > 0 && (
                  <div className="flex items-center justify-between bg-primary/8 rounded-xl px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Total brut simulé</span>
                    <span className="text-sm font-extrabold text-primary">{formatCurrency(total)}</span>
                  </div>
                )}
              </div>
            </FinanceCard>

            {/* Distribution results */}
            {total > 0 && simGroups.map(group => (
              <FinanceCard key={group.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{group.label}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {group.incomeType === 'bancaire' ? `Sur ${formatCurrency(bancaire)} bancaire` : `Sur ${formatCurrency(cash)} cash`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-foreground">{formatCurrency(group.groupAmount)}</p>
                    <p className="text-[10px] text-muted-foreground">{Math.round(group.groupTotal * 10) / 10}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {group.slots.map((slot, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1 h-1 rounded-full bg-primary/50 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-foreground truncate">{slot.name}</p>
                          {slot.institution && <p className="text-[10px] text-muted-foreground/50 truncate">{slot.institution}</p>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-foreground">{formatCurrency(slot.amount)}</p>
                        <p className="text-[10px] text-muted-foreground">{slot.percent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Barre de progression du groupe */}
                <div className="mt-3 h-1 bg-muted/30 rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${Math.min(100, group.groupTotal)}%` }} />
                </div>
              </FinanceCard>
            ))}

            {/* Total récap */}
            {total > 0 && (
              <FinanceCard>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Récapitulatif</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Total brut</span>
                    <span className="text-xs font-bold text-foreground">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Distribué</span>
                    <span className="text-xs font-bold text-emerald-400">{formatCurrency(totalDistribue)}</span>
                  </div>
                  {Math.abs(total - totalDistribue) > 0.01 && (
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Non distribué</span>
                      <span className="text-xs font-bold text-amber-400">{formatCurrency(total - totalDistribue)}</span>
                    </div>
                  )}
                  <div className="h-px bg-border/30 my-1" />
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Taux de distribution</span>
                    <span className="text-xs font-bold text-foreground">{total > 0 ? Math.round((totalDistribue / total) * 100) : 0}%</span>
                  </div>
                </div>
              </FinanceCard>
            )}
          </div>
        )
      })()}

      {/* Répartition tab */}
      {viewMode === 'repartition' && (
        <div className="space-y-3">
          {repartitionGroups.map(group => (
            <FinanceCard key={group.id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{group.label}</h3>
                <span className="text-[10px] text-muted-foreground">{Math.round(group.groupTotal * 10) / 10}%</span>
              </div>
              <div className="grid grid-cols-[1fr_4.5rem_5.5rem] gap-x-2 mb-2">
                <span className="text-[10px] text-muted-foreground">Compte</span>
                <span className="text-[10px] text-muted-foreground text-right">Prévu</span>
                <span className="text-[10px] text-muted-foreground text-right">Injecté ✎</span>
              </div>
              <div className="space-y-2.5">
                {group.slots.map((slot, i) => {
                  const injected = injections[slot.accountId] || 0
                  const isEditing = editingInjection === slot.accountId
                  return (
                    <div key={i} className="grid grid-cols-[1fr_4.5rem_5.5rem] gap-x-2 items-center">
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">{slot.name}</p>
                        {slot.institution && <p className="text-[10px] text-muted-foreground/50 truncate">{slot.institution}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground text-right">{formatCurrency(slot.prevu)}</span>
                      {isEditing ? (
                        <input
                          type="number" inputMode="decimal"
                          className="w-full bg-muted/60 rounded-lg px-2 py-1 text-xs text-foreground outline-none text-right"
                          value={injectionInput}
                          autoFocus
                          onFocus={e => e.target.select()}
                          onChange={e => setInjectionInput(e.target.value)}
                          onBlur={saveInjection}
                          onKeyDown={e => e.key === 'Enter' && saveInjection()}
                          placeholder="0"
                        />
                      ) : (
                        <button
                          onClick={() => startEditInjection(slot.accountId, injected)}
                          className="flex items-center justify-end gap-1 group"
                        >
                          <span className={`text-xs font-semibold ${injected > 0 ? 'text-emerald-400' : 'text-muted-foreground/30'}`}>
                            {formatCurrency(injected)}
                          </span>
                          <Pencil className="w-2.5 h-2.5 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </FinanceCard>
          ))}
        </div>
      )}
    </div>
  )
}