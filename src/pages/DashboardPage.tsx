import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/constants'
import type { FinanceStore } from '@/types/finance'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface Props {
  store: FinanceStore
}

export const DashboardPage: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate()
  const monthKey = getCurrentMonthKey()

  const stats = useMemo(() => {
    const totalAccounts = store.accounts.filter(a => a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const totalCash = store.accounts.filter(a => a.type === 'liquide').reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    const netWorth = totalAccounts + totalAssets - totalDebts

    const monthTx = store.transactions.filter(t => t.monthKey === monthKey)
    const monthIncome = monthTx.filter(t => t.direction === 'income').reduce((s, t) => s + t.amount, 0)
    const monthExpenses = monthTx.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)

    return { totalAccounts, totalCash, totalAssets, totalDebts, netWorth, monthIncome, monthExpenses }
  }, [store, monthKey])

  // Mock sparkline data for patrimoine evolution
  const sparkData = useMemo(() => {
    const snapshots = store.monthlySnapshots.slice(-6)
    if (snapshots.length < 2) {
      return Array.from({ length: 6 }, (_, i) => ({ v: stats.netWorth * (0.85 + i * 0.03) }))
    }
    return snapshots.map(s => ({ v: s.netWorth }))
  }, [store.monthlySnapshots, stats.netWorth])

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Patrimoine net</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.netWorth)}</h1>
        </div>
        <button
          onClick={() => navigate('/transactions/new')}
          className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Sparkline */}
      <FinanceCard className="p-3">
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={sparkData}>
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#sparkGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-muted-foreground text-center mt-1">Évolution du patrimoine</p>
      </FinanceCard>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <FinanceCard onClick={() => navigate('/comptes')}>
          <p className="text-xs text-muted-foreground">Total comptes</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalAccounts)}</p>
        </FinanceCard>
        <FinanceCard onClick={() => navigate('/patrimoine')}>
          <p className="text-xs text-muted-foreground">Actifs</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalAssets)}</p>
        </FinanceCard>
        <FinanceCard>
          <p className="text-xs text-muted-foreground">Cash disponible</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalCash)}</p>
        </FinanceCard>
        <FinanceCard onClick={() => navigate('/patrimoine')}>
          <p className="text-xs text-muted-foreground">Dettes</p>
          <p className="text-lg font-bold text-destructive">{formatCurrency(stats.totalDebts)}</p>
        </FinanceCard>
      </div>

      {/* Monthly summary */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{getMonthLabel(monthKey)}</h2>
        <div className="flex gap-3">
          <FinanceCard className="flex-1" onClick={() => navigate('/mois')}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground">Entrant</span>
            </div>
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(stats.monthIncome)}</p>
          </FinanceCard>
          <FinanceCard className="flex-1" onClick={() => navigate('/mois')}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-xs text-muted-foreground">Sortant</span>
            </div>
            <p className="text-lg font-bold text-destructive">{formatCurrency(stats.monthExpenses)}</p>
          </FinanceCard>
        </div>
      </div>

      {/* Alerts */}
      {stats.monthExpenses > stats.monthIncome && stats.monthIncome > 0 && (
        <FinanceCard className="border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive font-medium">Dépenses supérieures aux revenus ce mois</p>
          </div>
        </FinanceCard>
      )}
    </div>
  )
}
