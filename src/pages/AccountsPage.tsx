import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Banknote, PiggyBank, Briefcase, Star } from 'lucide-react'
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
  epargne_projet: { label: 'Épargne Projet', icon: <Star className="w-4 h-4" />, color: 'text-cyan-400' },
}

export const AccountsPage: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate()
  const total = store.accounts.filter(a => a.isActive).reduce((s, a) => s + a.currentBalance, 0)
  // Separate pro accounts for the Professionnel section (includes bunq-fiscal)
  const proAccounts = store.accounts.filter(a => a.isActive && a.type === 'pro')
  const proTotal = proAccounts.reduce((s, a) => s + a.currentBalance, 0)
  // Non-pro main accounts (excluding bunq group)
  const mainAccounts = store.accounts.filter(a => a.isActive && a.group !== 'bunq' && a.type !== 'pro')
  const bunqAccounts = store.accounts.filter(a => a.isActive && a.group === 'bunq' && a.type !== 'pro')

  const grouped = mainAccounts.reduce<Record<string, Account[]>>((acc, a) => {
    const key = a.type
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const renderAccount = (a: Account) => (
    <FinanceCard key={a.id}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-semibold text-foreground">{a.name}</p>
          <p className="text-xs text-muted-foreground">{a.institution}{a.subtype ? ` · ${a.subtype}` : ''}</p>
          {a.note && <p className="text-[10px] text-muted-foreground italic mt-0.5">{a.note}</p>}
        </div>
        <p className={`text-lg font-bold ${a.currentBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
          {formatCurrency(a.currentBalance)}
        </p>
      </div>
    </FinanceCard>
  )

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total comptes</p>
        <h1 className="text-3xl font-bold text-foreground">{formatCurrency(total)}</h1>
      </div>

      {/* Professionnel section — includes Qonto + Réserve Fiscale BUNQ + trésorerie totale */}
      {proAccounts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400"><Briefcase className="w-4 h-4" /></span>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Professionnel</h2>
          </div>
          <div className="space-y-2">
            {proAccounts.map(renderAccount)}
          </div>
          {proAccounts.length > 1 && (
            <div className="mt-2 px-4 py-2 bg-muted/20 rounded-xl flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">Trésorerie pro totale</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(proTotal)}</span>
            </div>
          )}
        </div>
      )}

      {/* Main accounts by type (non-pro) */}
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
            <div className="space-y-2">{accounts.map(renderAccount)}</div>
          </div>
        )
      })}

      {/* BUNQ — Non-pro accounts */}
      {bunqAccounts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-cyan-400"><Star className="w-4 h-4" /></span>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">BUNQ — Comptes annexes</h2>
          </div>
          <div className="space-y-2">{bunqAccounts.map(renderAccount)}</div>
        </div>
      )}
    </div>
  )
}
