import React, { useMemo, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getRendementForProfile } from '@/lib/constants'
import type { FinanceStore, LibertyScenario, AppSettings } from '@/types/finance'

interface Props {
  store: FinanceStore
  onUpdate: (patch: Partial<AppSettings>) => void
}

export const Liberte3Page: React.FC<Props> = ({ store, onUpdate }) => {
  const navigate = useNavigate()
  const target = 1000000
  const q = store.settings.investorQuestionnaire

  const stats = useMemo(() => {
    const totalAccounts = store.accounts.filter(a => a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    const netWorth = totalAccounts + totalAssets - totalDebts
    const pct = Math.min(100, (netWorth / target) * 100)
    const rendement = getRendementForProfile(store.settings.investorProfile)
    const monthlyGrowth = store.monthlySnapshots.length >= 2
      ? (store.monthlySnapshots[store.monthlySnapshots.length - 1].netWorth - store.monthlySnapshots[store.monthlySnapshots.length - 2].netWorth)
      : 200
    const yearsToTarget = monthlyGrowth > 0 ? Math.ceil((target - netWorth) / (monthlyGrowth * 12)) : 99
    return { netWorth, pct, yearsToTarget, rendement }
  }, [store])

  const scenarios = useMemo(() => {
    const s = [
      {
        id: 'bourse' as LibertyScenario,
        title: 'Investisseur Bourse',
        emoji: '📈',
        strategy: 'DCA mensuel agressif sur ETF, pas d\'immobilier',
        risk: 'Modéré',
        steps: ['PEA maximal', 'Assurance vie', 'Compte-titres ordinaire'],
        duration: Math.round(stats.yearsToTarget * 0.9),
      },
      {
        id: (q.realEstate === 'no' ? 'bourse' : 'immo_bourse') as LibertyScenario,
        title: q.realEstate === 'no' ? 'SCPI + Bourse' : 'Immobilier + Bourse',
        emoji: '🏠',
        strategy: q.realEstate === 'no'
          ? 'SCPI pour revenus passifs + portefeuille ETF'
          : '1-2 biens locatifs + portefeuille ETF',
        risk: 'Modéré-élevé',
        steps: q.realEstate === 'no'
          ? ['SCPI tickets 500-2000€', 'ETF World DCA', 'Assurance vie UC']
          : ['Apport 10%', 'Premier bien locatif', 'Cashflow reinvesti en bourse'],
        duration: Math.round(stats.yearsToTarget * 0.8),
      },
      {
        id: 'business' as LibertyScenario,
        title: 'Business + Investissement',
        emoji: '💼',
        strategy: 'Scaling du business → revenus passifs → investissement du surplus',
        risk: 'Variable',
        steps: ['CA > 5K/mois', 'Produit passif créé', 'Investissement 40% du CA'],
        duration: Math.round(stats.yearsToTarget * 0.7),
      },
    ]
    return s
  }, [stats, q])

  const activeScenario = store.settings.activeScenario

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Liberté 3.0</h1>
      </div>

      <FinanceCard className="text-center border-amber-300/30">
        <p className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Road to</p>
        <p className="text-3xl font-bold text-foreground">{formatCurrency(target)}</p>
        <p className="text-sm text-muted-foreground mt-1">Patrimoine actuel : {formatCurrency(stats.netWorth)}</p>
        <p className="text-xs text-muted-foreground mt-1">Distance : {formatCurrency(target - stats.netWorth)}</p>
        <div className="mt-3 w-full bg-muted/50 rounded-full h-3">
          <div className="h-3 rounded-full bg-amber-400 transition-all" style={{ width: `${stats.pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">À ce rythme : ~{stats.yearsToTarget} ans</p>
        <p className="text-[10px] text-muted-foreground italic mt-1">Projection estimée basée sur tes données actuelles</p>
      </FinanceCard>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Choisis ton scénario</h2>
      {scenarios.map((s, i) => {
        const isActive = activeScenario === s.id
        return (
          <FinanceCard key={i} className={isActive ? 'border-primary/50' : ''} onClick={() => onUpdate({ activeScenario: s.id })}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">Scénario {String.fromCharCode(65 + i)}</p>
                </div>
              </div>
              {isActive && <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"><Check className="w-4 h-4 text-primary-foreground" /></div>}
            </div>
            <p className="text-xs text-muted-foreground mb-2">{s.strategy}</p>
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div><span className="text-muted-foreground">Risque :</span> <span className="font-medium text-foreground">{s.risk}</span></div>
              <div><span className="text-muted-foreground">Durée :</span> <span className="font-medium text-foreground">~{s.duration} ans</span></div>
            </div>
            <div className="space-y-1">
              {s.steps.map((step, j) => (
                <div key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-primary">{j + 1}.</span> {step}
                </div>
              ))}
            </div>
          </FinanceCard>
        )
      })}

      <p className="text-[10px] text-muted-foreground text-center italic">
        Les scénarios ne sont pas prescriptifs — l'app présente les options. Projection estimée basée sur tes données actuelles.
      </p>
    </div>
  )
}
