import React, { useMemo, useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Target, CheckCircle2, Circle, TrendingDown } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, MISSION_AXIS_META } from '@/lib/constants'
import { computeMissions, generateAdaptiveAdvice, getPilotageRecommendation } from '@/lib/analytics'
import type { FinanceStore, MissionAxis, ComputedMission } from '@/types/finance'
import { useNavigate } from 'react-router-dom'

interface Props {
  store: FinanceStore
}

const MODE_STYLES = {
  acceleration: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', emoji: '🚀', label: 'Accélération' },
  regulation: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', emoji: '⚙️', label: 'Régulation' },
  protection: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', emoji: '🛑', label: 'Protection' },
}

export const PlanPage: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate()
  const [expandedAxis, setExpandedAxis] = useState<MissionAxis | null>(null)

  const missions = useMemo(() => computeMissions(store), [store])
  const advice = useMemo(() => generateAdaptiveAdvice(store), [store])
  const pilotage = useMemo(() => getPilotageRecommendation(store), [store])
  const modeStyle = MODE_STYLES[pilotage.mode]

  const totalMissions = missions.length
  const completedMissions = missions.filter(m => m.completed).length
  const activeMissions = totalMissions - completedMissions
  const globalPct = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0

  // Priority
  const priority = useMemo(() => {
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    const lep = store.accounts.find(a => a.id === 'lep')?.currentBalance || 0
    const livretA = store.accounts.find(a => a.id === 'livret-a')?.currentBalance || 0
    if (totalDebts > 0) return { emoji: '🧹', label: 'Réduire les dettes', color: 'text-amber-400' }
    if (lep < 1000) return { emoji: '🛡️', label: 'Renforcer le fonds d\'urgence', color: 'text-blue-400' }
    if (livretA < 500) return { emoji: '🛡️', label: 'Stabiliser la trésorerie', color: 'text-blue-400' }
    return { emoji: '📈', label: 'Lancer les investissements', color: 'text-emerald-400' }
  }, [store])

  const axes: MissionAxis[] = ['assainir', 'securiser', 'structurer', 'investir', 'accelerer']

  const groupedMissions = useMemo(() => {
    const groups: Record<MissionAxis, ComputedMission[]> = { assainir: [], securiser: [], structurer: [], investir: [], accelerer: [] }
    missions.forEach(m => groups[m.axis].push(m))
    return groups
  }, [missions])

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <h1 className="text-2xl font-extrabold text-foreground uppercase tracking-wider">Guide Financier</h1>

      {/* Summary */}
      <div className="p-px rounded-3xl bg-gradient-to-br from-primary/40 via-emerald-500/20 to-amber-500/20">
        <div className="rounded-[calc(1.5rem-1px)] bg-card px-5 py-5 flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="8" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="url(#planGrad)" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - globalPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
              <defs>
                <linearGradient id="planGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-foreground leading-none">{globalPct}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium">{completedMissions} / {totalMissions} missions</p>
            <p className="text-xs text-muted-foreground">{activeMissions} en cours</p>
            <div className="mt-2 w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-700"
                style={{ width: `${globalPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Priority */}
      <FinanceCard className="border-primary/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <span className="text-xl">{priority.emoji}</span>
          <div>
            <p className="text-[10px] text-primary/70 uppercase tracking-wider font-semibold">Priorité actuelle</p>
            <p className={`text-sm font-bold ${priority.color}`}>{priority.label}</p>
          </div>
        </div>
      </FinanceCard>

      {/* Pilotage Mode */}
      <FinanceCard className={`${modeStyle.border} ${modeStyle.bg}`}>
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{modeStyle.emoji}</span>
          <div className="flex-1">
            <p className={`text-xs font-semibold uppercase tracking-wider ${modeStyle.text}`}>Mode {modeStyle.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{pilotage.reason}</p>
            <p className="text-xs text-foreground mt-1">{pilotage.adjustment}</p>
          </div>
        </div>
      </FinanceCard>

      {/* Missions by axis */}
      {axes.map(axis => {
        const list = groupedMissions[axis]
        if (list.length === 0) return null
        const meta = MISSION_AXIS_META[axis]
        const axisCompleted = list.filter(m => m.completed).length
        const isExpanded = expandedAxis === axis || expandedAxis === null
        return (
          <div key={axis}>
            <button onClick={() => setExpandedAxis(expandedAxis === axis ? null : axis)}
              className="flex items-center gap-2 mb-3 w-full text-left">
              <span>{meta.emoji}</span>
              <h2 className={`text-sm font-semibold uppercase tracking-wider flex-1 ${meta.color}`}>{meta.label}</h2>
              <span className="text-[10px] text-muted-foreground">{axisCompleted}/{list.length}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {isExpanded && (
              <div className="space-y-2">
                {list.map(m => (
                  <MissionCard key={m.id} mission={m} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Adaptive Advice */}
      {advice.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Conseils du moment</h2>
          </div>
          <div className="space-y-2">
            {advice.map((a, i) => (
              <FinanceCard key={i} className="border-primary/20 bg-primary/5">
                <p className="text-xs text-foreground/90 leading-relaxed">{a}</p>
              </FinanceCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Mission Card ──────────────────────────────────────────────────────────────

const MissionCard: React.FC<{ mission: ComputedMission }> = ({ mission: m }) => {
  const isReduce = m.type === 'amount_reduce'
  const isBool = m.type === 'boolean'

  return (
    <FinanceCard className={m.completed ? 'opacity-70' : ''}>
      <div className="flex items-center gap-3">
        {m.completed
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          : isReduce
            ? <TrendingDown className="w-5 h-5 text-amber-400 flex-shrink-0" />
            : isBool
              ? <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              : <Target className="w-5 h-5 text-primary flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${m.completed ? 'text-emerald-400 line-through' : 'text-foreground'}`}>{m.title}</p>
          {!isBool && m.type === 'amount_target' && m.targetValue > 100 && (
            <p className="text-[11px] text-muted-foreground">
              {m.id.includes('epargne') ? `${Math.round(m.currentValue)}%` : formatCurrency(m.currentValue)} / {m.id.includes('epargne') ? `${m.targetValue}%` : formatCurrency(m.targetValue)}
            </p>
          )}
          {isReduce && m.currentValue > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Reste : {formatCurrency(m.currentValue)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {m.completed && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
          <span className="text-xs text-primary font-medium">{m.xpReward} XP</span>
        </div>
      </div>
      {!isBool && !m.completed && (
        <div className="mt-2 w-full bg-muted/50 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all ${m.completed ? 'bg-emerald-500' : isReduce ? 'bg-amber-500' : 'bg-primary'}`}
            style={{ width: `${Math.max(2, m.pct)}%` }} />
        </div>
      )}
    </FinanceCard>
  )
}
