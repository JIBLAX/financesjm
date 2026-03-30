import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/constants'
import type { FinanceStore } from '@/types/finance'
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  store: FinanceStore
}

export const MonthPage: React.FC<Props> = ({ store }) => {
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())

  const navigateMonth = (dir: number) => {
    const [y, m] = monthKey.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    setMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const stats = useMemo(() => {
    const txs = store.transactions.filter(t => t.monthKey === monthKey)
    const incomeBank = txs.filter(t => t.direction === 'income' && t.sourceType === 'bank').reduce((s, t) => s + t.amount, 0)
    const incomeCash = txs.filter(t => t.direction === 'income' && t.sourceType === 'cash').reduce((s, t) => s + t.amount, 0)
    const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
    const totalIncome = incomeBank + incomeCash
    const balance = totalIncome - expenses

    // Allocation calculation
    const rules = store.settings.allocationRules
    const proAmount = incomeBank * (rules.proPercent / 100)
    const personalBase = incomeBank * (rules.personalBasePercent / 100)
    const bourso = personalBase * (rules.boursoPercent / 100)
    const livretA = personalBase * (rules.livretAPercent / 100)
    const lep = personalBase * (rules.lepPercent / 100)
    const cashLib = incomeCash * (rules.cashLibertePercent / 100)
    const cashSec = incomeCash * (rules.cashSecurityPercent / 100)
    const cashVoy = incomeCash * (rules.cashVoyagePercent / 100)

    return { incomeBank, incomeCash, totalIncome, expenses, balance, proAmount, personalBase, bourso, livretA, lep, cashLib, cashSec, cashVoy, txs }
  }, [store, monthKey])

  // Top 5 expense categories
  const topCats = useMemo(() => {
    const catMap = new Map<string, number>()
    stats.txs.filter(t => t.direction === 'expense').forEach(t => {
      const cat = store.categories.find(c => c.id === t.categoryId)
      const name = cat?.name || 'Divers'
      catMap.set(name, (catMap.get(name) || 0) + t.amount)
    })
    return Array.from(catMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [stats.txs, store.categories])

  const barColors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(0 60% 50%)', 'hsl(200 60% 50%)', 'hsl(45 70% 50%)']

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigateMonth(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground capitalize">{getMonthLabel(monthKey)}</h1>
        <button onClick={() => navigateMonth(1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Income / Expenses / Balance */}
      <div className="grid grid-cols-3 gap-3">
        <FinanceCard>
          <p className="text-[10px] text-muted-foreground uppercase">Revenus</p>
          <p className="text-base font-bold text-emerald-500">{formatCurrency(stats.totalIncome)}</p>
        </FinanceCard>
        <FinanceCard>
          <p className="text-[10px] text-muted-foreground uppercase">Dépenses</p>
          <p className="text-base font-bold text-destructive">{formatCurrency(stats.expenses)}</p>
        </FinanceCard>
        <FinanceCard>
          <p className="text-[10px] text-muted-foreground uppercase">Solde</p>
          <p className={`text-base font-bold ${stats.balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{formatCurrency(stats.balance)}</p>
        </FinanceCard>
      </div>

      {/* Revenue breakdown */}
      <FinanceCard>
        <h3 className="text-sm font-semibold text-foreground mb-3">Détail revenus</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Bancaire</span>
          <span className="font-medium text-foreground">{formatCurrency(stats.incomeBank)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-muted-foreground">Liquide</span>
          <span className="font-medium text-foreground">{formatCurrency(stats.incomeCash)}</span>
        </div>
      </FinanceCard>

      {/* Top categories */}
      {topCats.length > 0 && (
        <FinanceCard>
          <h3 className="text-sm font-semibold text-foreground mb-3">Top dépenses</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={topCats} layout="vertical" margin={{ left: 0, right: 0 }}>
              <XAxis type="number" hide />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={16}>
                {topCats.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {topCats.map((c, i) => (
              <div key={c.name} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{c.name}</span>
                <span className="font-medium text-foreground">{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        </FinanceCard>
      )}

      {/* Allocation preview */}
      <FinanceCard>
        <h3 className="text-sm font-semibold text-foreground mb-3">Répartition automatique</h3>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Activité pro (Qonto)', amount: stats.proAmount },
            { label: 'Vie courante (BoursoBank)', amount: stats.bourso },
            { label: 'Tampon bancaire (Livret A)', amount: stats.livretA },
            { label: 'Fonds d\'urgence (LEP)', amount: stats.lep },
          ].map(r => (
            <div key={r.label} className="flex justify-between">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium text-foreground">{formatCurrency(r.amount)}</span>
            </div>
          ))}
          {stats.incomeCash > 0 && (
            <>
              <div className="border-t border-border/50 pt-2 mt-2" />
              {[
                { label: 'Cash liberté', amount: stats.cashLib },
                { label: 'Fonds sécurité liquide', amount: stats.cashSec },
                { label: 'Voyage', amount: stats.cashVoy },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium text-foreground">{formatCurrency(r.amount)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </FinanceCard>
    </div>
  )
}
