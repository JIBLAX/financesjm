import React, { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency } from '@/lib/constants'
import type { FinanceStore, Asset, Debt } from '@/types/finance'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface Props {
  store: FinanceStore
  onAddAsset: (a: Asset) => void
  onRemoveAsset: (id: string) => void
  onAddDebt: (d: Debt) => void
  onRemoveDebt: (id: string) => void
}

export const PatrimoinePage: React.FC<Props> = ({ store, onAddAsset, onRemoveAsset, onAddDebt, onRemoveDebt }) => {
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [assetName, setAssetName] = useState('')
  const [assetValue, setAssetValue] = useState('')
  const [assetType, setAssetType] = useState<Asset['type']>('autre')
  const [debtName, setDebtName] = useState('')
  const [debtBalance, setDebtBalance] = useState('')
  const [debtPayment, setDebtPayment] = useState('')

  const stats = useMemo(() => {
    const totalAccounts = store.accounts.filter(a => a.isActive && a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const totalAssets = store.assets.reduce((s, a) => s + a.value, 0)
    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    const brut = totalAccounts + totalAssets
    const net = brut - totalDebts
    return { totalAccounts, totalAssets, totalDebts, brut, net }
  }, [store])

  const pieData = [
    { name: 'Comptes', value: stats.totalAccounts, color: 'hsl(var(--primary))' },
    { name: 'Actifs', value: stats.totalAssets, color: 'hsl(var(--accent))' },
  ].filter(d => d.value > 0)

  const handleAddAsset = () => {
    if (!assetName || !assetValue) return
    onAddAsset({ id: crypto.randomUUID(), name: assetName, type: assetType, value: Number(assetValue), platform: '', notes: '' })
    setAssetName(''); setAssetValue(''); setShowAddAsset(false)
  }

  const handleAddDebt = () => {
    if (!debtName || !debtBalance) return
    onAddDebt({ id: crypto.randomUUID(), name: debtName, lender: '', outstandingBalance: Number(debtBalance), monthlyPayment: Number(debtPayment) || 0, rate: 0, notes: '' })
    setDebtName(''); setDebtBalance(''); setDebtPayment(''); setShowAddDebt(false)
  }

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Patrimoine net</p>
        <h1 className="text-3xl font-bold text-foreground">{formatCurrency(stats.net)}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FinanceCard>
          <p className="text-xs text-muted-foreground">Brut</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.brut)}</p>
        </FinanceCard>
        <FinanceCard>
          <p className="text-xs text-muted-foreground">Dettes</p>
          <p className="text-lg font-bold text-destructive">{formatCurrency(stats.totalDebts)}</p>
        </FinanceCard>
      </div>

      {pieData.length > 0 && (
        <FinanceCard className="flex items-center justify-center py-4">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 ml-4">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
        </FinanceCard>
      )}

      {/* Assets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actifs</h2>
          <button onClick={() => setShowAddAsset(!showAddAsset)} className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {showAddAsset && (
          <FinanceCard className="mb-2 space-y-2">
            <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Nom" value={assetName} onChange={e => setAssetName(e.target.value)} />
            <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Valeur €" type="number" value={assetValue} onChange={e => setAssetValue(e.target.value)} />
            <button onClick={handleAddAsset} className="w-full bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold">Ajouter</button>
          </FinanceCard>
        )}
        <div className="space-y-2">
          {store.assets.map(a => (
            <FinanceCard key={a.id}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-bold text-foreground">{formatCurrency(a.value)}</p>
                  <button onClick={() => onRemoveAsset(a.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </FinanceCard>
          ))}
          {store.assets.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun actif</p>}
        </div>
      </div>

      {/* Debts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dettes</h2>
          <button onClick={() => setShowAddDebt(!showAddDebt)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {showAddDebt && (
          <FinanceCard className="mb-2 space-y-2">
            <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Nom" value={debtName} onChange={e => setDebtName(e.target.value)} />
            <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Solde restant €" type="number" value={debtBalance} onChange={e => setDebtBalance(e.target.value)} />
            <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Mensualité €" type="number" value={debtPayment} onChange={e => setDebtPayment(e.target.value)} />
            <button onClick={handleAddDebt} className="w-full bg-destructive text-destructive-foreground rounded-xl py-2 text-sm font-semibold">Ajouter</button>
          </FinanceCard>
        )}
        <div className="space-y-2">
          {store.debts.map(d => (
            <FinanceCard key={d.id}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.monthlyPayment > 0 ? `${formatCurrency(d.monthlyPayment)}/mois` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-bold text-destructive">{formatCurrency(d.outstandingBalance)}</p>
                  <button onClick={() => onRemoveDebt(d.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </FinanceCard>
          ))}
          {store.debts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune dette</p>}
        </div>
      </div>
    </div>
  )
}
