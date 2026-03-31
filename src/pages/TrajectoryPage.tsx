import React, { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getRendementForProfile, getCurrentMonthKey } from '@/lib/constants'
import type { FinanceStore } from '@/types/finance'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Slider } from '@/components/ui/slider'

interface Props {
  store: FinanceStore
}

export const TrajectoryPage: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate()
  const [years, setYears] = useState(10)
  const rendement = getRendementForProfile(store.settings.investorProfile)

  const stats = useMemo(() => {
    const totalAccounts = store.accounts.filter(a => a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    const netWorth = totalAccounts + totalAssets - totalDebts
    const monthKey = getCurrentMonthKey()
    const txs = store.transactions.filter(t => t.monthKey === monthKey)
    const income = txs.filter(t => t.direction === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
    const savingsRate = income > 0 ? (income - expenses) / income : 0.1
    const monthlySavings = income > 0 ? income * savingsRate : 200
    return { netWorth, income, expenses, savingsRate, monthlySavings }
  }, [store])

  const chartData = useMemo(() => {
    const data = []
    const monthlyRate = rendement / 100 / 12
    const optimizedRate = (rendement + 2) / 100 / 12
    let current = stats.netWorth
    let optimized = stats.netWorth
    const libertyRate = store.settings.activeScenario ? (rendement + 3) / 100 / 12 : 0

    for (let y = 0; y <= 60; y++) {
      const entry: Record<string, number> = { year: y, actuel: Math.round(current), optimise: Math.round(optimized) }
      if (store.settings.activeScenario) {
        entry.liberte3 = Math.round(optimized * 1.1)
      }
      data.push(entry)
      for (let m = 0; m < 12; m++) {
        current = current * (1 + monthlyRate) + stats.monthlySavings
        optimized = optimized * (1 + optimizedRate) + stats.monthlySavings * 1.3
      }
    }
    return data
  }, [stats, rendement, store.settings.activeScenario])

  const currentPoint = chartData[years] || chartData[0]
  const diff = currentPoint ? (currentPoint.optimise || 0) - (currentPoint.actuel || 0) : 0

  // Milestones
  const milestones = [
    { year: 2, label: 'Sortie des dettes, tampons pleins' },
    { year: 5, label: 'Patrimoine 10-20K, PEA significatif' },
    { year: 10, label: 'Indépendance financière possible' },
    { year: 20, label: 'Retraite anticipée possible' },
    { year: 40, label: 'Patrimoine mature, transmission' },
  ]

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Ma trajectoire</h1>
      </div>

      {/* Slider */}
      <FinanceCard>
        <div className="flex justify-between mb-2">
          <span className="text-xs text-muted-foreground">Aujourd'hui</span>
          <span className="text-xs text-primary font-bold">Dans {years} ans</span>
          <span className="text-xs text-muted-foreground">60 ans</span>
        </div>
        <Slider value={[years]} onValueChange={v => setYears(v[0])} min={0} max={60} step={1} />
      </FinanceCard>

      {/* Projected values */}
      <div className="grid grid-cols-2 gap-3">
        <FinanceCard>
          <p className="text-[10px] text-muted-foreground uppercase">Patrimoine projeté</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(currentPoint?.actuel || 0)}</p>
          <p className="text-[10px] text-blue-400">Scénario actuel</p>
        </FinanceCard>
        <FinanceCard>
          <p className="text-[10px] text-muted-foreground uppercase">Scénario optimisé</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(currentPoint?.optimise || 0)}</p>
          <p className="text-[10px] text-emerald-400">+{formatCurrency(diff)}</p>
        </FinanceCard>
      </div>

      {/* Chart */}
      <FinanceCard className="p-3">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData.filter((_, i) => i <= 60)}>
            <defs>
              <linearGradient id="gradActuel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210 70% 55%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(210 70% 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOptimise" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(152 60% 45%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(152 60% 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'hsl(215 10% 48%)' }} tickLine={false} axisLine={false} />
            <Area type="monotone" dataKey="actuel" stroke="hsl(210 70% 55%)" strokeWidth={2} fill="url(#gradActuel)" dot={false} name="Actuel" />
            <Area type="monotone" dataKey="optimise" stroke="hsl(152 60% 45%)" strokeWidth={2} fill="url(#gradOptimise)" dot={false} name="Optimisé" />
            {store.settings.activeScenario && (
              <Area type="monotone" dataKey="liberte3" stroke="hsl(280 60% 60%)" strokeWidth={2} fill="none" dot={false} name="Liberté 3.0" strokeDasharray="4 4" />
            )}
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 justify-center mt-2">
          <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{ background: 'hsl(210 70% 55%)' }} /><span className="text-[10px] text-muted-foreground">Actuel</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{ background: 'hsl(152 60% 45%)' }} /><span className="text-[10px] text-muted-foreground">Optimisé</span></div>
          {store.settings.activeScenario && <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{ background: 'hsl(280 60% 60%)' }} /><span className="text-[10px] text-muted-foreground">Liberté 3.0</span></div>}
        </div>
      </FinanceCard>

      {/* Milestones */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Jalons</h2>
        <div className="space-y-2">
          {milestones.map(m => (
            <FinanceCard key={m.year} className={years >= m.year ? 'border-primary/30' : 'opacity-50'}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-primary w-12">+{m.year} ans</span>
                <p className="text-xs text-foreground">{m.label}</p>
              </div>
            </FinanceCard>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center italic">
        Projection estimée basée sur tes données actuelles · Rendement {rendement}%/an ({store.settings.investorProfile || 'équilibré'})
      </p>
    </div>
  )
}
