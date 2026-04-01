import React, { useMemo, useState } from 'react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, getPreviousMonthKey } from '@/lib/constants'
import type { FinanceStore, MonthlySnapshot } from '@/types/finance'

interface Props {
  store: FinanceStore
  onDismiss: (snapshot: MonthlySnapshot) => void
}

export const SnapshotModal: React.FC<Props> = ({ store, onDismiss }) => {
  const currentMonthKey = getCurrentMonthKey()
  const prevMonthKey = getPreviousMonthKey(currentMonthKey)

  const snapshot = useMemo(() => {
    const s = store.monthlySnapshots.find(s => s.monthKey === prevMonthKey)
    if (s && !s.dismissed) return s
    // Auto-generate if prev month has transactions but no snapshot
    const txs = store.transactions.filter(t => t.monthKey === prevMonthKey)
    if (txs.length === 0) return null
    const existing = store.monthlySnapshots.find(s => s.monthKey === prevMonthKey)
    if (existing) return null // already dismissed
    const incomeBank = txs.filter(t => t.direction === 'income' && t.sourceType === 'bank').reduce((s, t) => s + t.amount, 0)
    const incomeCash = txs.filter(t => t.direction === 'income' && t.sourceType === 'cash').reduce((s, t) => s + t.amount, 0)
    const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
    const totalAccounts = store.accounts.reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    return {
      id: prevMonthKey, monthKey: prevMonthKey,
      totalIncomeBank: incomeBank, totalIncomeCash: incomeCash,
      totalExpenses: expenses, totalAssets, totalDebts,
      netWorth: totalAccounts + totalAssets - totalDebts,
    }
  }, [store, prevMonthKey])

  if (!snapshot) return null

  const totalIncome = snapshot.totalIncomeBank + snapshot.totalIncomeCash
  const balance = totalIncome - snapshot.totalExpenses
  const journal = store.monthlyJournals[prevMonthKey]

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-2xl">
        <div className="text-center">
          <p className="text-xs text-primary uppercase tracking-wider font-semibold">Bilan de</p>
          <h2 className="text-xl font-bold text-foreground capitalize">{getMonthLabel(prevMonthKey)}</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-[10px] text-muted-foreground">Revenus</p><p className="text-sm font-bold text-emerald-400">{formatCurrency(totalIncome)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Dépenses</p><p className="text-sm font-bold text-destructive">{formatCurrency(snapshot.totalExpenses)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Solde</p><p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>{formatCurrency(balance)}</p></div>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Patrimoine net</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(snapshot.netWorth)}</p>
        </div>
        {journal && (
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Note du mois</p>
            <p className="text-xs text-foreground">{journal}</p>
          </div>
        )}
        <p className="text-xs text-center text-muted-foreground italic">
          {balance >= 0 ? '✅ Bon mois ! Continue sur cette lancée.' : '⚠️ Mois négatif. Ajuste tes dépenses le mois prochain.'}
        </p>
        <button onClick={() => onDismiss({ ...snapshot, dismissed: true })} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Fermer et continuer
        </button>
      </div>
    </div>
  )
}
