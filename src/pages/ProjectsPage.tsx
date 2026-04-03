import React, { useState, useMemo, useCallback } from 'react'
import { ArrowLeft, Plus, Trash2, Gift } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, PROJECT_THEMES, getProjectXp, getProjectMilestoneBonus } from '@/lib/constants'
import type { FinanceStore, Project, ProjectTheme } from '@/types/finance'
import { Progress } from '@/components/ui/progress'

interface Props {
  store: FinanceStore
  onAdd: (p: Project) => void
  onUpdate: (id: string, patch: Partial<Project>) => void
  onRemove: (id: string) => void
  onAddXp: (amount: number) => void
}

export const ProjectsPage: React.FC<Props> = ({ store, onAdd, onUpdate, onRemove, onAddXp }) => {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [theme, setTheme] = useState<ProjectTheme>('tech')
  const [label, setLabel] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const projects = store.projects || []

  const handleCreate = () => {
    if (!label || !target) return
    const amount = Number(target)
    const xp = getProjectXp(theme, amount)
    const p: Project = {
      id: crypto.randomUUID(),
      theme,
      label,
      targetAmount: amount,
      savedAmount: 0,
      targetDate: targetDate || undefined,
      createdAt: new Date().toISOString(),
      milestonesReached: [],
    }
    onAdd(p)
    onAddXp(xp.base + xp.bonus)
    setLabel(''); setTarget(''); setTargetDate(''); setShowCreate(false)
  }

  const handleUpdateSaved = (p: Project, newSaved: number) => {
    const pct = p.targetAmount > 0 ? (newSaved / p.targetAmount) * 100 : 0
    const milestones = [25, 50, 75, 100]
    const newMilestones = [...p.milestonesReached]
    milestones.forEach(m => {
      if (pct >= m && !newMilestones.includes(m)) {
        newMilestones.push(m)
        onAddXp(getProjectMilestoneBonus(m))
      }
    })
    onUpdate(p.id, {
      savedAmount: newSaved,
      milestonesReached: newMilestones,
      completedAt: pct >= 100 ? new Date().toISOString() : undefined,
    })
  }

  const inputCls = 'w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none'

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-foreground uppercase tracking-wider flex-1">Objectifs</h1>
        <button onClick={() => setShowCreate(true)} className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Create */}
      {showCreate && (
        <FinanceCard className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Nouvel objectif</h3>
          <div>
            <label className="text-xs text-muted-foreground">Thème</label>
            <select value={theme} onChange={e => setTheme(e.target.value as ProjectTheme)} className={inputCls}>
              {Object.entries(PROJECT_THEMES).map(([key, val]) => (
                <option key={key} value={key}>{val.emoji} {val.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Libellé</label>
            <input className={inputCls} placeholder="Ex: MacBook Pro montage" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Montant cible (€)</label>
            <input className={inputCls} type="number" placeholder="2000" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date cible (optionnel)</label>
            <input className={inputCls} type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
          {label && target && (
            <div className="text-xs text-primary bg-primary/5 rounded-xl px-3 py-2">
              XP à gagner : {getProjectXp(theme, Number(target)).base + getProjectXp(theme, Number(target)).bonus} XP
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted/50 text-foreground">Annuler</button>
            <button onClick={handleCreate} disabled={!label || !target} className="flex-1 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-semibold disabled:opacity-40">Créer</button>
          </div>
        </FinanceCard>
      )}

      {/* Projects list */}
      {projects.length === 0 && !showCreate && (
        <FinanceCard className="text-center py-8">
          <Gift className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun objectif pour l'instant.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Crée ton premier objectif d'épargne : voyage, tech, cadeau…</p>
        </FinanceCard>
      )}

      {projects.map(p => {
        const themeMeta = PROJECT_THEMES[p.theme]
        const pct = p.targetAmount > 0 ? Math.min(100, (p.savedAmount / p.targetAmount) * 100) : 0
        const remaining = Math.max(0, p.targetAmount - p.savedAmount)
        const xp = getProjectXp(p.theme, p.targetAmount)
        const totalXp = xp.base + xp.bonus
        const milestoneXpEarned = (p.milestonesReached || []).reduce((s, m) => s + getProjectMilestoneBonus(m), 0)

        return (
          <FinanceCard key={p.id} className={p.completedAt ? 'border-emerald-500/30' : ''}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{themeMeta?.emoji || '🎯'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{themeMeta?.label || p.theme}</p>
                <p className={`text-sm font-bold ${p.completedAt ? 'text-emerald-400' : 'text-foreground'}`}>{p.label}</p>
              </div>
              <button onClick={() => onRemove(p.id)} className="p-1.5 text-muted-foreground/40 active:text-rose-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-muted-foreground">{formatCurrency(p.savedAmount)} / {formatCurrency(p.targetAmount)}</span>
              <span className="text-xs font-bold text-foreground">{Math.round(pct)}%</span>
            </div>
            <Progress value={pct} className="h-2" />

            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">Reste : {formatCurrency(remaining)}</span>
              <span className="text-[10px] text-primary font-medium">{totalXp + milestoneXpEarned} XP gagné{milestoneXpEarned > 0 ? 's' : ''}</span>
            </div>

            {/* Milestones */}
            <div className="flex gap-1 mt-2">
              {[25, 50, 75, 100].map(m => (
                <div key={m} className={`flex-1 h-1 rounded-full ${(p.milestonesReached || []).includes(m) ? 'bg-emerald-500' : 'bg-muted/40'}`} />
              ))}
            </div>

            {/* Update saved amount */}
            {!p.completedAt && (
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  placeholder="Montant épargné"
                  className="flex-1 bg-muted/50 rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = Number((e.target as HTMLInputElement).value)
                      if (val > 0) {
                        handleUpdateSaved(p, p.savedAmount + val);
                        (e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                />
                <button
                  onClick={e => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
                    const val = Number(input.value)
                    if (val > 0) {
                      handleUpdateSaved(p, p.savedAmount + val)
                      input.value = ''
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                  +
                </button>
              </div>
            )}
          </FinanceCard>
        )
      })}
    </div>
  )
}
