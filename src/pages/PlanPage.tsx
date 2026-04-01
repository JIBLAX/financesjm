import React, { useMemo, useState } from 'react'
import { Plus, ChevronRight, ChevronDown, Check, Sparkles, Shield } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, QUEST_CATEGORY_META, getLevelForXp, getCurrentMonthKey } from '@/lib/constants'
import { calculatePilotageMode, getPilotageRecommendation } from '@/lib/analytics'
import type { FinanceStore, Quest, QuestCategory } from '@/types/finance'
import { useNavigate } from 'react-router-dom'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface Props {
  store: FinanceStore
  onUpdateQuest: (id: string, patch: Partial<Quest>) => void
  onAddQuest: (q: Quest) => void
  onAddXp: (amount: number) => void
}

const MODE_STYLES = {
  acceleration: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', emoji: '🚀', label: 'Accélération' },
  regulation: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', emoji: '⚙️', label: 'Régulation' },
  protection: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', emoji: '🛑', label: 'Protection' },
}

export const PlanPage: React.FC<Props> = ({ store, onUpdateQuest, onAddQuest, onAddXp }) => {
  const navigate = useNavigate()
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newAccountId, setNewAccountId] = useState('')
  const [newDate, setNewDate] = useState('')

  const pilotage = useMemo(() => getPilotageRecommendation(store), [store])
  const modeStyle = MODE_STYLES[pilotage.mode]

  const quests = useMemo(() => {
    const totalAccounts = store.accounts.filter(a => a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    const netWorth = totalAccounts + totalAssets - totalDebts

    return store.quests.map(q => {
      let currentAmount = q.currentAmount
      if (q.linkedAccountId) {
        const acc = store.accounts.find(a => a.id === q.linkedAccountId)
        if (acc) currentAmount = acc.currentBalance
      }
      if (['q7', 'q10', 'q13', 'q19', 'q20', 'q21'].includes(q.id)) {
        currentAmount = netWorth
      }
      if (q.id === 'q3') {
        currentAmount = totalDebts === 0 ? 1 : 0
        return { ...q, currentAmount, targetAmount: totalDebts === 0 ? 1 : 1 }
      }
      return { ...q, currentAmount }
    })
  }, [store])

  const conseil = useMemo(() => {
    const monthKey = getCurrentMonthKey()
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    const lep = store.accounts.find(a => a.id === 'lep')?.currentBalance || 0
    const monthlyExpenses = store.transactions.filter(t => t.monthKey === monthKey && t.direction === 'expense' && t.isRecurring).reduce((s, t) => s + t.amount, 0)
    const monthsCovered = monthlyExpenses > 0 ? Math.floor(lep / monthlyExpenses) : 0

    if (totalDebts > 0) {
      const creditConso = store.debts.find(d => d.name.toLowerCase().includes('crédit'))
      if (creditConso) {
        const months = creditConso.monthlyPayment > 0 ? Math.ceil(creditConso.outstandingBalance / creditConso.monthlyPayment) : 0
        return `Tu es à ${months} mois de rembourser ton crédit. En ajoutant 50 €/mois tu passes à ${Math.max(1, months - 2)} mois.`
      }
      return `Total dettes : ${formatCurrency(totalDebts)}. Priorité : les rembourser pour débloquer le niveau 2.`
    }
    if (lep < 2000) {
      return `Ton fonds d'urgence couvre ${monthsCovered} mois de charges. Priorité : atteindre ${monthsCovered < 1 ? '1 mois' : '2 mois'} de couverture.`
    }
    return `Félicitations ! Continue sur ta lancée. Prochain objectif : patrimoine 5 000 €.`
  }, [store])

  const groupedQuests = useMemo(() => {
    const groups: Record<string, Quest[]> = {}
    const order: QuestCategory[] = ['assainissement', 'securisation', 'croissance', 'liberte', 'liberte2', 'custom']
    order.forEach(cat => {
      const items = quests.filter(q => q.category === cat)
      if (items.length > 0) groups[cat] = items
    })
    return groups
  }, [quests])

  const handleComplete = (quest: Quest) => {
    if (quest.status === 'completed') return
    onUpdateQuest(quest.id, { status: 'completed' })
    onAddXp(quest.xpReward)
  }

  const handleCreate = () => {
    if (!newTitle) return
    const q: Quest = {
      id: crypto.randomUUID(), title: newTitle, emoji: '🎯', category: 'custom',
      description: '', targetAmount: Number(newTarget) || 0, currentAmount: 0,
      linkedAccountId: newAccountId || undefined, steps: [], xpReward: 100,
      status: 'active', isCustom: true, targetDate: newDate || undefined, order: 99,
    }
    onAddQuest(q)
    setNewTitle(''); setNewTarget(''); setNewAccountId(''); setNewDate(''); setShowCreate(false)
  }

  const presets = [
    { title: 'MacBook Pro', target: 2000 },
    { title: 'Voyage Japon', target: 3000 },
    { title: 'Fond de roulement pro', target: 5000 },
    { title: 'Noël 2026', target: 500 },
  ]

  const globalStats = useMemo(() => {
    const total = quests.length
    const completed = quests.filter(q => q.status === 'completed').length
    const active = quests.filter(q => q.status === 'active').length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, active, pct }
  }, [quests])

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      {/* Hero Progress */}
      <div className="p-px rounded-3xl bg-gradient-to-br from-primary/40 via-emerald-500/20 to-amber-500/20">
        <div className="rounded-[calc(1.5rem-1px)] bg-card px-5 py-5 flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke="url(#planGrad)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - globalStats.pct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
              <defs>
                <linearGradient id="planGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-foreground leading-none">{globalStats.pct}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-gradient-primary mb-1">Progression</h1>
            <p className="text-sm text-foreground font-medium">{globalStats.completed} / {globalStats.total} quêtes</p>
            <p className="text-xs text-muted-foreground">{globalStats.active} en cours</p>
            <div className="mt-2 w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-700"
                style={{ width: `${globalStats.pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pilotage Mode */}
      <FinanceCard className={`${modeStyle.border} ${modeStyle.bg}`}>
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{modeStyle.emoji}</span>
          <div className="flex-1">
            <p className={`text-xs font-semibold uppercase tracking-wider ${modeStyle.text}`}>Mode {modeStyle.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{pilotage.reason}</p>
            <p className="text-xs text-foreground mt-1.5">{pilotage.adjustment}</p>
          </div>
        </div>
      </FinanceCard>

      {/* Conseil du moment */}
      <FinanceCard className="border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Conseil du moment</p>
            <p className="text-sm text-foreground">{conseil}</p>
          </div>
        </div>
      </FinanceCard>

      {/* Quest groups */}
      {Object.entries(groupedQuests).map(([cat, questList]) => {
        const meta = QUEST_CATEGORY_META[cat]
        const grpCompleted = questList.filter(q => q.status === 'completed').length
        const grpTotal = questList.length
        const grpPct = grpTotal > 0 ? Math.round((grpCompleted / grpTotal) * 100) : 0
        const circumference = 2 * Math.PI * 10
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <span>{meta?.emoji}</span>
              <h2 className={`text-sm font-semibold uppercase tracking-wider flex-1 ${meta?.color || 'text-muted-foreground'}`}>{meta?.label}</h2>
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--muted)/0.4)" strokeWidth="2.5" />
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"
                    className={meta?.color || 'text-muted-foreground'} strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={`${circumference * (1 - grpPct / 100)}`}
                  />
                </svg>
                <span className="text-[10px] text-muted-foreground">{grpCompleted}/{grpTotal}</span>
              </div>
            </div>
            <div className="space-y-2">
              {questList.map(q => {
                const pct = q.targetAmount > 0 ? Math.min(100, (q.currentAmount / q.targetAmount) * 100) : (q.status === 'completed' ? 100 : 0)
                const isExpanded = expandedQuest === q.id
                const isLocked = q.status === 'locked'

                return (
                  <FinanceCard key={q.id} className={isLocked ? 'opacity-50' : ''}>
                    <button onClick={() => !isLocked && setExpandedQuest(isExpanded ? null : q.id)} className="w-full text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg">{q.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${q.status === 'completed' ? 'text-emerald-400 line-through' : 'text-foreground'}`}>{q.title}</p>
                            {q.targetAmount > 0 && (
                              <p className="text-xs text-muted-foreground">{formatCurrency(q.currentAmount)} / {formatCurrency(q.targetAmount)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-primary font-medium">{q.xpReward} XP</span>
                          {isLocked ? null : isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {q.targetAmount > 0 && (
                        <div className="mt-2 w-full bg-muted/50 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${q.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </button>

                    {isExpanded && !isLocked && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        {q.description && <p className="text-xs text-muted-foreground">{q.description}</p>}
                        {q.steps.length > 0 && (
                          <div className="space-y-1.5">
                            {q.steps.map((step, i) => (
                              <button key={i} onClick={(e) => { e.stopPropagation(); const newSteps = [...q.steps]; newSteps[i] = { ...step, completed: !step.completed }; onUpdateQuest(q.id, { steps: newSteps }) }}
                                className="flex items-center gap-2 w-full text-left">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${step.completed ? 'bg-primary border-primary' : 'border-border'}`}>
                                  {step.completed && <Check className="w-3 h-3 text-primary-foreground" />}
                                </div>
                                <span className={`text-xs ${step.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{step.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {q.targetAmount > 0 && q.status !== 'completed' && (
                          <p className="text-xs text-muted-foreground italic">Projection estimée basée sur tes données actuelles</p>
                        )}
                        {q.status !== 'completed' && pct >= 100 && (
                          <button onClick={() => handleComplete(q)} className="w-full py-2 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-400 mt-2">
                            Compléter (+{q.xpReward} XP)
                          </button>
                        )}
                      </div>
                    )}
                  </FinanceCard>
                )
              })}
            </div>

            {cat === 'liberte' && (
              <FinanceCard className="mt-3" onClick={() => navigate('/liberte2')}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">🏁 Road to 100 000 € — Solidité →</span>
                  <ChevronRight className="w-4 h-4 text-primary" />
                </div>
              </FinanceCard>
            )}
          </div>
        )
      })}

      {/* Create custom quest */}
      {!showCreate ? (
        <button onClick={() => setShowCreate(true)} className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground font-medium flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Créer une quête
        </button>
      ) : (
        <FinanceCard className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Nouvelle quête</h3>
          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Titre" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Objectif €" type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} />
          <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={newAccountId} onChange={e => setNewAccountId(e.target.value)}>
            <option value="">Compte cible (optionnel)</option>
            {store.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.title} onClick={() => { setNewTitle(p.title); setNewTarget(String(p.target)) }} className="px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                {p.title}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted/50 text-foreground">Annuler</button>
            <button onClick={handleCreate} className="flex-1 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-semibold">Créer</button>
          </div>
        </FinanceCard>
      )}
    </div>
  )
}
