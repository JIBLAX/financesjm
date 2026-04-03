import React, { useState, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency } from '@/lib/constants'
import type { AllocationRules, Account } from '@/types/finance'

interface Props {
  rules: AllocationRules
  accounts: Account[]
}

const GROUP_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500']

export const AllocationPage: React.FC<Props> = ({ rules, accounts }) => {
  const navigate = useNavigate()
  const [bankIncome, setBankIncome] = useState('')
  const [cashIncome, setCashIncome] = useState('')

  const bankGroups = rules.groups.filter(g => g.incomeType === 'bancaire')
  const cashGroups = rules.groups.filter(g => g.incomeType === 'cash')

  const bankTotal = Number(bankIncome) || 0
  const cashTotal = Number(cashIncome) || 0

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Répartition</h1>
      </div>

      <FinanceCard className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Revenus bancaires du mois</label>
          <input type="number" className="w-full mt-1 bg-muted/50 rounded-xl px-4 py-3 text-lg font-bold text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="0" value={bankIncome} onChange={e => setBankIncome(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Revenus en liquide</label>
          <input type="number" className="w-full mt-1 bg-muted/50 rounded-xl px-4 py-3 text-lg font-bold text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="0" value={cashIncome} onChange={e => setCashIncome(e.target.value)} />
        </div>
      </FinanceCard>

      {bankTotal > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Répartition bancaire</h2>
          {bankGroups.map((group, gi) => (
            <div key={group.id} className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold">{group.label}</p>
              {group.slots.map((slot, si) => {
                const amount = bankTotal * (slot.percent / 100)
                const acc = accounts.find(a => a.id === slot.accountId)
                return (
                  <FinanceCard key={si}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{acc?.name || slot.label}</p>
                        <p className="text-xs text-muted-foreground">{slot.percent}% du bancaire</p>
                      </div>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(amount)}</p>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-2">
                      <div className={`h-2 rounded-full ${GROUP_COLORS[(gi + si) % GROUP_COLORS.length]}`}
                        style={{ width: `${Math.min(100, slot.percent)}%` }} />
                    </div>
                  </FinanceCard>
                )
              })}
            </div>
          ))}
        </>
      )}

      {cashTotal > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-2">Répartition liquide</h2>
          {cashGroups.map(group => (
            <div key={group.id} className="space-y-2">
              {group.slots.map((slot, si) => {
                const amount = cashTotal * (slot.percent / 100)
                const acc = accounts.find(a => a.id === slot.accountId)
                return (
                  <FinanceCard key={si}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{acc?.name || slot.label}</p>
                        <p className="text-xs text-muted-foreground">{slot.percent}%</p>
                      </div>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(amount)}</p>
                    </div>
                  </FinanceCard>
                )
              })}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
