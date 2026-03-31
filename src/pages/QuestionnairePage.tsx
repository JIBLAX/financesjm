import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import type { InvestorQuestionnaire, InvestorProfile, AppSettings } from '@/types/finance'

interface Props {
  questionnaire: InvestorQuestionnaire
  onUpdate: (patch: Partial<AppSettings>) => void
}

const steps = [
  {
    key: 'riskTolerance' as const,
    title: 'Tolérance au risque',
    emoji: '🎯',
    options: [
      { value: 'low', label: 'Faible', desc: 'Je veux sécuriser mon capital' },
      { value: 'moderate', label: 'Modérée', desc: 'J\'accepte des fluctuations pour de meilleurs rendements' },
      { value: 'high', label: 'Élevée', desc: 'Je vise la performance maximale' },
    ],
  },
  {
    key: 'horizon' as const,
    title: 'Horizon d\'investissement',
    emoji: '⏳',
    options: [
      { value: 'short', label: 'Court terme', desc: 'Moins de 3 ans' },
      { value: 'medium', label: 'Moyen terme', desc: '3 à 10 ans' },
      { value: 'long', label: 'Long terme', desc: 'Plus de 10 ans' },
    ],
  },
  {
    key: 'realEstate' as const,
    title: 'Immobilier',
    emoji: '🏠',
    options: [
      { value: 'later', label: 'Oui, plus tard', desc: 'Ça m\'intéresse mais pas maintenant' },
      { value: 'soon', label: 'Oui, rapidement', desc: 'C\'est une priorité' },
      { value: 'no', label: 'Non', desc: 'Pas intéressé par l\'immobilier' },
    ],
  },
  {
    key: 'crypto' as const,
    title: 'Crypto',
    emoji: '🪙',
    options: [
      { value: 'none', label: 'Aucune', desc: 'Pas de crypto dans mon patrimoine' },
      { value: 'small', label: 'Petite partie', desc: 'Moins de 5% du patrimoine' },
      { value: 'already', label: 'Déjà investi', desc: 'Je maintiens mes positions' },
    ],
  },
  {
    key: 'income' as const,
    title: 'Tes revenus',
    emoji: '💰',
    options: [
      { value: 'stable', label: 'Stables', desc: 'Prévisibles chaque mois' },
      { value: 'variable', label: 'Variables', desc: 'Selon les mois' },
      { value: 'growing', label: 'En croissance', desc: 'En augmentation active' },
    ],
  },
  {
    key: 'priority' as const,
    title: 'Objectif prioritaire',
    emoji: '🎯',
    options: [
      { value: 'passive_income', label: 'Revenus passifs', desc: 'Générer des revenus mensuels' },
      { value: 'max_patrimony', label: 'Patrimoine maximum', desc: 'Accumuler le plus possible' },
      { value: 'security', label: 'Sécurité', desc: 'Tranquillité et stabilité' },
    ],
  },
]

function computeProfile(q: InvestorQuestionnaire): InvestorProfile {
  let score = 0
  if (q.riskTolerance === 'high') score += 3
  else if (q.riskTolerance === 'moderate') score += 2
  else score += 1
  if (q.horizon === 'long') score += 3
  else if (q.horizon === 'medium') score += 2
  else score += 1
  if (q.income === 'growing') score += 2
  else if (q.income === 'variable') score += 1
  if (q.priority === 'max_patrimony') score += 2
  else if (q.priority === 'passive_income') score += 1

  if (score >= 9) return 'entrepreneur'
  if (score >= 7) return 'dynamique'
  if (score >= 5) return 'equilibre'
  return 'prudent'
}

export const QuestionnairePage: React.FC<Props> = ({ questionnaire, onUpdate }) => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<InvestorQuestionnaire>({ ...questionnaire })

  const current = steps[step]
  const currentValue = answers[current.key]

  const handleSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, [current.key]: value }))
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      const completed = { ...answers, completed: true }
      const profile = computeProfile(completed)
      onUpdate({ investorQuestionnaire: completed, investorProfile: profile })
      navigate('/profil')
    }
  }

  return (
    <div className="page-container pt-6 pb-24 gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="w-full bg-muted/50 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{step + 1}/{steps.length}</span>
      </div>

      <div className="text-center">
        <span className="text-4xl">{current.emoji}</span>
        <h1 className="text-xl font-bold text-foreground mt-3">{current.title}</h1>
      </div>

      <div className="space-y-3">
        {current.options.map(opt => (
          <FinanceCard key={opt.value} onClick={() => handleSelect(opt.value)}
            className={currentValue === opt.value ? 'border-primary/50 bg-primary/5' : ''}>
            <p className="text-sm font-semibold text-foreground">{opt.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
          </FinanceCard>
        ))}
      </div>

      <button onClick={handleNext} disabled={!currentValue}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-2">
        {step < steps.length - 1 ? 'Suivant' : 'Voir mon profil'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
