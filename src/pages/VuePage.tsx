import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, getPreviousMonthKey, getNextMonthKey } from '@/lib/constants'
import type { FinanceStore, OperationFamily, OperationScope } from '@/types/finance'

interface Props {
  store: FinanceStore
  journal: Record<string, string>
  onUpdateJournal: (monthKey: string, note: string) => void
}

const FAMILY_CFG: { key: OperationFamily; label: string; color: string; rowColor: string; borderColor: string }[] = [
  { key: 'revenu',          label: 'Revenus',          color: 'text-emerald-400', rowColor: 'bg-emerald-500/5',  borderColor: 'border-emerald-500/20' },
  { key: 'charge_fixe',     label: 'Charges fixes',    color: 'text-blue-400',    rowColor: 'bg-blue-500/5',     borderColor: 'border-blue-500/15'    },
  { key: 'charge_variable', label: 'Charges variables', color: 'text-amber-400',  rowColor: 'bg-amber-500/5',   borderColor: 'border-amber-500/15'   },
]

export const VuePage: React.FC<Props> = ({ store, journal, onUpdateJournal }) => {
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [scope, setScope] = useState<OperationScope>('perso')
  const [journalText, setJournalText] = useState(journal[monthKey] || '')
  const currentMonthKey = getCurrentMonthKey()
  const isPerso = scope === 'perso'

  const navigateMonth = (dir: number) => {
    const [y, m] = monthKey.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    const newKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    setMonthKey(newKey)
    setJournalText(journal[newKey] || '')
  }

  const operations = useMemo(
    () => store.operations.filter(op => op.monthKey === monthKey && op.scope === scope),
    [store.operations, monthKey, scope]
  )

  const byFamilyCategory = useMemo(() => {
    const result: Record<OperationFamily, Record<string, { name: string; icon: string; forecast: number; actual: number }>> = {
      charge_fixe: {}, charge_variable: {}, revenu: {},
    }
    operations.forEach(op => {
      if (!result[op.family]) return
      const cat = store.opCategories.find(c => c.id === op.categoryId)
      const catName = cat?.name || 'Divers'
      const catIcon = cat?.icon || '📦'
      if (!result[op.family][op.categoryId]) {
        result[op.family][op.categoryId] = { name: catName, icon: catIcon, forecast: 0, actual: 0 }
      }
      result[op.family][op.categoryId].forecast += op.forecast
      result[op.family][op.categoryId].actual += op.actual
    })
    return result
  }, [operations, store.opCategories])

  const totals = useMemo(() => {
    const revOps = operations.filter(op => op.family === 'revenu')
    const chargeOps = operations.filter(op => op.family !== 'revenu')
    const revForecast = revOps.reduce((s, op) => s + op.forecast, 0)
    const revActual = revOps.reduce((s, op) => s + op.actual, 0)
    const chargeForecast = chargeOps.reduce((s, op) => s + op.forecast, 0)
    const chargeActual = chargeOps.reduce((s, op) => s + op.actual, 0)
    const revDisplay = revActual || revForecast
    const chargeDisplay = chargeActual || chargeForecast
    const solde = revDisplay - chargeDisplay
    return { revForecast, revActual, chargeForecast, chargeActual, revDisplay, chargeDisplay, solde }
  }, [operations])

  const overBudgetCats = useMemo(() => {
    const result: string[] = []
    Object.values(byFamilyCategory.charge_fixe).forEach(c => {
      if (c.forecast > 0 && c.actual > c.forecast * 1.05) result.push(c.name)
    })
    Object.values(byFamilyCategory.charge_variable).forEach(c => {
      if (c.forecast > 0 && c.actual > c.forecast * 1.05) result.push(c.name)
    })
    return result
  }, [byFamilyCategory])

  const handleJournalSave = () => onUpdateJournal(monthKey, journalText)

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider shrink-0">Vue</h1>
        <div className="flex items-center bg-muted/30 rounded-xl p-0.5 gap-0.5 flex-1 max-w-[140px] mx-auto">
          <button
            onClick={() => setScope('perso')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${isPerso
              ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.35)]'
              : 'text-muted-foreground'}`}>
            Perso
          </button>
          <button
            onClick={() => setScope('pro')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!isPerso
              ? 'bg-violet-500/20 text-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.35)]'
              : 'text-muted-foreground'}`}>
            Pro
          </button>
        </div>
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

      {operations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-5xl">📋</span>
          <p className="text-sm text-muted-foreground font-medium">Aucune opération pour ce mois</p>
          <p className="text-xs text-muted-foreground/60 text-center">Ajoutez vos opérations depuis<br/>l'onglet OPÉRATIONS</p>
        </div>
      ) : (
        <>
          {/* Summary 3 tiles */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
              <p className="text-[9px] text-emerald-400/70 uppercase tracking-wider font-semibold mb-0.5">Revenus</p>
              <p className="text-base font-black text-emerald-400">{formatCurrency(totals.revDisplay)}</p>
            </div>
            <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-3 text-center">
              <p className="text-[9px] text-rose-400/70 uppercase tracking-wider font-semibold mb-0.5">Dépenses</p>
              <p className="text-base font-black text-rose-400">{formatCurrency(totals.chargeDisplay)}</p>
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

          {/* Global forecast vs actual comparison */}
          {(totals.chargeForecast > 0 || totals.revForecast > 0) && (
            <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2.5">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Prévision vs Réel</h2>
              {totals.revForecast > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Revenus prévus</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/70">{formatCurrency(totals.revForecast)}</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(totals.revActual)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400/60 rounded-full transition-all"
                      style={{ width: `${Math.min(100, totals.revForecast > 0 ? (totals.revActual / totals.revForecast) * 100 : 0)}%` }} />
                  </div>
                </div>
              )}
              {totals.chargeForecast > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Charges prévues</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/70">{formatCurrency(totals.chargeForecast)}</span>
                      <span className={`font-bold ${totals.chargeActual > totals.chargeForecast ? 'text-rose-400' : 'text-foreground'}`}>{formatCurrency(totals.chargeActual)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${totals.chargeActual > totals.chargeForecast ? 'bg-rose-400' : 'bg-blue-400/60'}`}
                      style={{ width: `${Math.min(100, totals.chargeForecast > 0 ? (totals.chargeActual / totals.chargeForecast) * 100 : 0)}%` }} />
                  </div>
                </div>
              )}
              {totals.chargeForecast > 0 && totals.chargeActual > 0 && (
                <div className="flex items-center justify-between text-xs border-t border-border/30 pt-2">
                  <span className="text-muted-foreground">Écart charges</span>
                  <span className={`font-bold ${totals.chargeActual - totals.chargeForecast > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {totals.chargeActual - totals.chargeForecast > 0 ? '+' : ''}{formatCurrency(totals.chargeActual - totals.chargeForecast)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Per-family / per-category breakdown */}
          {FAMILY_CFG.map(({ key, label, color, rowColor, borderColor }) => {
            const cats = Object.values(byFamilyCategory[key] || {})
            if (cats.length === 0) return null
            const isRev = key === 'revenu'

            return (
              <div key={key}>
                <h2 className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</h2>
                <div className={`rounded-2xl border p-4 space-y-3 ${rowColor} ${borderColor}`}>
                  {cats.map((cat, i) => {
                    const ecart = cat.actual - cat.forecast
                    const hasEcart = cat.forecast > 0 && cat.actual > 0
                    const isOver = !isRev && cat.actual > cat.forecast * 1.05 && cat.forecast > 0
                    const ecartColor = isRev
                      ? (ecart >= 0 ? 'text-emerald-400' : 'text-rose-400')
                      : (ecart > 0 ? 'text-rose-400' : 'text-emerald-400')

                    return (
                      <div key={i}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm leading-none">{cat.icon}</span>
                          <span className="text-xs font-semibold text-foreground flex-1">{cat.name}</span>
                          {isOver && (
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">DÉPASSÉ</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 ml-6 text-xs">
                          {cat.forecast > 0 && (
                            <span className="text-muted-foreground/70">
                              Prévu <span className="text-foreground/60 font-medium">{formatCurrency(cat.forecast)}</span>
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            Réel <span className={`font-semibold ${cat.actual > 0 ? (isRev ? 'text-emerald-400' : 'text-foreground') : 'text-muted-foreground/40'}`}>
                              {cat.actual > 0 ? formatCurrency(cat.actual) : '—'}
                            </span>
                          </span>
                          {hasEcart && (
                            <span className={`font-bold ml-auto ${ecartColor}`}>
                              {ecart >= 0 ? '+' : ''}{formatCurrency(ecart)}
                            </span>
                          )}
                        </div>
                        {!isRev && cat.forecast > 0 && cat.actual > 0 && (
                          <div className="mt-1.5 h-1 bg-muted/30 rounded-full overflow-hidden ml-6">
                            <div
                              className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-400' : 'bg-blue-400/50'}`}
                              style={{ width: `${Math.min(100, (cat.actual / cat.forecast) * 100)}%` }}
                            />
                          </div>
                        )}
                        {i < cats.length - 1 && <div className="mt-2.5 border-b border-border/20" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Journal mensuel */}
      <FinanceCard>
        <h3 className="text-sm font-semibold text-foreground mb-2">📝 Note du mois</h3>
        <textarea
          className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
          placeholder="Comment s'est passé ce mois financièrement ?"
          maxLength={280} rows={3}
          value={journalText}
          onChange={e => setJournalText(e.target.value)}
          onBlur={handleJournalSave}
        />
        <p className="text-[10px] text-muted-foreground text-right mt-1">{journalText.length}/280</p>
      </FinanceCard>
    </div>
  )
}
