import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Banknote, PiggyBank, Briefcase } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency } from '@/lib/constants'
import type { FinanceStore, Account } from '@/types/finance'

interface Props {
  store: FinanceStore
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pro: { label: 'Professionnel', icon: <Briefcase className="w-4 h-4" />, color: 'text-blue-400' },
  courant: { label: 'Courant', icon: <Building2 className="w-4 h-4" />, color: 'text-emerald-400' },
  livret: { label: 'Épargne', icon: <PiggyBank className="w-4 h-4" />, color: 'text-amber-400' },
  liquide: { label: 'Espèces', icon: <Banknote className="w-4 h-4" />, color: 'text-violet-400' },
}

export const AccountsPage: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate()
  const total = store.accounts.filter(a => a.isActive).reduce((s, a) => s + a.currentBalance, 0)

  const grouped = store.accounts.filter(a => a.isActive).reduce<Record<string, Account[]>>((acc, a) => {
    const key = a.type
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total comptes</p>
        <h1 className="text-3xl font-bold text-foreground">{formatCurrency(total)}</h1>
      </div>

      {Object.entries(grouped).map(([type, accounts]) => {
        const cfg = typeConfig[type] || { label: type, icon: null, color: 'text-foreground' }
        const groupTotal = accounts.reduce((s, a) => s + a.currentBalance, 0)
        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={cfg.color}>{cfg.icon}</span>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cfg.label}</h2>
              </div>
              <span className="text-sm font-medium text-foreground">{formatCurrency(groupTotal)}</span>
            </div>
            <div className="space-y-2">
              {accounts.map(a => (
                <FinanceCard key={a.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.institution}{a.subtype ? ` · ${a.subtype}` : ''}</p>
                    </div>
                    <p className={`text-lg font-bold ${a.currentBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {formatCurrency(a.currentBalance)}
                    </p>
                  </div>
                </FinanceCard>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
