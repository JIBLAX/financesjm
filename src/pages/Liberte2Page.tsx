import React, { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getRendementForProfile } from '@/lib/constants'
import type { FinanceStore } from '@/types/finance'

interface Props {
  store: FinanceStore
}

export const Liberte2Page: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate()
  const target = 100000

  const stats = useMemo(() => {
    const totalAccounts = store.accounts.filter(a => a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.filter(a => a.type !== 'dette').reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    const netWorth = totalAccounts + totalAssets - totalDebts
    const pct = Math.min(100, (netWorth / target) * 100)
    const rendement = getRendementForProfile(store.settings.investorProfile)
    const monthlyGrowth = store.monthlySnapshots.length >= 2
      ? (store.monthlySnapshots[store.monthlySnapshots.length - 1].netWorth - store.monthlySnapshots[store.monthlySnapshots.length - 2].netWorth)
      : 200
    const yearsToTarget = monthlyGrowth > 0 ? Math.ceil((target - netWorth) / (monthlyGrowth * 12)) : 99
    return { netWorth, pct, rendement, yearsToTarget }
  }, [store])

  const q = store.settings.investorQuestionnaire

  const blocks = useMemo(() => {
    const b = [
      { id: 'bourse', emoji: '📈', title: 'Bourse — ETF & PEA', desc: 'DCA mensuel, ETF World, objectifs intermédiaires', effort: '200-500 €/mois', rendement: '7% annualisé', risk: 'Modéré', active: true },
      { id: 'assurance', emoji: '💡', title: 'Assurance vie', desc: 'Avantages fiscaux, fonds euros + UC, objectif 10K', effort: '100-300 €/mois', rendement: '3-5%', risk: 'Faible', active: true },
    ]
    if (q.realEstate === 'soon' || q.realEstate === 'later') {
      b.push(q.realEstate === 'soon'
        ? { id: 'immo', emoji: '🏠', title: 'Immobilier locatif', desc: 'Apport, simulation crédit, cashflow locatif', effort: 'Apport 10% + mensualité', rendement: '5-8%', risk: 'Modéré-élevé', active: true }
        : { id: 'scpi', emoji: '🏠', title: 'SCPI — Immobilier papier', desc: 'Ticket faible, rendement 4-5%, sans gestion', effort: '500-2000 €', rendement: '4-5%', risk: 'Modéré', active: true }
      )
    }
    if (q.income === 'variable' || q.income === 'growing') {
      b.push({ id: 'scaling', emoji: '💼', title: 'Scaling revenus pro', desc: 'Augmenter CA, diversifier offres', effort: 'Temps', rendement: 'Variable', risk: 'Variable', active: true })
    }
    if (q.crypto !== 'none') {
      b.push({ id: 'crypto', emoji: '🪙', title: 'Crypto consolidation', desc: 'Plafond 5% patrimoine, sortie progressive', effort: 'Variable', rendement: 'Variable', risk: 'Élevé', active: true })
    }
    return b
  }, [q])

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-white">Solidité financière</h1>
      </div>

      <FinanceCard className="text-center border-primary/30">
        <p className="text-xs text-primary uppercase tracking-wider font-semibold">Objectif solidité</p>
        <p className="text-3xl font-bold text-foreground">{formatCurrency(target)}</p>
        <p className="text-sm text-muted-foreground mt-1">Patrimoine actuel : {formatCurrency(stats.netWorth)}</p>
        <div className="mt-3 w-full bg-muted/50 rounded-full h-3">
          <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${stats.pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">À ce rythme : ~{stats.yearsToTarget} ans</p>
        <p className="text-[10px] text-muted-foreground italic mt-1">Projection estimée basée sur tes données actuelles</p>
      </FinanceCard>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parcours personnalisé</h2>
      {blocks.filter(b => b.active).map(block => (
        <FinanceCard key={block.id}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{block.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{block.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{block.desc}</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div><p className="text-[10px] text-muted-foreground">Effort</p><p className="text-xs font-medium text-foreground">{block.effort}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Rendement</p><p className="text-xs font-medium text-foreground">{block.rendement}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Risque</p><p className="text-xs font-medium text-foreground">{block.risk}</p></div>
              </div>
            </div>
          </div>
        </FinanceCard>
      ))}

      <p className="text-[10px] text-muted-foreground text-center italic">
        Les recommandations ne sont pas prescriptives. Projection estimée basée sur tes données actuelles.
      </p>
    </div>
  )
}
