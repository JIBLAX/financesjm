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
}

// Account type order for Répartition section
const TYPE_ORDER: Record<string, number> = { pro: 0, courant: 1, livret: 2, epargne_projet: 3, liquide: 4 }

const FAMILY_SECTIONS: { key: OperationFamily; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'revenu', label: 'Revenus', color: 'text-emerald-400', bgColor: 'bg-emerald-500/5', borderColor: 'border-emerald-500/20' },
  { key: 'charge_fixe', label: 'Charges fixes', color: 'text-blue-400', bgColor: 'bg-blue-500/5', borderColor: 'border-blue-500/15' },
  { key: 'charge_variable', label: 'Charges variables', color: 'text-amber-400', bgColor: 'bg-amber-500/5', borderColor: 'border-amber-500/15' },
]

type ViewMode = 'perso' | 'pro' | 'repartition'

export const VuePage: React.FC<Props> = ({ store, journal, onUpdateJournal, onUpdateBudget }) => {
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('perso')
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

  // Allocation auto
  const allocation = useMemo(() => {
    const rules = store.settings.allocationRules
    const incomeBank = totals.revActual || totals.revForecast
    const proAmount = incomeBank * (rules.proPercent / 100)
    const personalBase = incomeBank * (rules.personalBasePercent / 100)
    const bourso = personalBase * (rules.boursoPercent / 100)
    const livretA = personalBase * (rules.livretAPercent / 100)
    const lep = personalBase * (rules.lepPercent / 100)
    const cashBase = incomeBank - proAmount - personalBase
    const cashLiberte = cashBase * (rules.cashLibertePercent / 100)
    const cashSecurite = cashBase * (rules.cashSecurityPercent / 100)
    const cashVoyage = cashBase * (rules.cashVoyagePercent / 100)
    return { proAmount, bourso, livretA, lep, cashLiberte, cashSecurite, cashVoyage }
  }, [store.settings.allocationRules, totals])

  // Répartition — active accounts sorted by type
  const repartitionAccounts = useMemo(() => {
    return store.accounts
      .filter(a => a.isActive && a.type !== 'dette')
      .sort((a, b) => {
        const ao = TYPE_ORDER[a.type] ?? 99
        const bo = TYPE_ORDER[b.type] ?? 99
        return ao - bo
      })
      .map(a => {
        // Determine allocation amount based on account id/type
        let prevu = 0
        if (a.id === 'qonto' || (a.type === 'pro' && a.id !== 'bunq-fiscal')) prevu = allocation.proAmount
        else if (a.id === 'bourso' || a.type === 'courant') prevu = allocation.bourso
        else if (a.subtype && a.subtype.toLowerCase().includes('livret a')) prevu = allocation.livretA
        else if (a.subtype && a.subtype.toLowerCase().includes('lep')) prevu = allocation.lep
        else if (a.name.toLowerCase().includes('liberté') || a.name.toLowerCase().includes('liberte')) prevu = allocation.cashLiberte
        else if (a.name.toLowerCase().includes('sécurité') || a.name.toLowerCase().includes('securite')) prevu = allocation.cashSecurite
        else if (a.group === 'Voyage' && a.type === 'liquide') prevu = allocation.cashVoyage
        return { account: a, prevu, reel: a.currentBalance }
      })
  }, [store.accounts, allocation])

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

      {/* Summary 3 tiles */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
          <p className="text-[9px] text-emerald-400/70 uppercase tracking-wider font-semibold mb-0.5">Revenus</p>
          <p className="text-base font-black text-emerald-400">{formatCurrency(totals.revActual || totals.revForecast)}</p>
          {totals.revForecast > 0 && totals.revActual > 0 && totals.revActual !== totals.revForecast && (
            <p className="text-[9px] text-muted-foreground mt-0.5">prévu {formatCurrency(totals.revForecast)}</p>
          )}
        </div>
        <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-3 text-center">
          <p className="text-[9px] text-rose-400/70 uppercase tracking-wider font-semibold mb-0.5">Dépenses</p>
          <p className="text-base font-black text-rose-400">{formatCurrency(totals.chargeActual || totals.chargeForecast)}</p>
          {totals.chargeForecast > 0 && totals.chargeActual > 0 && totals.chargeActual !== totals.chargeForecast && (
            <p className="text-[9px] text-muted-foreground mt-0.5">prévu {formatCurrency(totals.chargeForecast)}</p>
          )}
        </div>
        <div className={`rounded-2xl p-3 text-center ${totals.solde >= 0 ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-rose-500/5 border border-rose-500/20'}`}>
          <p className={`text-[9px] uppercase tracking-wider font-semibold mb-0.5 ${totals.solde >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>Solde</p>
          <p className={`text-base font-black ${totals.solde >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(totals.solde)}</p>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Bancaire</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">Prévu <span className="font-semibold text-foreground">{formatCurrency(totals.bancaireForecast)}</span></span>
              <span className="text-muted-foreground">Réel <span className="font-semibold text-emerald-400">{formatCurrency(totals.bancaireActual)}</span></span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Liquide</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">Prévu <span className="font-semibold text-foreground">{formatCurrency(totals.liquideForecast)}</span></span>
              <span className="text-muted-foreground">Réel <span className="font-semibold text-emerald-400">{formatCurrency(totals.liquideActual)}</span></span>
            </div>
          </div>
        </div>
      </FinanceCard>


      {/* 3-button tab switch */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-2xl">
        {([
          { id: 'perso', label: 'Perso' },
          { id: 'pro', label: 'Pro' },
          { id: 'repartition', label: 'Répartition' },
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

      {/* Répartition tab */}
      {viewMode === 'repartition' && (
        <FinanceCard>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Répartition prévue</h3>
          <div className="grid grid-cols-[1fr_5rem_5rem] gap-x-2 mb-2">
            <span className="text-xs text-muted-foreground">Compte</span>
            <span className="text-xs text-muted-foreground text-right">Prévu</span>
            <span className="text-xs text-muted-foreground text-right">Réel</span>
          </div>
          <div className="space-y-2">
            {repartitionAccounts.map(({ account, prevu, reel }) => (
              <div key={account.id} className="grid grid-cols-[1fr_5rem_5rem] gap-x-2 items-center">
                <span className="text-xs text-foreground truncate">{account.name}</span>
                <span className="text-xs text-muted-foreground text-right">{formatCurrency(prevu)}</span>
                <span className={`text-xs font-semibold text-right ${reel >= 0 ? 'text-foreground' : 'text-rose-400'}`}>{formatCurrency(reel)}</span>
              </div>
            ))}
          </div>
        </FinanceCard>
      )}
    </div>
  )
}