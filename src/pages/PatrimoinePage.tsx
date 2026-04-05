import React, { useMemo, useState } from 'react'
import { Plus, ChevronRight, X, Pencil, Check } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, ASSET_TYPE_LABELS, ASSET_TYPE_ICONS, ASSET_CLASS_MAP, ASSET_CLASS_LABELS } from '@/lib/constants'
import type { FinanceStore, Asset, Debt, AssetType } from '@/types/finance'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts'

interface Props {
  store: FinanceStore
  onAddAsset: (a: Asset) => void
  onUpdateAsset: (id: string, patch: Partial<Asset>) => void
  onRemoveAsset: (id: string) => void
  onAddDebt: (d: Debt) => void
  onUpdateDebt: (id: string, patch: Partial<Debt>) => void
  onRemoveDebt: (id: string) => void
}

const ASSET_TYPES: AssetType[] = ['compte_bancaire', 'livret_epargne', 'assurance_vie', 'actions', 'etf', 'crypto', 'paris_sportif', 'immobilier', 'vehicule', 'objet_valeur', 'autre_actif', 'dette']
const DONUT_COLORS = [
  '#10b981', // emerald
  '#f97316', // orange
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
  '#84cc16', // lime
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#a855f7', // purple
  '#f43f5e', // rose
]
const numInput = 'w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none'

type DetailItem = { id: string; itemType: 'account' | 'debt' | 'asset'; name: string; value: number; detail?: string; extra?: string }

function getInitials(name: string): string {
  return name.split(/[\s|]+/).filter(Boolean).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3)
}

export const PatrimoinePage: React.FC<Props> = ({
  store, onAddAsset, onUpdateAsset, onRemoveAsset, onAddDebt, onUpdateDebt, onRemoveDebt,
}) => {
  const [showAdd, setShowAdd] = useState(false)
  const [selectedType, setSelectedType] = useState<AssetType | null>(null)
  const [detailClass, setDetailClass] = useState<string | null>(null)

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingIsDebt, setEditingIsDebt] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [platform, setPlatform] = useState('')
  const [notes, setNotes] = useState('')
  const [ticker, setTicker] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [priceCurrency, setPriceCurrency] = useState('EUR')
  const [propertyType, setPropertyType] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [outstandingMortgage, setOutstandingMortgage] = useState('')
  const [lender, setLender] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [rate, setRate] = useState('')

  const stats = useMemo(() => {
    const accountsTotal = store.accounts.filter(a => a.isActive && a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    const assetsTotal = store.assets.filter(a => a.type !== 'dette').reduce((s, a) => s + a.value, 0)
    const debtAssets = store.assets.filter(a => a.type === 'dette').reduce((s, a) => s + (a.outstandingBalance || a.value), 0)
    const debtsTotal = store.debts.reduce((s, d) => s + d.outstandingBalance, 0) + debtAssets
    const brut = accountsTotal + assetsTotal
    const net = brut - debtsTotal
    const lastUpdate = store.assets.length > 0
      ? store.assets.reduce((latest, a) => a.updatedAt > latest ? a.updatedAt : latest, '')
      : null
    return { accountsTotal, assetsTotal, debtsTotal, brut, net, lastUpdate }
  }, [store])

  const classBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    // Sépare trésorerie pro (type='pro') et perso (le reste)
    store.accounts.filter(a => a.isActive && a.type !== 'dette').forEach(a => {
      const cls = a.type === 'pro' ? 'cash_pro' : 'cash'
      map[cls] = (map[cls] || 0) + a.currentBalance
    })
    store.assets.forEach(a => {
      const cls = ASSET_CLASS_MAP[a.type] || 'autres'
      if (cls === 'dettes') map['dettes'] = (map['dettes'] || 0) + (a.outstandingBalance || a.value)
      else map[cls] = (map[cls] || 0) + a.value
    })
    const debtsFromArray = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    if (debtsFromArray > 0) map['dettes'] = (map['dettes'] || 0) + debtsFromArray
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([cls, val]) => ({
        class: cls, label: ASSET_CLASS_LABELS[cls]?.label || cls, value: val,
        color: ASSET_CLASS_LABELS[cls]?.color || 'hsl(0 0% 55%)',
        pct: stats.brut + stats.debtsTotal > 0 ? Math.round((val / (stats.brut + stats.debtsTotal)) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [store, stats])

  const detailAssets = useMemo((): DetailItem[] => {
    if (!detailClass) return []
    if (detailClass === 'cash') {
      return store.accounts
        .filter(a => a.isActive && a.type !== 'dette' && a.type !== 'pro')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => ({ id: a.id, itemType: 'account' as const, name: a.name, value: a.currentBalance, detail: a.institution }))
    }
    if (detailClass === 'cash_pro') {
      return store.accounts
        .filter(a => a.isActive && a.type === 'pro')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => ({ id: a.id, itemType: 'account' as const, name: a.name, value: a.currentBalance, detail: a.institution }))
    }
    if (detailClass === 'dettes') {
      return [
        ...store.debts.map(d => ({ id: d.id, itemType: 'debt' as const, name: d.name, value: d.outstandingBalance, detail: d.lender || `${formatCurrency(d.monthlyPayment)}/mois` })),
        ...store.assets.filter(a => a.type === 'dette').map(a => ({ id: a.id, itemType: 'asset' as const, name: a.name, value: a.outstandingBalance || a.value, detail: a.lender || '' })),
      ]
    }
    const matchingTypes = Object.entries(ASSET_CLASS_MAP).filter(([, cls]) => cls === detailClass).map(([t]) => t)
    return store.assets.filter(a => matchingTypes.includes(a.type)).map(a => ({
      id: a.id, itemType: 'asset' as const, name: a.name, value: a.value,
      detail: a.ticker || a.symbol || a.platform || a.propertyType || '',
      extra: a.quantity ? `${a.quantity} × ${formatCurrency(a.unitPrice || 0, a.priceCurrency || 'EUR')}` : undefined,
    }))
  }, [detailClass, store])

  // Generate all months from Jan 2026 to current
  const allMonthKeys = useMemo(() => {
    const keys: string[] = []
    const start = new Date(2026, 0)
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth())
    const d = new Date(start)
    while (d <= end) {
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      d.setMonth(d.getMonth() + 1)
    }
    return keys
  }, [])

  const FR_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  // Monthly evolution chart data from check-ins
  const detailChartData = useMemo(() => {
    if (!detailClass || detailAssets.length === 0) return null
    const checkInMap = new Map(store.monthlyCheckIns.map(ci => [ci.monthKey, ci]))
    const data = allMonthKeys.map(key => {
      const ci = checkInMap.get(key)
      const [, m] = key.split('-').map(Number)
      const point: Record<string, any> = { month: FR_MONTHS[m - 1] }
      detailAssets.forEach(item => {
        let val: number | null = null
        if (ci) {
          if (item.itemType === 'account') val = ci.accountBalances?.[item.id] ?? null
          else if (item.itemType === 'debt')  val = ci.debtBalances?.[item.id] ?? null
          else                               val = ci.assetValues?.[item.id] ?? null
        }
        point[item.id] = val
      })
      return point
    })
    return { data, items: detailAssets, monthCount: allMonthKeys.length }
  }, [detailClass, detailAssets, store.monthlyCheckIns, allMonthKeys])

  const computedValue = useMemo(() => {
    if (!selectedType) return 0
    if (['actions', 'etf', 'crypto'].includes(selectedType)) return (Number(quantity) || 0) * (Number(unitPrice) || 0)
    if (selectedType === 'immobilier') return (Number(estimatedValue) || 0) - (Number(outstandingMortgage) || 0)
    return Number(value) || 0
  }, [selectedType, quantity, unitPrice, estimatedValue, outstandingMortgage, value])

  const resetForm = () => {
    setSelectedType(null); setName(''); setValue(''); setCurrency('EUR'); setPlatform('')
    setNotes(''); setTicker(''); setQuantity(''); setUnitPrice(''); setPriceCurrency('EUR')
    setPropertyType(''); setEstimatedValue(''); setOutstandingMortgage(''); setLender('')
    setMonthlyPayment(''); setRate(''); setShowAdd(false)
    setEditingId(null); setEditingIsDebt(false)
  }

  const openEditAsset = (a: Asset) => {
    setEditingId(a.id); setEditingIsDebt(false)
    setSelectedType(a.type); setName(a.name); setPlatform(a.platform || '')
    setNotes(a.notes || ''); setCurrency(a.currency || 'EUR')
    setTicker(a.ticker || a.symbol || ''); setQuantity(a.quantity ? String(a.quantity) : '')
    setUnitPrice(a.unitPrice ? String(a.unitPrice) : ''); setPriceCurrency(a.priceCurrency || 'EUR')
    setPropertyType(a.propertyType || '')
    setEstimatedValue(a.estimatedValue ? String(a.estimatedValue) : '')
    setOutstandingMortgage(a.outstandingMortgage ? String(a.outstandingMortgage) : '')
    setValue(String(a.value)); setShowAdd(true)
    setEditMode(false); setSelectedIds(new Set())
  }

  const openEditDebt = (d: Debt) => {
    setEditingId(d.id); setEditingIsDebt(true)
    setSelectedType('dette'); setName(d.name); setLender(d.lender || '')
    setValue(String(d.outstandingBalance))
    setMonthlyPayment(d.monthlyPayment ? String(d.monthlyPayment) : '')
    setRate(d.rate ? String(d.rate) : ''); setNotes(d.notes || '')
    setShowAdd(true); setEditMode(false); setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleEditSelected = () => {
    const id = [...selectedIds][0]
    const asset = store.assets.find(a => a.id === id)
    const debt = store.debts.find(d => d.id === id)
    if (asset) openEditAsset(asset)
    else if (debt) openEditDebt(debt)
  }

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => {
      if (store.assets.some(a => a.id === id)) onRemoveAsset(id)
      else if (store.debts.some(d => d.id === id)) onRemoveDebt(id)
    })
    setSelectedIds(new Set()); setEditMode(false)
  }

  const handleSubmit = () => {
    if (!selectedType || !name) return
    const now = new Date().toISOString()

    if (editingId) {
      if (editingIsDebt) {
        onUpdateDebt(editingId, {
          name, lender, outstandingBalance: Number(value) || 0,
          monthlyPayment: Number(monthlyPayment) || 0, rate: Number(rate) || 0,
          notes, updatedAt: now,
        })
      } else {
        const rawValue = ['actions', 'etf', 'crypto'].includes(selectedType)
          ? computedValue
          : selectedType === 'immobilier' ? (Number(estimatedValue) || 0) : (Number(value) || 0)
        const patch: Partial<Asset> = { name, platform, notes, currency, updatedAt: now, value: rawValue }
        if (['actions', 'etf'].includes(selectedType)) {
          Object.assign(patch, { ticker, quantity: Number(quantity) || 0, unitPrice: Number(unitPrice) || 0, priceCurrency })
        }
        if (selectedType === 'crypto') {
          Object.assign(patch, { symbol: ticker, quantity: Number(quantity) || 0, unitPrice: Number(unitPrice) || 0, priceCurrency })
        }
        if (selectedType === 'immobilier') {
          Object.assign(patch, { propertyType, estimatedValue: Number(estimatedValue) || 0, outstandingMortgage: Number(outstandingMortgage) || 0 })
        }
        onUpdateAsset(editingId, patch)
      }
      resetForm(); return
    }

    // Add mode
    if (selectedType === 'dette') {
      onAddDebt({ id: crypto.randomUUID(), name, lender, outstandingBalance: Number(value) || 0, monthlyPayment: Number(monthlyPayment) || 0, rate: Number(rate) || 0, notes, updatedAt: now })
    } else {
      const asset: Asset = {
        id: crypto.randomUUID(), name, type: selectedType,
        value: ['actions', 'etf', 'crypto'].includes(selectedType) ? computedValue : selectedType === 'immobilier' ? (Number(estimatedValue) || 0) : (Number(value) || 0),
        platform, notes, currency, updatedAt: now,
      }
      if (['actions', 'etf'].includes(selectedType)) Object.assign(asset, { ticker, quantity: Number(quantity) || 0, unitPrice: Number(unitPrice) || 0, priceCurrency })
      if (selectedType === 'crypto') Object.assign(asset, { symbol: ticker, quantity: Number(quantity) || 0, unitPrice: Number(unitPrice) || 0, priceCurrency })
      if (selectedType === 'immobilier') Object.assign(asset, { propertyType, estimatedValue: Number(estimatedValue) || 0, outstandingMortgage: Number(outstandingMortgage) || 0 })
      onAddAsset(asset)
    }
    resetForm()
  }

  const donutData = classBreakdown.filter(c => c.class !== 'dettes')

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Patrimoine</h1>

      {/* Donut chart */}
      {donutData.length > 0 && (
        <FinanceCard>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Répartition du patrimoine</h3>
          <div className="relative mb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={68} outerRadius={90} dataKey="value" stroke="none" paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Brut</p>
              <p className="text-lg font-bold text-foreground leading-tight">{formatCurrency(stats.brut)}</p>
              {stats.debtsTotal > 0 && <p className="text-[10px] text-rose-400 mt-0.5">−{formatCurrency(stats.debtsTotal)}</p>}
            </div>
          </div>
          {stats.debtsTotal > 0 && stats.brut > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Actifs {Math.round((stats.brut / (stats.brut + stats.debtsTotal)) * 100)}%</span>
                <span>Dettes {Math.round((stats.debtsTotal / (stats.brut + stats.debtsTotal)) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-rose-500/30 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all"
                  style={{ width: `${Math.round((stats.brut / (stats.brut + stats.debtsTotal)) * 100)}%` }} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            {classBreakdown.map(c => (
              <button key={c.class} onClick={() => setDetailClass(c.class)} className="flex items-center justify-between w-full text-left group">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-[11px] text-muted-foreground group-hover:text-foreground truncate">{c.label}</span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <div className="w-20 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                  <span className="text-[11px] font-medium text-foreground w-20 text-right">{formatCurrency(c.value)}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </FinanceCard>
      )}

      {/* Detail modal */}
      {detailClass && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={() => setDetailClass(null)}>
          <div className="bg-card w-full max-w-lg rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">{ASSET_CLASS_LABELS[detailClass]?.label}</h3>
              <button onClick={() => setDetailClass(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {detailAssets.length > 0 ? (
              <>
                {/* Liste des valeurs actuelles — toujours en premier */}
                <div className="space-y-0 mb-3">
                  {detailAssets.map((a, i) => {
                    const color = DONUT_COLORS[i % DONUT_COLORS.length]
                    const totalClass = detailAssets.reduce((s, x) => s + x.value, 0)
                    const pct = totalClass > 0 ? (a.value / totalClass) * 100 : 0
                    return (
                      <div key={a.id} className="flex items-center gap-2.5 py-2.5 border-b border-border/20 last:border-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                          {a.detail && <p className="text-[10px] text-muted-foreground">{a.detail}</p>}
                          {a.extra && <p className="text-[10px] text-primary">{a.extra}</p>}
                        </div>
                        <div className="w-12 h-1.5 rounded-full bg-muted/40 overflow-hidden mr-2">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <p className={`text-sm font-bold shrink-0 w-[72px] text-right tabular-nums ${detailClass === 'dettes' ? 'text-destructive' : 'text-foreground'}`}>
                          {formatCurrency(a.value)}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <div className="pb-3 border-b border-border/30 flex justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Total actuel</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(detailAssets.reduce((s, a) => s + a.value, 0))}</span>
                </div>

                {/* Évolution mensuelle — seulement si 2+ bilans avec données */}
                {(() => {
                  const pointsWithData = detailChartData
                    ? detailChartData.data.filter(pt => detailChartData.items.some(item => pt[item.id] !== null)).length
                    : 0
                  if (!detailChartData || pointsWithData < 2) {
                    return (
                      <p className="text-[10px] text-muted-foreground/40 text-center py-3">
                        La courbe d'évolution apparaîtra après 2 bilans
                      </p>
                    )
                  }
                  return (
                    <div className="mt-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Évolution mensuelle</p>
                      <div className="overflow-x-auto -mx-1 px-1 pb-1" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                        <div style={{ width: Math.max(detailChartData.monthCount * 56, 300) }}>
                          <LineChart
                            width={Math.max(detailChartData.monthCount * 56, 300)}
                            height={160}
                            data={detailChartData.data}
                            margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
                          >
                            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(215 10% 48%)' }} axisLine={false} tickLine={false} />
                            <YAxis
                              tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v))}
                              tick={{ fontSize: 9, fill: 'hsl(215 10% 48%)' }}
                              axisLine={false} tickLine={false} width={36}
                            />
                            <Tooltip
                              formatter={(val: number) => val !== null ? formatCurrency(val) : null}
                              contentStyle={{ background: 'hsl(225 12% 13%)', border: '1px solid hsl(215 10% 22%)', borderRadius: 12, fontSize: 11 }}
                              labelStyle={{ color: 'hsl(215 10% 60%)', marginBottom: 4 }}
                              itemStyle={{ fontWeight: 600 }}
                            />
                            {detailChartData.items.map((item, i) => {
                              const color = DONUT_COLORS[i % DONUT_COLORS.length]
                              return (
                                <Line key={item.id} dataKey={item.id} name={item.name} stroke={color} strokeWidth={2}
                                  dot={(props: any) => {
                                    if (props.value === null || props.value === undefined) return <g key={props.key} />
                                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill={color} stroke="none" />
                                  }}
                                  activeDot={{ r: 5, strokeWidth: 0, fill: color }}
                                  connectNulls={false} type="monotone"
                                />
                              )
                            })}
                          </LineChart>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun actif dans cette catégorie</p>
            )}
          </div>
        </div>
      )}

      {/* Assets list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actifs & Dettes</h2>
          <div className="flex items-center gap-2">
            {(store.assets.length > 0 || store.debts.length > 0) && (
              <button
                onClick={() => { setEditMode(!editMode); setSelectedIds(new Set()) }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${editMode ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground'}`}
              >
                <Pencil className="w-3 h-3" /> Modifier
              </button>
            )}
            <button onClick={() => setShowAdd(true)} className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {store.assets.length === 0 && store.debts.length === 0 && (
          <FinanceCard className="text-center py-8">
            <p className="text-sm text-muted-foreground">Commence par ajouter ton premier actif.</p>
            <p className="text-xs text-muted-foreground mt-1">Exemple : compte courant, livret, crypto, action ou dette.</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
              + Ajouter un actif
            </button>
          </FinanceCard>
        )}

        <div className="space-y-2">
          {store.assets.map(a => (
            <FinanceCard key={a.id} onClick={editMode ? () => toggleSelect(a.id) : undefined} className={editMode ? 'cursor-pointer' : ''}>
              <div className="flex items-center gap-3">
                {editMode && (
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedIds.has(a.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                    {selectedIds.has(a.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                )}
                <span className="text-lg flex-shrink-0">{ASSET_TYPE_ICONS[a.type] || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ASSET_TYPE_LABELS[a.type]}{a.ticker ? ` · ${a.ticker}` : ''}{a.symbol ? ` · ${a.symbol}` : ''}</p>
                  {a.quantity && <p className="text-[10px] text-primary">{a.quantity} × {formatCurrency(a.unitPrice || 0, a.priceCurrency)}</p>}
                  {a.type === 'immobilier' && a.outstandingMortgage ? (
                    <p className="text-[10px] text-muted-foreground">Net : {formatCurrency((a.estimatedValue || 0) - (a.outstandingMortgage || 0))}</p>
                  ) : null}
                </div>
                <p className="text-sm font-bold text-foreground flex-shrink-0">{formatCurrency(a.value, a.currency)}</p>
              </div>
            </FinanceCard>
          ))}
          {store.debts.map(d => (
            <FinanceCard key={d.id} onClick={editMode ? () => toggleSelect(d.id) : undefined} className={editMode ? 'cursor-pointer' : ''}>
              <div className="flex items-center gap-3">
                {editMode && (
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedIds.has(d.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                    {selectedIds.has(d.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                )}
                <span className="text-lg flex-shrink-0">💳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                  <p className="text-[10px] text-muted-foreground">{d.lender}{d.monthlyPayment > 0 ? ` · ${formatCurrency(d.monthlyPayment)}/mois` : ''}</p>
                </div>
                <p className="text-sm font-bold text-rose-400 flex-shrink-0">{formatCurrency(d.outstandingBalance)}</p>
              </div>
            </FinanceCard>
          ))}
        </div>
      </div>

      {/* Edit mode action bar */}
      {editMode && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 px-4 pb-2">
          <div className="bg-card/95 backdrop-blur-lg border border-border/50 rounded-2xl p-3 flex gap-2 shadow-xl max-w-lg mx-auto">
            <button onClick={() => { setEditMode(false); setSelectedIds(new Set()) }} className="flex-1 py-2.5 rounded-xl text-sm bg-muted/50 text-foreground font-medium">
              Annuler
            </button>
            {selectedIds.size === 1 && (
              <button onClick={handleEditSelected} className="flex-1 py-2.5 rounded-xl text-sm bg-primary/20 text-primary font-semibold">
                Modifier
              </button>
            )}
            {selectedIds.size > 0 && (
              <button onClick={handleDeleteSelected} className="flex-1 py-2.5 rounded-xl text-sm bg-rose-500/20 text-rose-400 font-semibold">
                Supprimer {selectedIds.size > 1 ? `(${selectedIds.size})` : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={resetForm}>
          <div className="bg-card w-full max-w-lg rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                {editingId ? `Modifier — ${selectedType ? ASSET_TYPE_LABELS[selectedType] : ''}` : (selectedType ? `Ajouter — ${ASSET_TYPE_LABELS[selectedType]}` : 'Choisir un type d\'actif')}
              </h3>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {!selectedType ? (
              <div className="grid grid-cols-2 gap-2">
                {ASSET_TYPES.map(t => (
                  <button key={t} onClick={() => setSelectedType(t)} className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/30 text-left hover:bg-muted/50 transition-colors">
                    <span className="text-xl">{ASSET_TYPE_ICONS[t]}</span>
                    <span className="text-xs font-medium text-foreground">{ASSET_TYPE_LABELS[t]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <input className={numInput} placeholder="Nom" value={name} onChange={e => setName(e.target.value)} />

                {['compte_bancaire', 'livret_epargne'].includes(selectedType) && (<>
                  <input className={numInput} placeholder="Établissement" value={platform} onChange={e => setPlatform(e.target.value)} />
                  <input className={numInput} placeholder="Solde actuel" type="number" inputMode="decimal" value={value} onFocus={e => e.target.select()} onChange={e => setValue(e.target.value)} />
                  <select className={numInput} value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
                  </select>
                </>)}

                {selectedType === 'assurance_vie' && (<>
                  <input className={numInput} placeholder="Assureur (ex: Linxea, Boursorama…)" value={platform} onChange={e => setPlatform(e.target.value)} />
                  <input className={numInput} placeholder="Valeur actuelle du contrat €" type="number" inputMode="decimal" value={value} onFocus={e => e.target.select()} onChange={e => setValue(e.target.value)} />
                  <select className={numInput} value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="EUR">EUR</option>
                  </select>
                </>)}

                {['actions', 'etf'].includes(selectedType) && (<>
                  <input className={numInput} placeholder="Ticker (ex: MSCI World)" value={ticker} onChange={e => setTicker(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Quantité" type="number" inputMode="decimal" value={quantity} onFocus={e => e.target.select()} onChange={e => setQuantity(e.target.value)} />
                    <input className="bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Prix unitaire" type="number" inputMode="decimal" value={unitPrice} onFocus={e => e.target.select()} onChange={e => setUnitPrice(e.target.value)} />
                  </div>
                  <select className={numInput} value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)}>
                    <option value="EUR">EUR</option><option value="USD">USD</option>
                  </select>
                  <div className="bg-muted/30 rounded-xl px-3 py-2 flex justify-between">
                    <span className="text-xs text-muted-foreground">Valeur totale calculée</span>
                    <span className="text-sm font-bold text-primary">{formatCurrency(computedValue, priceCurrency)}</span>
                  </div>
                </>)}

                {selectedType === 'crypto' && (<>
                  <input className={numInput} placeholder="Symbole (ex: BTC)" value={ticker} onChange={e => setTicker(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Quantité" type="number" inputMode="decimal" value={quantity} onFocus={e => e.target.select()} onChange={e => setQuantity(e.target.value)} />
                    <input className="bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Prix spot" type="number" inputMode="decimal" value={unitPrice} onFocus={e => e.target.select()} onChange={e => setUnitPrice(e.target.value)} />
                  </div>
                  <select className={numInput} value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)}>
                    <option value="EUR">EUR</option><option value="USD">USD</option>
                  </select>
                  <div className="bg-muted/30 rounded-xl px-3 py-2 flex justify-between">
                    <span className="text-xs text-muted-foreground">Valeur totale</span>
                    <span className="text-sm font-bold text-primary">{formatCurrency(computedValue, priceCurrency)}</span>
                  </div>
                </>)}

                {selectedType === 'immobilier' && (<>
                  <input className={numInput} placeholder="Type de bien (appartement, maison...)" value={propertyType} onChange={e => setPropertyType(e.target.value)} />
                  <input className={numInput} placeholder="Valeur estimée actuelle" type="number" inputMode="decimal" value={estimatedValue} onFocus={e => e.target.select()} onChange={e => setEstimatedValue(e.target.value)} />
                  <input className={numInput} placeholder="Capital restant dû" type="number" inputMode="decimal" value={outstandingMortgage} onFocus={e => e.target.select()} onChange={e => setOutstandingMortgage(e.target.value)} />
                  <select className={numInput} value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="EUR">EUR</option><option value="USD">USD</option>
                  </select>
                  <div className="bg-muted/30 rounded-xl px-3 py-2 flex justify-between">
                    <span className="text-xs text-muted-foreground">Valeur nette</span>
                    <span className="text-sm font-bold text-primary">{formatCurrency(computedValue)}</span>
                  </div>
                </>)}

                {['vehicule', 'objet_valeur', 'autre_actif', 'paris_sportif'].includes(selectedType) && (<>
                  <input className={numInput} placeholder="Valeur estimée" type="number" inputMode="decimal" value={value} onFocus={e => e.target.select()} onChange={e => setValue(e.target.value)} />
                  <select className={numInput} value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="EUR">EUR</option><option value="USD">USD</option>
                  </select>
                </>)}

                {selectedType === 'dette' && (<>
                  <input className={numInput} placeholder="Organisme" value={lender} onChange={e => setLender(e.target.value)} />
                  <input className={numInput} placeholder="Montant restant dû" type="number" inputMode="decimal" value={value} onFocus={e => e.target.select()} onChange={e => setValue(e.target.value)} />
                  <input className={numInput} placeholder="Mensualité €" type="number" inputMode="decimal" value={monthlyPayment} onFocus={e => e.target.select()} onChange={e => setMonthlyPayment(e.target.value)} />
                  <input className={numInput} placeholder="Taux % (optionnel)" type="number" inputMode="decimal" value={rate} onFocus={e => e.target.select()} onChange={e => setRate(e.target.value)} />
                </>)}

                <input className={numInput} placeholder="Note (optionnel)" value={notes} onChange={e => setNotes(e.target.value)} />

                <div className="flex gap-2 pt-1">
                  {!editingId && (
                    <button onClick={() => setSelectedType(null)} className="flex-1 py-2.5 rounded-xl text-sm bg-muted/50 text-foreground">← Type</button>
                  )}
                  <button onClick={handleSubmit} disabled={!name} className="flex-1 py-2.5 rounded-xl text-sm bg-primary text-primary-foreground font-semibold disabled:opacity-40">
                    {editingId ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
