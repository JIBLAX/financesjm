import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, TrendingUp, Shield, Award, ChevronDown } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getLevelForXp, getNextLevel, LEVELS } from '@/lib/constants'
import { calculateHealthScore } from '@/lib/analytics'
import type { FinanceStore, ProfileRegulation, LifeSituation, RevenueStability } from '@/types/finance'

interface Props {
  store: FinanceStore
  onUpdateRegulation?: (patch: Partial<ProfileRegulation>) => void
}

const PROFILE_LABELS: Record<string, { label: string; desc: string }> = {
  prudent: { label: 'Prudent', desc: 'Tu privilégies la sécurité et la stabilité. Tes investissements sont conservateurs avec des rendements réguliers.' },
  equilibre: { label: 'Équilibré', desc: 'Tu acceptes un risque modéré pour de meilleurs rendements. Un mix d\'actions et d\'obligations te convient.' },
  dynamique: { label: 'Dynamique', desc: 'Tu vises la performance et acceptes la volatilité. Les ETF actions et l\'immobilier t\'attirent.' },
  entrepreneur: { label: 'Entrepreneur', desc: 'Tu crois en la croissance de tes revenus. Tu investis dans toi-même et dans des actifs à fort potentiel.' },
}

export const ProfilePage: React.FC<Props> = ({ store, onUpdateRegulation }) => {
  const navigate = useNavigate()
  const [showRegulation, setShowRegulation] = useState(false)
  const healthScore = useMemo(() => calculateHealthScore(store), [store])
  const level = getLevelForXp(store.settings.xp)
  const nextLevel = getNextLevel(level.level)
  const reg = store.settings.profileRegulation

  const scoreColor = healthScore.total >= 75 ? 'text-emerald-400' : healthScore.total >= 60 ? 'text-amber-300' : healthScore.total >= 40 ? 'text-amber-500' : 'text-destructive'
  const scoreTrack = healthScore.total >= 75 ? 'bg-emerald-500' : healthScore.total >= 60 ? 'bg-amber-300' : healthScore.total >= 40 ? 'bg-amber-500' : 'bg-destructive'

  const criteria = [
    { label: 'Ratio dettes', value: healthScore.debtRatio, max: 20 },
    { label: 'Taux d\'épargne', value: healthScore.savingsRate, max: 20 },
    { label: 'Fonds d\'urgence', value: healthScore.emergencyFund, max: 20 },
    { label: 'Régularité', value: healthScore.regularity, max: 20 },
    { label: 'Solde mensuel', value: healthScore.monthlyBalance, max: 20 },
  ]

  const profile = store.settings.investorProfile
  const profileInfo = profile ? PROFILE_LABELS[profile] : null

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Profil</h1>
      </div>

      {/* Level */}
      <FinanceCard className="text-center">
        <span className="text-4xl">{level.emoji}</span>
        <p className="text-lg font-bold text-foreground mt-2">Niveau {level.level} — {level.name}</p>
        <p className="text-sm text-muted-foreground">{store.settings.xp} XP</p>
        {nextLevel && (
          <>
            <div className="mt-3 w-full bg-muted/50 rounded-full h-2">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((store.settings.xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{nextLevel.minXp - store.settings.xp} XP avant {nextLevel.emoji} Nv.{nextLevel.level}</p>
          </>
        )}
      </FinanceCard>

      {/* All levels */}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
        {LEVELS.map(l => (
          <div key={l.level} className={`flex-shrink-0 w-20 rounded-xl p-2 text-center ${l.level <= level.level ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 border border-border/30'}`}>
            <span className="text-xl">{l.emoji}</span>
            <p className="text-[10px] font-medium text-foreground mt-1">{l.name}</p>
            <p className="text-[9px] text-muted-foreground">{l.minXp} XP</p>
          </div>
        ))}
      </div>

      {/* Health Score */}
      <FinanceCard>
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Score de santé financière</h3>
        </div>
        <div className="text-center mb-3">
          <p className={`text-4xl font-bold ${scoreColor}`}>{healthScore.total}<span className="text-lg text-muted-foreground">/100</span></p>
        </div>
        <div className="w-full bg-muted/50 rounded-full h-3 mb-3">
          <div className={`h-3 rounded-full transition-all ${scoreTrack}`} style={{ width: `${healthScore.total}%` }} />
        </div>
        <div className="space-y-2">
          {criteria.map(c => (
            <div key={c.label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="text-foreground font-medium">{c.value}/{c.max}</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-1">
                <div className="h-1 rounded-full bg-primary" style={{ width: `${(c.value / c.max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-primary mt-3 italic">💡 {healthScore.advice}</p>
      </FinanceCard>

      {/* Investor profile */}
      <FinanceCard>
        <div className="flex items-center gap-3 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Profil investisseur</h3>
        </div>
        {profileInfo ? (
          <>
            <p className="text-lg font-bold text-foreground">{profileInfo.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{profileInfo.desc}</p>
            <button onClick={() => navigate('/questionnaire')} className="mt-3 w-full py-2 rounded-xl text-sm bg-muted/50 text-muted-foreground">Refaire le questionnaire</button>
          </>
        ) : (
          <button onClick={() => navigate('/questionnaire')} className="w-full py-3 rounded-xl text-sm font-semibold bg-primary/10 text-primary">Découvrir mon profil →</button>
        )}
      </FinanceCard>

      {/* Régulation du Profil */}
      <FinanceCard>
        <button onClick={() => setShowRegulation(s => !s)} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Régulation du profil</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showRegulation ? 'rotate-180' : ''}`} />
        </button>
        {showRegulation && onUpdateRegulation && (
          <div className="mt-4 space-y-3 border-t border-border/30 pt-4">
            <div>
              <label className="text-xs text-muted-foreground">Situation de vie</label>
              <div className="flex gap-2 mt-1">
                {(['solo', 'couple', 'famille'] as LifeSituation[]).map(s => (
                  <button key={s} onClick={() => onUpdateRegulation({ lifeSituation: s })} className={`flex-1 py-2 rounded-xl text-xs font-medium ${reg.lifeSituation === s ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                    {s === 'solo' ? '👤 Solo' : s === 'couple' ? '👥 Couple' : '👨‍👩‍👧 Famille'}
                  </button>
                ))}
              </div>
            </div>
            {reg.lifeSituation === 'famille' && (
              <div>
                <label className="text-xs text-muted-foreground">Nombre d'enfants</label>
                <input type="number" min="0" max="10" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" value={reg.childrenCount} onChange={e => onUpdateRegulation({ childrenCount: Number(e.target.value) || 0 })} />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Charges familiales mensuelles estimées</label>
              <input type="number" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" value={reg.monthlyFamilyCharges} onChange={e => onUpdateRegulation({ monthlyFamilyCharges: Number(e.target.value) || 0 })} placeholder="€" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Stabilité des revenus</label>
              <div className="flex gap-2 mt-1">
                {(['stable', 'variable', 'fragile'] as RevenueStability[]).map(s => (
                  <button key={s} onClick={() => onUpdateRegulation({ revenueStability: s })} className={`flex-1 py-2 rounded-xl text-xs font-medium ${reg.revenueStability === s ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                    {s === 'stable' ? 'Stable' : s === 'variable' ? 'Variable' : 'Fragile'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Niveau de sécurité souhaité (1-5)</label>
              <input type="range" min="1" max="5" className="w-full mt-1" value={reg.desiredSecurityLevel} onChange={e => onUpdateRegulation({ desiredSecurityLevel: Number(e.target.value) })} />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>Min</span><span>{reg.desiredSecurityLevel}/5</span><span>Max</span></div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tolérance au stress financier (1-5)</label>
              <input type="range" min="1" max="5" className="w-full mt-1" value={reg.financialStressTolerance} onChange={e => onUpdateRegulation({ financialStressTolerance: Number(e.target.value) })} />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>Faible</span><span>{reg.financialStressTolerance}/5</span><span>Élevée</span></div>
            </div>
          </div>
        )}
      </FinanceCard>

      {/* Trajectory link */}
      <FinanceCard onClick={() => navigate('/trajectoire')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Ma trajectoire</p>
              <p className="text-xs text-muted-foreground">Simulateur de patrimoine à 60 ans</p>
            </div>
          </div>
          <span className="text-primary text-sm">→</span>
        </div>
      </FinanceCard>
    </div>
  )
}
