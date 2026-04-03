import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Shield, ChevronDown, ChevronRight, Target, Sliders, Rocket } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getLevelForXp, getNextLevel, LEVELS } from '@/lib/constants'
import { calculateHealthScore } from '@/lib/analytics'
import type { FinanceStore, ProfileRegulation, LifeSituation, RevenueStability } from '@/types/finance'

interface Props {
  store: FinanceStore
  onUpdateRegulation?: (patch: Partial<ProfileRegulation>) => void
}

// ─── Profile data ──────────────────────────────────────────────────────────

const PROFILE_DATA: Record<string, {
  label: string
  emoji: string
  riskLevel: string
  riskColor: string
  desc: string
  impact: string
  allocation: string
  advice: string
}> = {
  prudent: {
    label: 'Prudent',
    emoji: '🛡️',
    riskLevel: 'Risque faible',
    riskColor: 'text-emerald-400',
    desc: 'Tu privilégies la sécurité et la stabilité. Tu préfères des rendements réguliers à la prise de risque.',
    impact: 'Les conseils sont orientés vers la sécurisation du patrimoine, la constitution d\'un fonds d\'urgence solide et les placements sans risque.',
    allocation: '70% Épargne sécurisée · 20% Obligations · 10% Actions',
    advice: 'Priorité : fonds d\'urgence solide, puis livrets et fonds en euros.',
  },
  equilibre: {
    label: 'Équilibré',
    emoji: '⚖️',
    riskLevel: 'Risque modéré',
    riskColor: 'text-amber-400',
    desc: 'Tu acceptes un risque modéré pour de meilleurs rendements. Tu cherches un équilibre entre sécurité et croissance.',
    impact: 'Les recommandations mixent sécurité et investissement. Tu es guidé vers un portefeuille diversifié adapté à ton horizon.',
    allocation: '40% Épargne · 35% ETF / Actions · 25% Obligations',
    advice: 'Diversifie entre livrets, ETF World et un fonds en euros.',
  },
  dynamique: {
    label: 'Dynamique',
    emoji: '🚀',
    riskLevel: 'Risque élevé',
    riskColor: 'text-orange-400',
    desc: 'Tu vises la performance et acceptes la volatilité à court terme. Tu penses sur le long terme.',
    impact: 'Le plan est orienté vers la croissance patrimoniale : ETF, actions, immobilier. La sécurité est un socle, pas l\'objectif final.',
    allocation: '20% Épargne · 60% ETF / Actions / Crypto · 20% Immobilier',
    advice: 'Construis d\'abord ton socle sécurisé, puis investis agressivement.',
  },
  entrepreneur: {
    label: 'Entrepreneur',
    emoji: '💼',
    riskLevel: 'Risque très élevé',
    riskColor: 'text-rose-400',
    desc: 'Tu crois en la croissance de tes revenus et investis dans toi-même. Tu acceptes une forte volatilité pour un fort potentiel.',
    impact: 'Les conseils favorisent le réinvestissement dans ton activité, la croissance des revenus actifs et des placements à fort potentiel.',
    allocation: '10% Épargne · 40% Business / Actifs pro · 50% Investissements haut risque',
    advice: 'Priorité : augmenter tes revenus actifs avant d\'investir massivement.',
  },
}

// ─── Health score labels ────────────────────────────────────────────────────

function getHealthLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: 'Excellente', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  if (score >= 65) return { label: 'Bonne', color: 'text-emerald-300', bg: 'bg-emerald-500/10' }
  if (score >= 45) return { label: 'Moyenne', color: 'text-amber-400', bg: 'bg-amber-500/10' }
  if (score >= 25) return { label: 'Fragile', color: 'text-orange-400', bg: 'bg-orange-500/10' }
  return { label: 'Critique', color: 'text-rose-400', bg: 'bg-rose-500/10' }
}

const CRITERION_LABELS: Record<string, { label: string; emoji: string }> = {
  debtRatio: { label: 'Ratio dettes', emoji: '💳' },
  savingsRate: { label: 'Taux d\'épargne', emoji: '💰' },
  emergencyFund: { label: 'Fonds d\'urgence', emoji: '🛡️' },
  regularity: { label: 'Régularité', emoji: '📊' },
  monthlyBalance: { label: 'Solde mensuel', emoji: '📅' },
}

const WEAKEST_PRIORITY: Record<string, string> = {
  debtRatio: 'Réduis ta dette en priorité ce mois',
  savingsRate: 'Cherche à épargner au moins 10% de tes revenus',
  emergencyFund: 'Renforce ton fonds d\'urgence (LEP)',
  regularity: 'Saisis tes transactions régulièrement',
  monthlyBalance: 'Vise un solde mensuel positif',
}

// ─── Component ─────────────────────────────────────────────────────────────

export const ProfilePage: React.FC<Props> = ({ store, onUpdateRegulation }) => {
  const navigate = useNavigate()
  const [showAllLevels, setShowAllLevels] = useState(false)
  const [showCadre, setShowCadre] = useState(false)
  const healthScore = useMemo(() => calculateHealthScore(store), [store])
  const level = getLevelForXp(store.settings.xp)
  const nextLevel = getNextLevel(level.level)
  const reg = store.settings.profileRegulation
  const profile = store.settings.investorProfile
  const profileData = profile ? PROFILE_DATA[profile] : null
  const healthMeta = getHealthLabel(healthScore.total)
  const xpProgress = nextLevel
    ? Math.min(100, Math.round(((store.settings.xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100))
    : 100
  const xpToNext = nextLevel ? nextLevel.minXp - store.settings.xp : 0

  const scoreColor = healthScore.total >= 75 ? 'text-emerald-400' : healthScore.total >= 60 ? 'text-amber-300' : healthScore.total >= 40 ? 'text-amber-500' : 'text-destructive'
  const scoreTrack = healthScore.total >= 75 ? 'bg-emerald-500' : healthScore.total >= 60 ? 'bg-amber-300' : healthScore.total >= 40 ? 'bg-amber-500' : 'bg-destructive'

  const criteria = [
    { key: 'debtRatio',       value: healthScore.debtRatio,       max: 20 },
    { key: 'savingsRate',     value: healthScore.savingsRate,     max: 20 },
    { key: 'emergencyFund',   value: healthScore.emergencyFund,   max: 20 },
    { key: 'regularity',      value: healthScore.regularity,      max: 20 },
    { key: 'monthlyBalance',  value: healthScore.monthlyBalance,  max: 20 },
  ]

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Profil</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Mon identité financière</p>
        </div>
      </div>

      {/* ── A. Identité financière ─────────────────────────── */}
      <FinanceCard className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

        {/* Level header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">{level.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Niveau {level.level}</p>
            <p className="text-xl font-extrabold text-foreground leading-tight">{level.name}</p>
            <p className="text-sm text-primary font-semibold">{store.settings.xp.toLocaleString('fr-FR')} XP</p>
          </div>
        </div>

        {/* Progress bar */}
        {nextLevel && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{xpProgress}% vers {nextLevel.emoji} {nextLevel.name}</span>
              <span>{xpToNext.toLocaleString('fr-FR')} XP restants</span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Current + Next levels */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
            <span className="text-lg">{level.emoji}</span>
            <div>
              <p className="text-[9px] text-primary font-semibold uppercase tracking-wider">Actuel</p>
              <p className="text-xs font-bold text-foreground">{level.name}</p>
            </div>
          </div>
          {nextLevel ? (
            <div className="flex-1 flex items-center gap-2 bg-muted/20 border border-border/30 rounded-xl px-3 py-2">
              <span className="text-lg opacity-50">{nextLevel.emoji}</span>
              <div>
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Prochain</p>
                <p className="text-xs font-bold text-muted-foreground">{nextLevel.name}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <p className="text-xs font-bold text-amber-400">Niveau max 👑</p>
            </div>
          )}
        </div>

        {/* All levels toggle */}
        <button
          onClick={() => setShowAllLevels(v => !v)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors py-1"
        >
          <span>{showAllLevels ? 'Masquer' : 'Voir tous les niveaux'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showAllLevels ? 'rotate-180' : ''}`} />
        </button>

        {showAllLevels && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {LEVELS.map(l => (
              <div key={l.level} className={`flex-shrink-0 w-14 rounded-xl p-1.5 text-center border ${l.level <= level.level ? 'bg-primary/10 border-primary/20' : 'bg-muted/20 border-border/20'}`}>
                <span className={`text-lg ${l.level > level.level ? 'opacity-30' : ''}`}>{l.emoji}</span>
                <p className="text-[8px] font-semibold text-foreground mt-0.5 leading-tight">{l.name}</p>
                <p className="text-[8px] text-muted-foreground">{l.minXp >= 1000 ? `${l.minXp / 1000}k` : l.minXp} XP</p>
              </div>
            ))}
          </div>
        )}
      </FinanceCard>

      {/* ── B. Score de santé financière ────────────────────── */}
      <FinanceCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Santé financière</h3>
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${healthMeta.bg} ${healthMeta.color}`}>
            {healthMeta.label}
          </div>
        </div>

        {/* Score central */}
        <div className="flex items-end gap-3 mb-3">
          <p className={`text-5xl font-black leading-none ${scoreColor}`}>{healthScore.total}</p>
          <div className="pb-1">
            <p className="text-sm text-muted-foreground">/100</p>
            <p className="text-[10px] text-muted-foreground/60">score global</p>
          </div>
          <div className="flex-1 pl-2 pb-1">
            <div className="w-full bg-muted/40 rounded-full h-3 overflow-hidden">
              <div className={`h-3 rounded-full transition-all ${scoreTrack}`} style={{ width: `${healthScore.total}%` }} />
            </div>
          </div>
        </div>

        {/* Phrase de lecture */}
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4 ${healthMeta.bg}`}>
          <div className="flex-1">
            <p className={`text-xs font-semibold ${healthMeta.color}`}>
              {healthScore.total >= 65
                ? 'Ta situation financière est solide.'
                : healthScore.total >= 45
                ? 'Ta situation est correcte mais peut s\'améliorer.'
                : 'Ta situation nécessite des ajustements importants.'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Priorité : <span className="font-semibold text-foreground">{WEAKEST_PRIORITY[healthScore.weakestCriterion]}</span>
            </p>
          </div>
        </div>

        {/* Critères */}
        <div className="space-y-2.5">
          {criteria.map(c => {
            const meta = CRITERION_LABELS[c.key]
            const pct = Math.round((c.value / c.max) * 100)
            const isWeak = c.key === healthScore.weakestCriterion
            return (
              <div key={c.key}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{meta.emoji}</span>
                    <span className={`text-xs ${isWeak ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{meta.label}</span>
                    {isWeak && <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded-md">à améliorer</span>}
                  </div>
                  <span className={`text-xs font-semibold ${c.value >= c.max * 0.75 ? 'text-emerald-400' : c.value >= c.max * 0.4 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {c.value}/{c.max}
                  </span>
                </div>
                <div className="w-full bg-muted/40 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${c.value >= c.max * 0.75 ? 'bg-emerald-500' : c.value >= c.max * 0.4 ? 'bg-amber-400' : 'bg-rose-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </FinanceCard>

      {/* ── C. Profil investisseur ──────────────────────────── */}
      <FinanceCard>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Profil investisseur</h3>
        </div>

        {profileData ? (
          <>
            {/* Profile header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{profileData.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-extrabold text-foreground">{profileData.label}</p>
                <span className={`text-xs font-semibold ${profileData.riskColor}`}>{profileData.riskLevel}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{profileData.desc}</p>

            {/* Allocation suggérée */}
            <div className="bg-muted/20 rounded-xl p-3 mb-3 border border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Allocation suggérée</p>
              <p className="text-xs text-foreground font-medium">{profileData.allocation}</p>
            </div>

            {/* Impact sur les conseils */}
            <div className="bg-primary/5 rounded-xl p-3 mb-4 border border-primary/10">
              <p className="text-[10px] text-primary uppercase tracking-wider font-semibold mb-1">Comment l'app s'adapte</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{profileData.impact}</p>
            </div>

            <p className="text-[11px] text-muted-foreground/60 italic mb-3">💡 {profileData.advice}</p>

            <button
              onClick={() => navigate('/questionnaire')}
              className="w-full py-2.5 rounded-xl text-xs bg-muted/40 text-muted-foreground font-medium border border-border/30"
            >
              Refaire le questionnaire
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Tu n'as pas encore défini ton profil investisseur.</p>
            <button
              onClick={() => navigate('/questionnaire')}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-primary/10 text-primary border border-primary/20"
            >
              Découvrir mon profil →
            </button>
          </div>
        )}
      </FinanceCard>

      {/* ── D. Cadre stratégique ──────────────────────────────── */}
      <FinanceCard>
        <button onClick={() => setShowCadre(v => !v)} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Cadre stratégique</p>
              <p className="text-[10px] text-muted-foreground">Comment l'app personnalise ta stratégie</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${showCadre ? 'rotate-180' : ''}`} />
        </button>

        {showCadre && onUpdateRegulation && (
          <div className="mt-4 space-y-4 border-t border-border/30 pt-4">

            {/* Situation de vie */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Situation de vie</label>
              <div className="flex gap-2">
                {(['solo', 'couple', 'famille'] as LifeSituation[]).map(s => (
                  <button key={s} onClick={() => onUpdateRegulation({ lifeSituation: s })}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${reg.lifeSituation === s ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted/30 text-muted-foreground border border-transparent'}`}>
                    {s === 'solo' ? '👤 Solo' : s === 'couple' ? '👥 Couple' : '👨‍👩‍👧 Famille'}
                  </button>
                ))}
              </div>
            </div>

            {reg.lifeSituation === 'famille' && (
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Nombre d'enfants</label>
                <input type="number" min="0" max="10"
                  className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                  value={reg.childrenCount}
                  onChange={e => onUpdateRegulation({ childrenCount: Number(e.target.value) || 0 })} />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Charges familiales mensuelles</label>
              <input type="number"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                value={reg.monthlyFamilyCharges}
                onChange={e => onUpdateRegulation({ monthlyFamilyCharges: Number(e.target.value) || 0 })}
                placeholder="0 €" />
              <p className="text-[10px] text-muted-foreground mt-1">Influence le reste à vivre estimé par l'app</p>
            </div>

            {/* Stabilité des revenus */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Stabilité des revenus</label>
              <div className="flex gap-2">
                {(['stable', 'variable', 'fragile'] as RevenueStability[]).map(s => (
                  <button key={s} onClick={() => onUpdateRegulation({ revenueStability: s })}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${reg.revenueStability === s ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted/30 text-muted-foreground border border-transparent'}`}>
                    {s === 'stable' ? '📊 Stable' : s === 'variable' ? '📈 Variable' : '⚡ Fragile'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {reg.revenueStability === 'fragile'
                  ? 'Mode protection activé : l\'app privilégie la sécurisation face aux revenus fragiles.'
                  : reg.revenueStability === 'variable'
                  ? 'L\'app ajuste les conseils selon la variabilité de tes revenus.'
                  : 'Revenus stables : les conseils peuvent viser davantage la croissance.'}
              </p>
            </div>

            {/* Niveau de sécurité */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-foreground">Niveau de sécurité souhaité</label>
                <span className="text-xs font-bold text-primary">{reg.desiredSecurityLevel}/5</span>
              </div>
              <input type="range" min="1" max="5"
                className="w-full accent-primary"
                value={reg.desiredSecurityLevel}
                onChange={e => onUpdateRegulation({ desiredSecurityLevel: Number(e.target.value) })} />
              <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5">
                <span>Croissance</span><span>Équilibre</span><span>Sécurité max</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {reg.desiredSecurityLevel >= 4 ? 'Priorité haute sur la sécurisation du patrimoine.' : reg.desiredSecurityLevel <= 2 ? 'L\'app oriente les conseils vers la croissance.' : 'Équilibre entre sécurité et performance.'}
              </p>
            </div>

            {/* Tolérance au stress */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-foreground">Tolérance au stress financier</label>
                <span className="text-xs font-bold text-primary">{reg.financialStressTolerance}/5</span>
              </div>
              <input type="range" min="1" max="5"
                className="w-full accent-primary"
                value={reg.financialStressTolerance}
                onChange={e => onUpdateRegulation({ financialStressTolerance: Number(e.target.value) })} />
              <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5">
                <span>Faible</span><span>Modérée</span><span>Élevée</span>
              </div>
            </div>

            {/* Résumé de personnalisation */}
            <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
              <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-2">Personnalisation active</p>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  Situation : <span className="text-foreground font-medium">
                    {reg.lifeSituation === 'solo' ? 'Solo' : reg.lifeSituation === 'couple' ? 'En couple' : 'Famille'}
                    {reg.lifeSituation === 'famille' && reg.childrenCount > 0 ? ` · ${reg.childrenCount} enfant${reg.childrenCount > 1 ? 's' : ''}` : ''}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Revenus : <span className="text-foreground font-medium">
                    {reg.revenueStability === 'stable' ? 'Stables' : reg.revenueStability === 'variable' ? 'Variables' : 'Fragiles'}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Profil de risque : <span className="text-foreground font-medium">
                    {profileData ? profileData.label : 'Non défini'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </FinanceCard>

      {/* ── E. Trajectoire ────────────────────────────────────── */}
      <FinanceCard onClick={() => navigate('/trajectoire')} className="cursor-pointer hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ma trajectoire</p>
              <p className="text-xs text-muted-foreground">Projection patrimoniale long terme</p>
              {store.settings.investorProfile && (
                <p className="text-[10px] text-primary mt-0.5">
                  Rendement estimé : {store.settings.investorProfile === 'prudent' ? '3%' : store.settings.investorProfile === 'equilibre' ? '5%' : store.settings.investorProfile === 'dynamique' ? '7%' : '8%'} / an
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-primary" />
        </div>
      </FinanceCard>

    </div>
  )
}
