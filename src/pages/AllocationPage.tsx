import React, { useState, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency } from '@/lib/constants'
import type { AllocationRules } from '@/types/finance'

interface Props {
  rules: AllocationRules
}

export const AllocationPage: React.FC<Props> = ({ rules }) => {
  const navigate = useNavigate()
  const [bankIncome, setBankIncome] = useState('')
  const [cashIncome, setCashIncome] = useState('')

  const allocation = useMemo(() => {
    const bank = Number(bankIncome) || 0
    const cash = Number(cashIncome) || 0
    const pro = bank * (rules.proPercent / 100)
    const personalBase = bank * (rules.personalBasePercent / 100)
    const bourso = personalBase * (rules.boursoPercent / 100)
    const livretA = personalBase * (rules.livretAPercent / 100)
    const lep = personalBase * (rules.lepPercent / 100)
    const cashLib = cash * (rules.cashLibertePercent / 100)
    const cashSec = cash * (rules.cashSecurityPercent / 100)
    const cashVoy = cash * (rules.cashVoyagePercent / 100)
    return { pro, personalBase, bourso, livretA, lep, cashLib, cashSec, cashVoy, total: bank + cash }
  }, [bankIncome, cashIncome, rules])

  const items = [
    { label: 'Activité pro (Qonto)', amount: allocation.pro, pct: rules.proPercent, note: `${rules.proPercent}% du bancaire`, color: 'bg-blue-500' },
    { label: 'Vie courante (BoursoBank)', amount: allocation.bourso, pct: rules.boursoPercent * (rules.personalBasePercent / 100), note: `${rules.boursoPercent}% de ${rules.personalBasePercent}%`, color: 'bg-emerald-500' },
    { label: 'Tampon bancaire (Livret A)', amount: allocation.livretA, pct: rules.livretAPercent * (rules.personalBasePercent / 100), note: `${rules.livretAPercent}% de ${rules.personalBasePercent}%`, color: 'bg-amber-500' },
    { label: 'Fonds d\'urgence (LEP)', amount: allocation.lep, pct: rules.lepPercent * (rules.personalBasePercent / 100), note: `${rules.lepPercent}% de ${rules.personalBasePercent}%`, color: 'bg-orange-500' },
  ]

  const cashItems = [
    { label: 'Cash liberté', amount: allocation.cashLib, pct: rules.cashLibertePercent, color: 'bg-violet-500' },
    { label: 'Fonds sécurité liquide', amount: allocation.cashSec, pct: rules.cashSecurityPercent, color: 'bg-pink-500' },
    { label: 'Voyage', amount: allocation.cashVoy, pct: rules.cashVoyagePercent, color: 'bg-cyan-500' },
  ]

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Répartition</h1>
      </div>

      <FinanceCard className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Revenus bancaires du mois</label>
          <input
            type="number"
            className="w-full mt-1 bg-muted/50 rounded-xl px-4 py-3 text-lg font-bold text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="0"
            value={bankIncome}
            onChange={e => setBankIncome(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Revenus en liquide</label>
          <input
            type="number"
            className="w-full mt-1 bg-muted/50 rounded-xl px-4 py-3 text-lg font-bold text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="0"
            value={cashIncome}
            onChange={e => setCashIncome(e.target.value)}
          />
        </div>
      </FinanceCard>

      {allocation.total > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Répartition bancaire</h2>
          {items.map(item => (
            <FinanceCard key={item.label}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.note}</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(item.amount)}</p>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2">
                <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${Math.min(100, (item.amount / (Number(bankIncome) || 1)) * 100)}%` }} />
              </div>
            </FinanceCard>
          ))}

          {Number(cashIncome) > 0 && (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-2">Répartition liquide</h2>
              {cashItems.map(item => (
                <FinanceCard key={item.label}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.pct}%</p>
                    </div>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(item.amount)}</p>
                  </div>
                </FinanceCard>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
