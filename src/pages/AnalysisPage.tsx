import React, { useMemo, useState } from 'react'
import { FinanceCard } from '@/components/FinanceCard'
import { SegmentedSwitch } from '@/components/SegmentedSwitch'
import { formatCurrency, getCurrentMonthKey, getPreviousMonthKey } from '@/lib/constants'
import type { FinanceStore } from '@/types/finance'

interface Props {
  store: FinanceStore
}

type Period = 'month' | '3months' | '6months' | '12months'
type Tab = 'analyse' | 'charges'

const CLASSIFICATION_META = {
  indispensable: { label: 'Indispensable', color: 'bg-muted-foreground/30', text: 'text-muted-foreground' },
  optimisable: { label: 'Optimisable', color: 'bg-amber-500/30', text: 'text-amber-400' },
  impulsive: { label: 'Impulsive', color: 'bg-destructive/30', text: 'text-destructive' },
}

export const AnalysisPage: React.FC<Props> = ({ store }) => {
  const [tab, setTab] = useState<Tab>('analyse')
  const [period, setPeriod] = useState<Period>('month')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const monthKey = getCurrentMonthKey()

  const monthKeys = useMemo(() => {
    const count = period === 'month' ? 1 : period === '3months' ? 3 : period === '6months' ? 6 : 12
    return Array.from({ length: count }, (_, i) => i === 0 ? monthKey : getPreviousMonthKey(monthKey, i))
  }, [period, monthKey])

  const prevMonthKeys = useMemo(() => {
    const count = period === 'month' ? 1 : period === '3months' ? 3 : period === '6months' ? 6 : 12
    return Array.from({ length: count }, (_, i) => getPreviousMonthKey(monthKey, count + i))
  }, [period, monthKey])

  const { categories, totalExpenses } = useMemo(() => {
    const txs = store.transactions.filter(t => monthKeys.includes(t.monthKey) && t.direction === 'expense')
    const prevTxs = store.transactions.filter(t => prevMonthKeys.includes(t.monthKey) && t.direction === 'expense')
    const totalExpenses = txs.reduce((s, t) => s + t.amount, 0)

    const catMap = new Map<string, { amount: number; prevAmount: number; catId: string }>()
    txs.forEach(t => {
      const e = catMap.get(t.categoryId) || { amount: 0, prevAmount: 0, catId: t.categoryId }
      e.amount += t.amount
      catMap.set(t.categoryId, e)
    })
    prevTxs.forEach(t => {
      const e = catMap.get(t.categoryId) || { amount: 0, prevAmount: 0, catId: t.categoryId }
      e.prevAmount += t.amount
      catMap.set(t.categoryId, e)
    })

    const categories = Array.from(catMap.values()).map(({ amount, prevAmount, catId }) => {
      const cat = store.categories.find(c => c.id === catId)
      const avg = prevAmount / Math.max(1, prevMonthKeys.length)
      const monthlyAmount = amount / Math.max(1, monthKeys.length)
      let status: 'normal' | 'warning' | 'danger' = 'normal'
      if (avg > 0 && monthlyAmount > avg * 1.5) status = 'danger'
      else if (avg > 0 && monthlyAmount > avg * 1.2) status = 'warning'
      const delta = prevAmount > 0 ? amount - prevAmount : 0
      const deltaPct = prevAmount > 0 ? Math.round(((amount - prevAmount) / prevAmount) * 100) : 0
      return { catId, name: cat?.name || catId, icon: cat?.icon || '📦', classification: cat?.classification || 'impulsive', amount, prevAmount, delta, deltaPct, status, color: cat?.color || '0 0% 50%' }
    }).sort((a, b) => b.amount - a.amount)

    return { categories, totalExpenses }
  }, [store, monthKeys, prevMonthKeys])

  // Charges tab data (current month only)
  const chargesData = useMemo(() => {
    const monthTx = store.transactions.filter(t => t.monthKey === monthKey && t.direction === 'expense')
    const recurring = monthTx.filter(t => t.isRecurring)
    const variable = monthTx.filter(t => !t.isRecurring)
    const totalFixed = recurring.reduce((s, t) => s + t.amount, 0)
    const totalVariable = variable.reduce((s, t) => s + t.amount, 0)

    const catMap = new Map<string, { name: string; icon: string; total: number }>()
    monthTx.forEach(t => {
      const cat = store.categories.find(c => c.id === t.categoryId)
      const name = cat?.name || 'Divers'
      const icon = cat?.icon || '📦'
      const existing = catMap.get(name) || { name, icon, total: 0 }
      catMap.set(name, { ...existing, total: existing.total + t.amount })
    })
    const byCategory = Array.from(catMap.values()).sort((a, b) => b.total - a.total)

    return { recurring, variable, byCategory, totalFixed, totalVariable }
  }, [store, monthKey])

  const maxAmount = categories[0]?.amount || 1
  const selectedDetail = selectedCat ? categories.find(c => c.catId === selectedCat) : null

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <h1 className="text-2xl font-extrabold text-white">Analyse</h1>

      {/* Tab switch */}
      <SegmentedSwitch
        options={[{ key: 'analyse', label: 'Analyse' }, { key: 'charges', label: 'Charges' }]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'analyse' && (
        <>
          {/* Period switch */}
          <SegmentedSwitch
            options={[
              { key: 'month',    label: 'Mois'  },
              { key: '3months',  label: '3 mois' },
              { key: '6months',  label: '6 mois' },
              { key: '12months', label: '12 mois' },
            ]}
            value={period}
            onChange={setPeriod}
          />

          {/* Bubble chart */}
          <FinanceCard className="p-4">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Carte des dépenses</p>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map(cat => {
                  const sizePct = Math.max(20, Math.min(80, (cat.amount / maxAmount) * 100))
                  const size = Math.max(48, Math.min(96, sizePct * 1.2))
                  const bgColor = cat.status === 'danger' ? 'bg-destructive/20 border-destructive/40' : cat.status === 'warning' ? 'bg-amber-500/20 border-amber-500/40' : 'bg-emerald-500/20 border-emerald-500/40'
                  return (
                    <button key={cat.catId} onClick={() => setSelectedCat(cat.catId === selectedCat ? null : cat.catId)}
                      className={`rounded-full border flex flex-col items-center justify-center transition-all ${bgColor} ${selectedCat === cat.catId ? 'ring-2 ring-primary' : ''}`}
                      style={{ width: size, height: size }}>
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-[9px] text-foreground/70 font-medium leading-tight">{formatCurrency(cat.amount)}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune dépense sur cette période</p>
            )}
            <div className="flex gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" /><span className="text-[10px] text-muted-foreground">Normal</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" /><span className="text-[10px] text-muted-foreground">+20 %</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive/60" /><span className="text-[10px] text-muted-foreground">+50 %</span></div>
            </div>
          </FinanceCard>

          {/* Selected category detail */}
          {selectedDetail && (
            <FinanceCard className="border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{selectedDetail.icon}</span>
                <h3 className="text-sm font-bold text-foreground">{selectedDetail.name}</h3>
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${CLASSIFICATION_META[selectedDetail.classification]?.color || ''} ${CLASSIFICATION_META[selectedDetail.classification]?.text || ''}`}>
                  {CLASSIFICATION_META[selectedDetail.classification]?.label || ''}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{period === 'month' ? 'Ce mois' : 'Cette période'}</span><span className="font-bold text-foreground">{formatCurrency(selectedDetail.amount)}</span></div>
                {selectedDetail.prevAmount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Période précédente</span><span className="text-foreground">{formatCurrency(selectedDetail.prevAmount)}</span></div>
                )}
                {selectedDetail.delta !== 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Variation</span><span className={selectedDetail.delta > 0 ? 'text-destructive' : 'text-emerald-400'}>{selectedDetail.delta > 0 ? '+' : ''}{formatCurrency(selectedDetail.delta)} ({selectedDetail.deltaPct > 0 ? '+' : ''}{selectedDetail.deltaPct}%)</span></div>
                )}
              </div>
              <div className="mt-3 border-t border-border/50 pt-2 max-h-40 overflow-y-auto space-y-1">
                {store.transactions.filter(t => monthKeys.includes(t.monthKey) && t.direction === 'expense' && t.categoryId === selectedDetail.catId).map(t => (
                  <div key={t.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1">{t.label}</span>
                    <span className="text-foreground font-medium ml-2">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </FinanceCard>
          )}

          {/* Comparison list */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Comparaison par catégorie</h2>
            <div className="space-y-2">
              {categories.map(cat => {
                const arrow = cat.delta > 0 ? '↑' : cat.delta < 0 ? '↓' : '→'
                const arrowColor = cat.delta > 0 ? 'text-destructive' : cat.delta < 0 ? 'text-emerald-400' : 'text-muted-foreground'
                return (
                  <FinanceCard key={cat.catId} onClick={() => setSelectedCat(cat.catId === selectedCat ? null : cat.catId)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="text-sm text-foreground">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${arrowColor}`}>{arrow} {cat.delta !== 0 ? `${cat.delta > 0 ? '+' : ''}${formatCurrency(cat.delta)}` : ''}</span>
                        <span className="text-sm font-bold text-foreground">{formatCurrency(cat.amount)}</span>
                      </div>
                    </div>
                  </FinanceCard>
                )
              })}
            </div>
          </div>
        </>
      )}

      {tab === 'charges' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FinanceCard>
              <p className="text-xs text-muted-foreground">Charges fixes</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(chargesData.totalFixed)}</p>
              <p className="text-xs text-muted-foreground">{chargesData.recurring.length} récurrentes</p>
            </FinanceCard>
            <FinanceCard>
              <p className="text-xs text-muted-foreground">Variables</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(chargesData.totalVariable)}</p>
              <p className="text-xs text-muted-foreground">{chargesData.variable.length} transactions</p>
            </FinanceCard>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Par catégorie</h2>
            <div className="space-y-2">
              {chargesData.byCategory.map(c => {
                const maxAmt = chargesData.byCategory[0]?.total || 1
                return (
                  <FinanceCard key={c.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-foreground">{c.icon} {c.name}</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(c.total)}</span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.total / maxAmt) * 100}%` }} />
                    </div>
                  </FinanceCard>
                )
              })}
              {chargesData.byCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune dépense ce mois</p>}
            </div>
          </div>

          {chargesData.recurring.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Charges récurrentes</h2>
              <div className="space-y-2">
                {chargesData.recurring.map(t => (
                  <FinanceCard key={t.id}>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground">{t.label}</span>
                      <span className="text-sm font-bold text-destructive">{formatCurrency(t.amount)}</span>
                    </div>
                  </FinanceCard>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
