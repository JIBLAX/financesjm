import React, { useMemo } from 'react'
import { Building2, Banknote, PiggyBank, Briefcase, Star } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency } from '@/lib/constants'
import type { FinanceStore, Account } from '@/types/finance'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'

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
  const total = store.accounts.filter(a => a.isActive).reduce((s, a) => s + a.currentBalance, 0)

  const chartData = useMemo(() =>
    store.accounts
      .filter(a => a.isActive)
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .map(a => ({
        name: a.name.length > 12 ? a.name.slice(0, 12) + '…' : a.name,
        value: a.currentBalance,
      })),
    [store.accounts]
  )

  const proAccounts = store.accounts.filter(a => a.isActive && a.type === 'pro')
  const proTotal = proAccounts.reduce((s, a) => s + a.currentBalance, 0)
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
    <div className="page-container pt-6 page-bottom-pad gap-5">
      {/* Hero */}
      <div className="p-px rounded-3xl bg-gradient-to-br from-sky-500/40 via-primary/20 to-cyan-500/10">
        <div className="rounded-[calc(1.5rem-1px)] bg-card px-5 py-5">
          <div className="mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total comptes</p>
            <h1 className="text-4xl font-extrabold text-gradient-sky leading-none">{formatCurrency(total)}</h1>
          </div>

          {chartData.length > 1 && (
            <ResponsiveContainer width="100%" height={chartData.length * 32 + 8}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }} barSize={18}>
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="name" width={82}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Solde']}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.value >= 0 ? '#0ea5e9' : '#f43f5e'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Professionnel section */}
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

      {/* Main accounts by type */}
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
