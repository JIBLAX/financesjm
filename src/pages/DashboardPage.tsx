import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, Plus, X, ChevronRight, TrendingDown, Sparkles } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, getLevelForXp, getNextLevel } from '@/lib/constants'
import { generateAlerts, generateInsights, calculateHealthScore, calculatePilotageMode, getRealIncome } from '@/lib/analytics'
import type { FinanceStore } from '@/types/finance'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface Props {
  store: FinanceStore
  onDismissAlert: (id: string) => void
}

const severityStyles = {
  critical: 'border-destructive/50 bg-destructive/10',
  warning: 'border-amber-500/50 bg-amber-500/10',
  info: 'border-blue-400/50 bg-blue-400/10',
  positive: 'border-emerald-500/50 bg-emerald-500/10',
}

const severityText = {
  critical: 'text-destructive',
  warning: 'text-amber-400',
  info: 'text-blue-400',
  positive: 'text-emerald-400',
}

const MODE_BADGE = {
  acceleration: { label: '🚀 Accélération', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  regulation: { label: '⚙️ Régulation', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  protection: { label: '🛑 Protection', bg: 'bg-destructive/10', text: 'text-destructive' },
}

export const DashboardPage: React.FC<Props> = ({ store, onDismissAlert }) => {
  const navigate = useNavigate()
  const monthKey = getCurrentMonthKey()

  const stats = useMemo(() => {
    const totalAccounts = store.accounts.filter(a => a.isActive && a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const totalCash = store.accounts.filter(a => a.isActive && a.type === 'liquide').reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.filter(a => a.type !== 'dette').reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0) + store.assets.filter(a => a.type === 'dette').reduce((s, a) => s + (a.outstandingBalance || a.value), 0)
    const netWorth = totalAccounts + totalAssets - totalDebts
    const monthTx = store.transactions.filter(t => t.monthKey === monthKey)
    const monthIncome = getRealIncome(store, monthKey)
    const monthIncomeTotal = monthTx.filter(t => t.direction === 'income').reduce((s, t) => s + t.amount, 0)
    const monthExpenses = monthTx.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
    return { totalAccounts, totalCash, totalAssets, totalDebts, netWorth, monthIncome, monthIncomeTotal, monthExpenses }
  }, [store, monthKey])

  const alerts = useMemo(() => generateAlerts(store), [store])
  const insights = useMemo(() => generateInsights(store), [store])
  const healthScore = useMemo(() => calculateHealthScore(store), [store])
  const pilotageMode = useMemo(() => calculatePilotageMode(store), [store])
  const level = getLevelForXp(store.settings.xp)
  const nextLevel = getNextLevel(level.level)
  const modeBadge = MODE_BADGE[pilotageMode]

  const sparkData = useMemo(() => {
    const snapshots = store.monthlySnapshots.slice(-6)
    if (snapshots.length < 2) return Array.from({ length: 6 }, (_, i) => ({ v: stats.netWorth * (0.85 + i * 0.03) }))
    return snapshots.map(s => ({ v: s.netWorth }))
  }, [store.monthlySnapshots, stats.netWorth])

  const scoreColor = healthScore.total >= 75 ? 'text-emerald-400' : healthScore.total >= 60 ? 'text-amber-300' : healthScore.total >= 40 ? 'text-amber-500' : 'text-destructive'
  const scoreBg = healthScore.total >= 75 ? 'bg-emerald-500/10' : healthScore.total >= 60 ? 'bg-amber-300/10' : healthScore.total >= 40 ? 'bg-amber-500/10' : 'bg-destructive/10'

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Patrimoine net</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.netWorth)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/profil')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${scoreBg} ${scoreColor}`}>
            {healthScore.total}/100
          </button>
          <button onClick={() => navigate('/transactions/new')} className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground active:scale-95 transition-transform">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pilotage mode badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${modeBadge.bg}`}>
        <span className={`text-xs font-semibold ${modeBadge.text}`}>{modeBadge.label}</span>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1" style={{ scrollSnapType: 'x mandatory' }}>
          {alerts.slice(0, 3).map(alert => (
            <div key={alert.id} className={`flex-shrink-0 w-[85%] rounded-xl border p-3 ${severityStyles[alert.severity]}`} style={{ scrollSnapAlign: 'start' }}>
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium ${severityText[alert.severity]} flex-1`}>{alert.message}</p>
                <button onClick={() => onDismissAlert(alert.id)} className="text-muted-foreground mt-0.5"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insights du mois</h2>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <FinanceCard key={i} className="!py-2.5">
                <p className="text-xs text-foreground/80">{insight}</p>
              </FinanceCard>
            ))}
          </div>
        </div>
      )}

      {/* Sparkline */}
      <FinanceCard className="p-3">
        <ResponsiveContainer width="100%" height={70}>
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
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(stats.monthIncomeTotal)}</p>
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

      {/* Quick actions */}
      <div className="flex gap-3">
        <FinanceCard className="flex-1" onClick={() => navigate('/repartition')}>
          <p className="text-xs text-muted-foreground">Répartition</p>
          <p className="text-sm font-semibold text-primary">Calculer →</p>
        </FinanceCard>
        <FinanceCard className="flex-1" onClick={() => navigate('/plan')}>
          <p className="text-xs text-muted-foreground">Quêtes actives</p>
          <p className="text-sm font-semibold text-primary">{store.quests.filter(q => q.status === 'active').length} en cours →</p>
        </FinanceCard>
      </div>

      {/* Level badge */}
      <FinanceCard onClick={() => navigate('/profil')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{level.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Nv.{level.level} — {level.name}</p>
              <p className="text-xs text-muted-foreground">{store.settings.xp} XP{nextLevel ? ` · ${nextLevel.minXp - store.settings.xp} XP avant Nv.${nextLevel.level}` : ''}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        {nextLevel && (
          <div className="mt-2 w-full bg-muted/50 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((store.settings.xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100)}%` }} />
          </div>
        )}
      </FinanceCard>

      {stats.monthExpenses > stats.monthIncomeTotal && stats.monthIncomeTotal > 0 && (
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
