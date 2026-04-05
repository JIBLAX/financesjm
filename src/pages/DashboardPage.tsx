import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, ChevronRight, Sparkles, GripVertical, Settings2 } from 'lucide-react'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, getLevelForXp, getNextLevel, getPreviousMonthKey, ASSET_CLASS_MAP } from '@/lib/constants'
import { generateAlerts, generateInsights, calculateHealthScore, calculatePilotageMode, getRealIncome, computeMissions } from '@/lib/analytics'
import type { FinanceStore } from '@/types/finance'
import {
  AreaChart, Area, ResponsiveContainer,
  BarChart, Bar, XAxis, Tooltip,
  LineChart, Line, YAxis,
} from 'recharts'

// ── Widget types ──────────────────────────────────────────────────────────────

type WidgetId = 'solde_total' | 'comptes' | 'actifs' | 'entrees' | 'depenses' | 'cashflow' | 'dette' | 'profil_mode' | 'quete' | 'missions' | 'objectifs' | 'evolution'

const WIDGET_META: Record<WidgetId, { label: string; emoji: string }> = {
  solde_total: { label: 'Patrimoine net',      emoji: '💎' },
  comptes:     { label: 'Comptes',             emoji: '🏦' },
  actifs:      { label: 'Actifs',              emoji: '📈' },
  entrees:     { label: 'Revenus',             emoji: '💰' },
  depenses:    { label: 'Dépenses',            emoji: '💸' },
  cashflow:    { label: 'Cashflow 6 mois',     emoji: '📊' },
  dette:       { label: 'Dettes',              emoji: '📉' },
  profil_mode: { label: 'Profil & Mode',       emoji: '🎯' },
  quete:       { label: 'Alertes & Insights',  emoji: '✨' },
  missions:    { label: 'Guide Financier',     emoji: '🗺️' },
  objectifs:   { label: 'Objectifs',           emoji: '🎁' },
  evolution:   { label: 'Évolution Finances',  emoji: '📉' },
}

const DEFAULT_LAYOUT: WidgetId[] = ['solde_total', 'comptes', 'actifs', 'entrees', 'depenses', 'evolution', 'missions', 'objectifs', 'cashflow', 'dette', 'quete']

function loadLayout(): WidgetId[] {
  const valid = new Set(Object.keys(WIDGET_META) as WidgetId[])
  try {
    const s = localStorage.getItem('widget_layout')
    if (s) {
      const p = JSON.parse(s) as WidgetId[]
      const filtered = p.filter(id => valid.has(id))
      if (filtered.length > 0) return filtered
    }
  } catch {}
  // Clear old layout and use default
  localStorage.removeItem('widget_layout')
  return [...DEFAULT_LAYOUT]
}

// ── Styles ────────────────────────────────────────────────────────────────────

const severityLeft = {
  critical: 'border-l-destructive',
  warning:  'border-l-amber-500',
  info:     'border-l-sky-400',
  positive: 'border-l-emerald-500',
}
const severityText = {
  critical: 'text-destructive',
  warning:  'text-amber-400',
  info:     'text-sky-400',
  positive: 'text-emerald-400',
}
const MODE_BADGE = {
  acceleration: { label: '🚀 Accélération', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
  regulation:   { label: '⚙️ Régulation',   bg: 'bg-amber-500/10 border-amber-500/30',    text: 'text-amber-400'   },
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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  store: FinanceStore
  onDismissAlert: (id: string) => void
}

export const DashboardPage: React.FC<Props> = ({ store, onDismissAlert }) => {
  const navigate = useNavigate()
  const monthKey = getCurrentMonthKey()
  const prevMonthKey = getPreviousMonthKey(monthKey)

  // Widget layout
  const [layout, setLayout] = useState<WidgetId[]>(loadLayout)
  const [editMode, setEditMode] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  // Touch drag-and-drop
  const dragRef = useRef<{ fromIdx: number; overIdx: number } | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const widgetRefs = useRef<(HTMLDivElement | null)[]>([])

  const saveLayout = useCallback((l: WidgetId[]) => {
    setLayout(l)
    localStorage.setItem('widget_layout', JSON.stringify(l))
  }, [])

  const removeWidget = (id: WidgetId) => saveLayout(layout.filter(w => w !== id))
  const addWidget = (id: WidgetId) => { saveLayout([...layout, id]); setShowAdd(false) }
  const hiddenWidgets = (Object.keys(WIDGET_META) as WidgetId[]).filter(w => !layout.includes(w))

  const onHandleTouchStart = useCallback((e: React.TouchEvent, idx: number) => {
    dragRef.current = { fromIdx: idx, overIdx: idx }
    setDraggingIdx(idx)
    setDragOverIdx(idx)
  }, [])

  useEffect(() => {
    if (!editMode) return
    const move = (e: TouchEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      const y = e.touches[0].clientY
      widgetRefs.current.forEach((el, i) => {
        if (!el) return
        const { top, bottom } = el.getBoundingClientRect()
        if (y >= top && y <= bottom) {
          dragRef.current!.overIdx = i
          setDragOverIdx(i)
        }
      })
    }
    const end = () => {
      if (dragRef.current && dragRef.current.fromIdx !== dragRef.current.overIdx) {
        const { fromIdx, overIdx } = dragRef.current
        setLayout(prev => {
          const next = [...prev]
          const [item] = next.splice(fromIdx, 1)
          next.splice(overIdx, 0, item)
          localStorage.setItem('widget_layout', JSON.stringify(next))
          return next
        })
      }
      dragRef.current = null
      setDraggingIdx(null)
      setDragOverIdx(null)
    }
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('touchend', end)
    return () => {
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', end)
    }
  }, [editMode])

  // ── Data ────────────────────────────────────────────────────────────────────

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
    // All months from Jan 2026 to current
    const keys: string[] = []
    const start = new Date(2026, 0)
    const [cy, cm] = monthKey.split('-').map(Number)
    const end = new Date(cy, cm - 1)
    const d = new Date(start)
    while (d <= end) {
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      d.setMonth(d.getMonth() + 1)
    }
    return keys.map(key => {
      const [y, m] = key.split('-').map(Number)
      const label = new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
      const txs = store.transactions.filter(t => t.monthKey === key)
      const ops = store.operations.filter(op => op.monthKey === key)
      const income = ops.filter(op => op.family === 'revenu').reduce((s, op) => s + op.actual, 0)
        || txs.filter(t => t.direction === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = ops.filter(op => op.family !== 'revenu').reduce((s, op) => s + op.actual, 0)
        || txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
      return { label: label.charAt(0).toUpperCase() + label.slice(1, 3), income, expense }
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

  const missions = useMemo(() => computeMissions(store), [store])
  const topMissions = missions.filter(m => !m.completed).slice(0, 3)
  const missionsPct = missions.length > 0 ? Math.round((missions.filter(m => m.completed).length / missions.length) * 100) : 0
  const projects = store.projects || []
  const activeProjects = projects.filter(p => !p.completedAt).slice(0, 2)

  const evolutionData = useMemo(() => {
    const checkIns = [...(store.monthlyCheckIns || [])].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    if (checkIns.length === 0) return []
    return checkIns.map(checkIn => {
      const [y, m] = checkIn.monthKey.split('-').map(Number)
      const raw = new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
      const label = raw.charAt(0).toUpperCase() + raw.slice(1, 3)
      let epargne = 0, tresorerie = 0, crypto = 0, dettes = 0
      // Comptes bancaires
      Object.entries(checkIn.accountBalances || {}).forEach(([accId, value]) => {
        const acc = store.accounts.find(a => a.id === accId)
        if (!acc) return
        if (acc.type === 'livret' || acc.type === 'epargne_projet') epargne += value
        else if (acc.type === 'dette') dettes += value
        else tresorerie += value
      })
      // Actifs
      Object.entries(checkIn.assetValues || {}).forEach(([assetId, value]) => {
        const asset = store.assets.find(a => a.id === assetId)
        if (!asset) return
        const cls = ASSET_CLASS_MAP[asset.type]
        if (cls === 'epargne') epargne += value
        else if (cls === 'cash') tresorerie += value
        else if (cls === 'crypto') crypto += value
        else if (cls === 'dettes') dettes += value
      })
      // Dettes explicites
      Object.values(checkIn.debtBalances || {}).forEach(v => { dettes += v })
      return { label, epargne, tresorerie, crypto, dettes }
    })
  }, [store.monthlyCheckIns, store.assets, store.accounts])

  const todayDate = new Date()
  const greeting = todayDate.getHours() < 18 ? 'Bonjour' : 'Bonsoir'
  const dateLabel = todayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // ── Widget renderers ────────────────────────────────────────────────────────

  const renderWidget = (id: WidgetId) => {
    switch (id) {

      case 'solde_total':
        return (
          <div className="relative p-px rounded-3xl bg-gradient-to-br from-primary/50 via-primary/10 to-transparent">
            <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-card p-5">
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
                </div>
              </div>
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
        )

      case 'profil_mode':
        return (
          <div className="space-y-3">
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border ${modeBadge.bg}`}>
              <span className={`text-xs font-bold tracking-wide ${modeBadge.text}`}>{modeBadge.label}</span>
              <button onClick={() => navigate('/profil')} className={`text-[10px] font-medium opacity-60 ${modeBadge.text}`}>Voir profil →</button>
            </div>
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
          </div>
        )

      case 'comptes':
        return (
          <button onClick={() => navigate('/comptes')}
            className="rounded-2xl bg-card border border-border/60 p-4 text-left w-full active:scale-[0.98] transition-transform">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold mb-1">Comptes</p>
            <p className="text-xl font-black text-foreground">{formatCurrency(stats.totalAccounts)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Cash {formatCurrency(stats.totalCash)}</p>
          </button>
        )

      case 'actifs':
        return (
          <button onClick={() => navigate('/patrimoine')}
            className="rounded-2xl bg-muted/20 border border-border/40 p-4 text-left w-full active:scale-[0.98] transition-transform">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold mb-1">Actifs</p>
            <p className="text-xl font-black text-foreground/90">{formatCurrency(stats.totalAssets)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Patrimoine hors comptes</p>
          </button>
        )

      case 'entrees':
        return (
          <button onClick={() => navigate('/operations')}
            className="relative overflow-hidden rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-left w-full active:scale-[0.98] transition-transform">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/15 rounded-full blur-xl" />
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-semibold mb-1">↑ Revenus</p>
            <p className="text-xl font-black text-gradient-emerald">{formatCurrency(stats.monthIncomeTotal)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{getMonthLabel(monthKey)}</p>
          </button>
        )

      case 'depenses':
        return (
          <button onClick={() => navigate('/operations')}
            className="relative overflow-hidden rounded-2xl bg-orange-500/5 border border-orange-500/20 p-4 text-left w-full active:scale-[0.98] transition-transform">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-orange-500/15 rounded-full blur-xl" />
            <p className="text-[10px] text-orange-400/70 uppercase tracking-wider font-semibold mb-1">↓ Dépenses</p>
            <p className="text-xl font-black text-gradient-orange">{formatCurrency(stats.monthExpenses)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{getMonthLabel(monthKey)}</p>
          </button>
        )

      case 'cashflow':
        return (
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
        )

      case 'dette':
        return stats.totalDebts > 0 ? (
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
        ) : (
          <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 flex items-center gap-2">
            <span className="text-emerald-400 text-sm font-semibold">✓ Aucune dette</span>
          </div>
        )

      case 'quete':
        return (
          <div className="space-y-3">
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
          </div>
        )

      case 'missions':
        return (
          <button onClick={() => navigate('/plan')}
            className="w-full rounded-2xl bg-card border border-border/40 p-4 text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗺️</span>
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Guide Financier</p>
              </div>
              <span className="text-xs text-primary font-bold">{missionsPct}%</span>
            </div>
            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-700"
                style={{ width: `${missionsPct}%` }} />
            </div>
            {topMissions.map(m => (
              <div key={m.id} className="flex items-center gap-2 py-1">
                <span className="text-sm">{m.emoji}</span>
                <p className="text-xs text-foreground flex-1 truncate">{m.title}</p>
                <span className="text-[10px] text-muted-foreground">{Math.round(m.pct)}%</span>
              </div>
            ))}
            <p className="text-[10px] text-primary font-semibold mt-2">Voir le guide →</p>
          </button>
        )

      case 'objectifs':
        return projects.length > 0 ? (
          <button onClick={() => navigate('/objectifs')}
            className="w-full rounded-2xl bg-card border border-border/40 p-4 text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎁</span>
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Objectifs</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{projects.filter(p => !p.completedAt).length} en cours</span>
            </div>
            {activeProjects.map(p => {
              const pct = p.targetAmount > 0 ? Math.min(100, (p.savedAmount / p.targetAmount) * 100) : 0
              return (
                <div key={p.id} className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-foreground truncate flex-1">{p.label}</p>
                    <span className="text-[10px] text-muted-foreground ml-2">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <p className="text-[10px] text-primary font-semibold mt-1">Voir tout →</p>
          </button>
        ) : (
          <button onClick={() => navigate('/objectifs')}
            className="w-full rounded-2xl bg-muted/20 border border-dashed border-border/40 p-4 text-center active:scale-[0.98] transition-transform">
            <span className="text-2xl">🎁</span>
            <p className="text-xs text-muted-foreground mt-1">Crée ton premier objectif d'épargne</p>
          </button>
        )

      case 'evolution': {
        const EV_LINES = [
          { key: 'epargne',   label: 'Épargne',     color: 'hsl(38 70% 55%)'  },
          { key: 'dettes',    label: 'Dettes',      color: 'hsl(0 65% 52%)'   },
          { key: 'tresorerie',label: 'Trésorerie',  color: 'hsl(165 60% 45%)' },
          { key: 'crypto',    label: 'Crypto',      color: 'hsl(280 60% 55%)' },
        ]
        return (
          <div className="rounded-2xl bg-card border border-border/40 p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Évolution Finances</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Bilans mensuels</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {EV_LINES.map(l => (
                  <span key={l.key} className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: l.color }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            {evolutionData.length >= 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={evolutionData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(215 10% 48%)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    content={({ active, payload, label: lbl }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-card/95 backdrop-blur-sm border border-border/60 rounded-xl px-3 py-2 text-xs shadow-2xl">
                          <p className="text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">{lbl}</p>
                          {EV_LINES.map(l => {
                            const entry = payload.find((p: any) => p.dataKey === l.key)
                            if (!entry) return null
                            return (
                              <p key={l.key} className="font-medium" style={{ color: l.color }}>
                                {l.label} {formatCurrency(entry.value as number)}
                              </p>
                            )
                          })}
                        </div>
                      )
                    }}
                    cursor={{ stroke: 'hsl(215 10% 35%)', strokeWidth: 1, strokeDasharray: '4 2' }}
                  />
                  {EV_LINES.map(l => (
                    <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={evolutionData.length === 1 ? { r: 4, fill: l.color } : false} activeDot={{ r: 4 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex flex-col items-center justify-center gap-2">
                <span className="text-3xl opacity-30">📉</span>
                <p className="text-xs text-muted-foreground text-center">Les courbes apparaîtront après le premier bilan mensuel</p>
              </div>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-container pt-0 page-bottom-pad gap-5">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[hsl(240_28%_17%)] via-[hsl(245_22%_13%)] to-[hsl(240_18%_10%)] px-5 pt-14 pb-6 -mx-5 border-b border-white/5">
        {/* Glow decorations */}
        <div className="absolute -top-16 -right-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-4 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-8 w-32 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Settings button */}
        <button
          onClick={() => { setEditMode(e => !e); setShowAdd(false) }}
          className={`absolute top-5 right-5 p-2 rounded-xl border transition-colors ${editMode ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-white/50'}`}>
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Greeting */}
        <div className="relative mb-4">
          <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-semibold mb-1 capitalize">{dateLabel}</p>
          <p className="text-3xl font-black text-white leading-tight">{greeting} JM <span className="not-italic">👋</span></p>
        </div>

        {/* Level + XP */}
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-3xl flex-shrink-0">{level.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white/80 leading-tight">Nv.{level.level} — {level.name}</p>
              <p className="text-[10px] text-white/35 mb-1.5">{store.settings.xp} XP{nextLevel ? ` · encore ${nextLevel.minXp - store.settings.xp} XP` : ''}</p>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full max-w-[140px]">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
                  style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border flex-shrink-0 ${modeBadge.bg} ${modeBadge.text}`}>
            {modeBadge.label}
          </span>
        </div>
      </div>

      {/* Add widget button (edit mode) */}
      {editMode && hiddenWidgets.length > 0 && (
        <button onClick={() => setShowAdd(s => !s)}
          className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 text-sm text-primary font-medium flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter un widget
        </button>
      )}

      {/* Widget picker */}
      {showAdd && (
        <div className="rounded-2xl bg-card border border-border/40 p-3 space-y-1.5">
          {hiddenWidgets.map(id => (
            <button key={id} onClick={() => addWidget(id)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 text-left transition-colors">
              <span className="text-lg">{WIDGET_META[id].emoji}</span>
              <span className="text-sm text-foreground flex-1">{WIDGET_META[id].label}</span>
              <Plus className="w-4 h-4 text-primary" />
            </button>
          ))}
        </div>
      )}

      {/* Widget list */}
      <div className="space-y-4">
        {(() => {
          const SMALL: Set<WidgetId> = new Set(['comptes', 'actifs', 'entrees', 'depenses'])
          const rows: Array<{ type: 'single'; id: WidgetId; idx: number } | { type: 'pair'; ids: [WidgetId, WidgetId]; indices: [number, number] }> = []
          let i = 0
          while (i < layout.length) {
            const id = layout[i]
            const nextId = i + 1 < layout.length ? layout[i + 1] : null
            if (!editMode && SMALL.has(id) && nextId && SMALL.has(nextId)) {
              rows.push({ type: 'pair', ids: [id, nextId], indices: [i, i + 1] })
              i += 2
            } else {
              rows.push({ type: 'single', id, idx: i })
              i++
            }
          }
          return rows.map((row, ri) => {
            if (row.type === 'pair') {
              return (
                <div key={row.ids.join('-')} className="grid grid-cols-2 gap-3">
                  {row.ids.map((id, pi) => (
                    <div key={id} ref={el => { widgetRefs.current[row.indices[pi]] = el }}>
                      {renderWidget(id)}
                    </div>
                  ))}
                </div>
              )
            }
            const { id, idx } = row
            return (
              <div
                key={id}
                ref={el => { widgetRefs.current[idx] = el }}
                style={{ opacity: draggingIdx === idx ? 0.4 : 1, transition: 'opacity 0.15s' }}
                className={dragOverIdx === idx && draggingIdx !== null && draggingIdx !== idx ? 'ring-2 ring-primary/40 rounded-2xl' : ''}>
                {editMode && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div onTouchStart={e => onHandleTouchStart(e, idx)} className="touch-none p-1.5 -ml-1 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground flex-1 font-medium">{WIDGET_META[id].emoji} {WIDGET_META[id].label}</span>
                    <button onClick={() => removeWidget(id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 active:bg-rose-500/20">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {renderWidget(id)}
              </div>
            )
          })
        })()}
      </div>

      {/* Edit mode hint */}
      {editMode && (
        <p className="text-center text-[10px] text-muted-foreground/50 pb-2">
          Maintenez ⠿ et glissez pour réorganiser · × pour retirer
        </p>
      )}
    </div>
  )
}
