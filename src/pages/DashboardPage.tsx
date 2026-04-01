import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, ChevronRight, Sparkles, TrendingDown } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, getLevelForXp, getNextLevel, getPreviousMonthKey } from '@/lib/constants'
import { generateAlerts, generateInsights, calculateHealthScore, calculatePilotageMode, getRealIncome } from '@/lib/analytics'
import type { FinanceStore } from '@/types/finance'
import {
  AreaChart, Area, ResponsiveContainer,
  BarChart, Bar, XAxis, Tooltip,
} from 'recharts'

interface Props {
  store: FinanceStore
  onDismissAlert: (id: string) => void
}

const severityLeft = {
  critical: 'border-l-destructive',
  warning: 'border-l-amber-500',
  info: 'border-l-sky-400',
  positive: 'border-l-emerald-500',
}
const severityText = {
  critical: 'text-destructive',
  warning: 'text-amber-400',
  info: 'text-sky-400',
  positive: 'text-emerald-400',
}
const MODE_BADGE = {
  acceleration: { label: '🚀 Accélération', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
  regulation:   { label: '⚙️ Régulation',   bg: 'bg-amber-500/10 border-amber-500/30',   text: 'text-amber-400'   },
  protection:   { label: '🛑 Protection',   bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive' },
}

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border/60 rounded-xl px-3 py-2 text-xs shadow-2xl">
      <p className="text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.fill }}>
          {p.dataKey === 'income' ? '↑' : '↓'} {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export const DashboardPage: React.FC<Props> = ({ store, onDismissAlert }) => {
  const navigate = useNavigate()
  const monthKey = getCurrentMonthKey()
  const prevMonthKey = getPreviousMonthKey(monthKey)

  const budget = useMemo(() => {
    const ops = store.operations.filter(op => op.monthKey === monthKey)
    const revOps = ops.filter(op => op.family === 'revenu')
    const chargeOps = ops.filter(op => op.family !== 'revenu')
    const revForecast = revOps.reduce((s, op) => s + op.forecast, 0)
    const revActual = revOps.reduce((s, op) => s + op.actual, 0)
    const chargeForecast = chargeOps.reduce((s, op) => s + op.forecast, 0)
    const chargeActual = chargeOps.reduce((s, op) => s + op.actual, 0)
    const overBudget = chargeOps.filter(op => op.actual > op.forecast * 1.1 && op.forecast > 0)
    return { revForecast, revActual, chargeForecast, chargeActual, overBudget, hasOps: ops.length > 0 }
  }, [store.operations, monthKey])

  const stats = useMemo(() => {
    const totalAccounts = store.accounts.filter(a => a.isActive && a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const totalCash = store.accounts.filter(a => a.isActive && a.type === 'liquide').reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.filter(a => a.type !== 'dette').reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
      + store.assets.filter(a => a.type === 'dette').reduce((s, a) => s + (a.outstandingBalance || a.value), 0)
    const netWorth = totalAccounts + totalAssets - totalDebts
    const monthTx = store.transactions.filter(t => t.monthKey === monthKey)
    const monthIncome = getRealIncome(store, monthKey)
    const monthIncomeTotal = monthTx.filter(t => t.direction === 'income').reduce((s, t) => s + t.amount, 0)
    const monthExpenses = monthTx.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
    return { totalAccounts, totalCash, totalAssets, totalDebts, netWorth, monthIncome, monthIncomeTotal, monthExpenses }
  }, [store, monthKey])

  const prevSnapshot = store.monthlySnapshots.find(s => s.monthKey === prevMonthKey)
  const netWorthDelta = prevSnapshot ? stats.netWorth - prevSnapshot.netWorth : 0

  const sparkData = useMemo(() => {
    const snaps = store.monthlySnapshots.slice(-7)
    if (snaps.length < 2) return Array.from({ length: 7 }, (_, i) => ({ v: Math.max(0, stats.netWorth * (0.88 + i * 0.02)) }))
    return snaps.map(s => ({ v: s.netWorth }))
  }, [store.monthlySnapshots, stats.netWorth])

  const barData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const key = getPreviousMonthKey(monthKey, 5 - i)
      const [y, m] = key.split('-').map(Number)
      const label = new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'short' })
      const txs = store.transactions.filter(t => t.monthKey === key)
      const ops = store.operations.filter(op => op.monthKey === key)
      const income = ops.filter(op => op.family === 'revenu').reduce((s, op) => s + op.actual, 0)
        || txs.filter(t => t.direction === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = ops.filter(op => op.family !== 'revenu').reduce((s, op) => s + op.actual, 0)
        || txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
      return { label: label.charAt(0).toUpperCase() + label.slice(1, 4), income, expense }
    })
  }, [store, monthKey])

  const alerts = useMemo(() => generateAlerts(store), [store])
  const insights = useMemo(() => generateInsights(store), [store])
  const healthScore = useMemo(() => calculateHealthScore(store), [store])
  const pilotageMode = useMemo(() => calculatePilotageMode(store), [store])
  const level = getLevelForXp(store.settings.xp)
  const nextLevel = getNextLevel(level.level)
  const modeBadge = MODE_BADGE[pilotageMode]
  const xpPct = nextLevel ? Math.min(100, ((store.settings.xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">

      {/* ── Hero card ───────────────────────────────────────────────── */}
      <div className="relative p-px rounded-3xl bg-gradient-to-br from-primary/50 via-primary/10 to-transparent">
        <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-card p-5">
          {/* Ambient blobs */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] text-primary/70 uppercase tracking-[0.2em] font-semibold mb-1">Patrimoine net</p>
              <p className="text-[42px] font-black tracking-tight leading-none text-gradient-emerald">
                {formatCurrency(stats.netWorth)}
              </p>
              {netWorthDelta !== 0 && (
                <p className={`text-xs mt-2 font-medium ${netWorthDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netWorthDelta >= 0 ? '↗' : '↘'} {netWorthDelta >= 0 ? '+' : ''}{formatCurrency(netWorthDelta)} vs mois précédent
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button onClick={() => navigate('/profil')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${healthScore.total >= 75 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : healthScore.total >= 50 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                {healthScore.total}/100
              </button>
              <button onClick={() => navigate('/operations')}
                className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground active:scale-95 transition-transform shadow-lg shadow-primary/30">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sparkline edge-to-edge */}
          <div className="h-[72px] -mx-5 -mb-5 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0fba81" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0fba81" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#0fba81" strokeWidth={2.5} fill="url(#heroGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Mode de pilotage ────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border ${modeBadge.bg}`}>
        <span className={`text-xs font-bold tracking-wide ${modeBadge.text}`}>{modeBadge.label}</span>
        <button onClick={() => navigate('/profil')} className={`text-[10px] font-medium opacity-60 ${modeBadge.text}`}>Voir profil →</button>
      </div>

      {/* ── 4 Métriques colorées ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Comptes — sky */}
        <button onClick={() => navigate('/comptes')}
          className="relative overflow-hidden rounded-2xl bg-sky-500/5 border border-sky-500/20 p-4 text-left active:scale-[0.98] transition-transform">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-sky-500/15 rounded-full blur-xl" />
          <p className="text-[10px] text-sky-400/70 uppercase tracking-wider font-semibold mb-1">Comptes</p>
          <p className="text-xl font-black text-gradient-sky">{formatCurrency(stats.totalAccounts)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Cash {formatCurrency(stats.totalCash)}</p>
        </button>

        {/* Actifs — gold */}
        <button onClick={() => navigate('/patrimoine')}
          className="relative overflow-hidden rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 text-left active:scale-[0.98] transition-transform">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-amber-500/15 rounded-full blur-xl" />
          <p className="text-[10px] text-amber-400/70 uppercase tracking-wider font-semibold mb-1">Actifs</p>
          <p className="text-xl font-black text-gradient-gold">{formatCurrency(stats.totalAssets)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Patrimoine hors comptes</p>
        </button>

        {/* Revenus mois — emerald */}
        <button onClick={() => navigate('/operations')}
          className="relative overflow-hidden rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-left active:scale-[0.98] transition-transform">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/15 rounded-full blur-xl" />
          <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-semibold mb-1">↑ Revenus</p>
          <p className="text-xl font-black text-gradient-emerald">{formatCurrency(stats.monthIncomeTotal)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{getMonthLabel(monthKey)}</p>
        </button>

        {/* Dépenses mois — orange */}
        <button onClick={() => navigate('/operations')}
          className="relative overflow-hidden rounded-2xl bg-orange-500/5 border border-orange-500/20 p-4 text-left active:scale-[0.98] transition-transform">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-orange-500/15 rounded-full blur-xl" />
          <p className="text-[10px] text-orange-400/70 uppercase tracking-wider font-semibold mb-1">↓ Dépenses</p>
          <p className="text-xl font-black text-gradient-orange">{formatCurrency(stats.monthExpenses)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{getMonthLabel(monthKey)}</p>
        </button>
      </div>

      {/* Dettes — red (only if > 0) */}
      {stats.totalDebts > 0 && (
        <button onClick={() => navigate('/patrimoine')}
          className="relative overflow-hidden rounded-2xl bg-rose-500/5 border border-rose-500/25 p-4 text-left w-full active:scale-[0.98] transition-transform">
          <div className="absolute -top-6 right-8 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] text-rose-400/70 uppercase tracking-wider font-semibold mb-1">Dettes totales</p>
              <p className="text-2xl font-black text-gradient-red">{formatCurrency(stats.totalDebts)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400/50" />
          </div>
        </button>
      )}

      {/* ── Bar chart 6 mois ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border/40 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Cashflow 6 mois</h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />Revenus
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-orange-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-400" />Dépenses
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={barData} barGap={3} barCategoryGap="30%">
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(215 10% 48%)', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(225 12% 16% / 0.5)', radius: 6 }} />
            <Bar dataKey="income"  fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expense" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Budget cockpit ──────────────────────────────────────────── */}
      {budget.hasOps && (
        <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Budget {getMonthLabel(monthKey)}</h2>
            <button onClick={() => navigate('/operations')} className="text-[10px] text-primary font-semibold">Détail →</button>
          </div>

          {/* Revenus */}
          {budget.revForecast > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Revenus</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{formatCurrency(budget.revForecast)}</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(budget.revActual)}</span>
                </div>
              </div>
              <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, (budget.revActual / budget.revForecast) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Charges */}
          {budget.chargeForecast > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Charges</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{formatCurrency(budget.chargeForecast)}</span>
                  <span className={`font-bold ${budget.chargeActual > budget.chargeForecast ? 'text-rose-400' : 'text-orange-400'}`}>
                    {formatCurrency(budget.chargeActual)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${budget.chargeActual > budget.chargeForecast
                  ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                  : 'bg-gradient-to-r from-orange-600 to-orange-400'}`}
                  style={{ width: `${Math.min(100, (budget.chargeActual / budget.chargeForecast) * 100)}%` }} />
              </div>
            </div>
          )}

          {budget.overBudget.length > 0 && (
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 px-3 py-2">
              <p className="text-[10px] text-amber-400 font-semibold">⚠ {budget.overBudget.length} poste{budget.overBudget.length > 1 ? 's' : ''} dépassés</p>
            </div>
          )}
        </div>
      )}

      {/* ── Alertes ─────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1" style={{ scrollSnapType: 'x mandatory' }}>
          {alerts.slice(0, 3).map(alert => (
            <div key={alert.id}
              className={`flex-shrink-0 w-[85%] rounded-2xl border border-l-4 p-3.5 bg-card ${severityLeft[alert.severity]}`}
              style={{ scrollSnapAlign: 'start' }}>
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium flex-1 ${severityText[alert.severity]}`}>{alert.message}</p>
                <button onClick={() => onDismissAlert(alert.id)} className="text-muted-foreground/60 mt-0.5 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Insights ────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Insights</h2>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3">
                <p className="text-xs text-foreground/80">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick actions ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/repartition')}
          className="rounded-2xl bg-card border border-border/40 p-4 text-left active:scale-[0.98] transition-transform">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Répartition</p>
          <p className="text-sm font-bold text-gradient-primary">Calculer →</p>
        </button>
        <button onClick={() => navigate('/plan')}
          className="rounded-2xl bg-card border border-border/40 p-4 text-left active:scale-[0.98] transition-transform">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Quêtes actives</p>
          <p className="text-sm font-bold text-gradient-primary">{store.quests.filter(q => q.status === 'active').length} en cours →</p>
        </button>
      </div>

      {/* ── Level / XP ──────────────────────────────────────────────── */}
      <button onClick={() => navigate('/profil')}
        className="relative overflow-hidden rounded-2xl bg-card border border-border/40 p-4 text-left w-full active:scale-[0.98] transition-transform">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{level.emoji}</span>
            <div>
              <p className="text-sm font-bold text-foreground">Nv.{level.level} — {level.name}</p>
              <p className="text-[11px] text-muted-foreground">{store.settings.xp} XP{nextLevel ? ` · encore ${nextLevel.minXp - store.settings.xp} XP` : ''}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        </div>
        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
            style={{ width: `${xpPct}%` }} />
        </div>
      </button>

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
