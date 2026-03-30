import React, { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey } from '@/lib/constants'
import type { FinanceStore } from '@/types/finance'

interface Props {
  store: FinanceStore
}

export const ExpensesPage: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate()
  const monthKey = getCurrentMonthKey()

  const { recurring, variable, byCategory, totalFixed, totalVariable } = useMemo(() => {
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

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Dépenses</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FinanceCard>
          <p className="text-xs text-muted-foreground">Charges fixes</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalFixed)}</p>
          <p className="text-xs text-muted-foreground">{recurring.length} récurrentes</p>
        </FinanceCard>
        <FinanceCard>
          <p className="text-xs text-muted-foreground">Variables</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalVariable)}</p>
          <p className="text-xs text-muted-foreground">{variable.length} transactions</p>
        </FinanceCard>
      </div>

      {/* By category */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Par catégorie</h2>
        <div className="space-y-2">
          {byCategory.map(c => {
            const maxAmount = byCategory[0]?.total || 1
            return (
              <FinanceCard key={c.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-foreground">{c.icon} {c.name}</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(c.total)}</span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.total / maxAmount) * 100}%` }} />
                </div>
              </FinanceCard>
            )
          })}
          {byCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune dépense ce mois</p>}
        </div>
      </div>

      {/* Recurring list */}
      {recurring.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Charges récurrentes</h2>
          <div className="space-y-2">
            {recurring.map(t => (
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
    </div>
  )
}
