import React, { useMemo, useState } from 'react'
import { Plus, Trash2, ChevronRight, X } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, ASSET_TYPE_LABELS, ASSET_TYPE_ICONS, ASSET_CLASS_MAP, ASSET_CLASS_LABELS } from '@/lib/constants'
import type { FinanceStore, Asset, Debt, AssetType } from '@/types/finance'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface Props {
  store: FinanceStore
  onAddAsset: (a: Asset) => void
  onRemoveAsset: (id: string) => void
  onAddDebt: (d: Debt) => void
  onRemoveDebt: (id: string) => void
}

const ASSET_TYPES: AssetType[] = ['compte_bancaire', 'livret_epargne', 'assurance_vie', 'actions', 'etf', 'crypto', 'immobilier', 'vehicule', 'objet_valeur', 'autre_actif', 'dette']

export const PatrimoinePage: React.FC<Props> = ({ store, onAddAsset, onRemoveAsset, onAddDebt, onRemoveDebt }) => {
  const [showAdd, setShowAdd] = useState(false)
  const [selectedType, setSelectedType] = useState<AssetType | null>(null)
  const [detailClass, setDetailClass] = useState<string | null>(null)

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

  // Class breakdown
  const classBreakdown = useMemo(() => {
    const map: Record<string, number> = {}

    // Accounts as cash
    const accountsCash = store.accounts.filter(a => a.isActive && a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
    if (accountsCash > 0) map['cash'] = (map['cash'] || 0) + accountsCash

    // Assets
    store.assets.forEach(a => {
      const cls = ASSET_CLASS_MAP[a.type] || 'autres'
      if (cls === 'dettes') {
        map['dettes'] = (map['dettes'] || 0) + (a.outstandingBalance || a.value)
      } else {
        map[cls] = (map[cls] || 0) + a.value
      }
    })

    // Debts from debts array
    const debtsFromArray = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
    if (debtsFromArray > 0) map['dettes'] = (map['dettes'] || 0) + debtsFromArray

    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([cls, val]) => ({
        class: cls,
        label: ASSET_CLASS_LABELS[cls]?.label || cls,
        value: val,
        color: ASSET_CLASS_LABELS[cls]?.color || 'hsl(0 0% 55%)',
        pct: stats.brut + stats.debtsTotal > 0 ? Math.round((val / (stats.brut + stats.debtsTotal)) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [store, stats])

  // Assets for detail view
  const detailAssets = useMemo(() => {
    if (!detailClass) return []
    if (detailClass === 'cash') {
      return store.accounts.filter(a => a.isActive && a.type !== 'dette').map(a => ({
        name: a.name,
        value: a.currentBalance,
        detail: a.institution,
      }))
    }
    if (detailClass === 'dettes') {
      const items = [
        ...store.debts.map(d => ({ name: d.name, value: d.outstandingBalance, detail: d.lender || `${formatCurrency(d.monthlyPayment)}/mois` })),
        ...store.assets.filter(a => a.type === 'dette').map(a => ({ name: a.name, value: a.outstandingBalance || a.value, detail: a.lender || '' })),
      ]
      return items
    }
    const matchingTypes = Object.entries(ASSET_CLASS_MAP).filter(([, cls]) => cls === detailClass).map(([t]) => t)
    return store.assets.filter(a => matchingTypes.includes(a.type)).map(a => ({
      name: a.name,
      value: a.value,
      detail: a.ticker || a.symbol || a.platform || a.propertyType || '',
      extra: a.quantity ? `${a.quantity} × ${formatCurrency(a.unitPrice || 0, a.priceCurrency || 'EUR')}` : undefined,
    }))
  }, [detailClass, store])

  const computedValue = useMemo(() => {
    if (!selectedType) return 0
    if (['actions', 'etf', 'crypto'].includes(selectedType)) {
      return (Number(quantity) || 0) * (Number(unitPrice) || 0)
    }
    if (selectedType === 'immobilier') {
      return (Number(estimatedValue) || 0) - (Number(outstandingMortgage) || 0)
    }
    return Number(value) || 0
  }, [selectedType, quantity, unitPrice, estimatedValue, outstandingMortgage, value])

  const resetForm = () => {
    setSelectedType(null); setName(''); setValue(''); setCurrency('EUR'); setPlatform('')
    setNotes(''); setTicker(''); setQuantity(''); setUnitPrice(''); setPriceCurrency('EUR')
    setPropertyType(''); setEstimatedValue(''); setOutstandingMortgage(''); setLender('')
    setMonthlyPayment(''); setRate(''); setShowAdd(false)
  }

  const handleSubmit = () => {
    if (!selectedType || !name) return
    const now = new Date().toISOString()

    if (selectedType === 'dette') {
      onAddDebt({
        id: crypto.randomUUID(),
        name,
        lender,
        outstandingBalance: Number(value) || 0,
        monthlyPayment: Number(monthlyPayment) || 0,
        rate: Number(rate) || 0,
        notes,
        updatedAt: now,
      })
    } else {
      const asset: Asset = {
        id: crypto.randomUUID(),
        name,
        type: selectedType,
        value: ['actions', 'etf', 'crypto'].includes(selectedType) ? computedValue : selectedType === 'immobilier' ? (Number(estimatedValue) || 0) : (Number(value) || 0),
        platform,
        notes,
        currency,
        updatedAt: now,
      }
      if (['actions', 'etf'].includes(selectedType)) {
        asset.ticker = ticker
        asset.quantity = Number(quantity) || 0
        asset.unitPrice = Number(unitPrice) || 0
        asset.priceCurrency = priceCurrency
      }
      if (selectedType === 'crypto') {
        asset.symbol = ticker
        asset.quantity = Number(quantity) || 0
        asset.unitPrice = Number(unitPrice) || 0
        asset.priceCurrency = priceCurrency
      }
      if (selectedType === 'immobilier') {
        asset.propertyType = propertyType
        asset.estimatedValue = Number(estimatedValue) || 0
        asset.outstandingMortgage = Number(outstandingMortgage) || 0
      }
      onAddAsset(asset)
    }
    resetForm()
  }

  const donutData = classBreakdown.filter(c => c.class !== 'dettes')

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Patrimoine net</p>
        <h1 className="text-3xl font-bold text-foreground">{formatCurrency(stats.net)}</h1>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <FinanceCard>
          <p className="text-[10px] text-muted-foreground">Brut</p>
          <p className="text-sm font-bold text-foreground">{formatCurrency(stats.brut)}</p>
        </FinanceCard>
        <FinanceCard>
          <p className="text-[10px] text-muted-foreground">Dettes</p>
          <p className="text-sm font-bold text-destructive">{formatCurrency(stats.debtsTotal)}</p>
        </FinanceCard>
        <FinanceCard>
          <p className="text-[10px] text-muted-foreground">Net</p>
          <p className={`text-sm font-bold ${stats.net >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(stats.net)}</p>
        </FinanceCard>
      </div>

      {stats.lastUpdate && (
        <p className="text-[10px] text-muted-foreground text-right">Dernière MAJ : {new Date(stats.lastUpdate).toLocaleDateString('fr-FR')}</p>
      )}

      {/* Donut chart — Répartition des actifs */}
      {donutData.length > 0 && (
        <FinanceCard>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Répartition des actifs</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {classBreakdown.map(c => (
                <button key={c.class} onClick={() => setDetailClass(c.class)} className="flex items-center justify-between w-full text-left group">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-[11px] text-muted-foreground group-hover:text-foreground">{c.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-foreground">{formatCurrency(c.value)}</span>
                    <span className="text-[10px] text-muted-foreground">{c.pct}%</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
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
                {detailAssets.length > 1 && (
                  <div className="mb-4">
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={detailAssets.map(a => ({ name: a.name, value: a.value }))} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                          {detailAssets.map((_, i) => <Cell key={i} fill={`hsl(${(i * 60 + 165) % 360} 50% 50%)`} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="space-y-2">
                  {detailAssets.map((a, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        {a.detail && <p className="text-[10px] text-muted-foreground">{a.detail}</p>}
                        {(a as any).extra && <p className="text-[10px] text-primary">{(a as any).extra}</p>}
                      </div>
                      <p className={`text-sm font-bold ${detailClass === 'dettes' ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(a.value)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Total</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(detailAssets.reduce((s, a) => s + a.value, 0))}</span>
                </div>
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
          <button onClick={() => setShowAdd(true)} className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Plus className="w-4 h-4" />
          </button>
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
            <FinanceCard key={a.id}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{ASSET_TYPE_ICONS[a.type] || '📦'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ASSET_TYPE_LABELS[a.type]}{a.ticker ? ` · ${a.ticker}` : ''}{a.symbol ? ` · ${a.symbol}` : ''}</p>
                    {a.quantity && <p className="text-[10px] text-primary">{a.quantity} × {formatCurrency(a.unitPrice || 0, a.priceCurrency)}</p>}
                    {a.type === 'immobilier' && a.outstandingMortgage ? (
                      <p className="text-[10px] text-muted-foreground">Net : {formatCurrency((a.estimatedValue || 0) - (a.outstandingMortgage || 0))}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(a.value, a.currency)}</p>
                  <button onClick={() => onRemoveAsset(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </FinanceCard>
          ))}
          {store.debts.map(d => (
            <FinanceCard key={d.id}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">💳</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">{d.lender}{d.monthlyPayment > 0 ? ` · ${formatCurrency(d.monthlyPayment)}/mois` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-destructive">{formatCurrency(d.outstandingBalance)}</p>
                  <button onClick={() => onRemoveDebt(d.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </FinanceCard>
          ))}
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={resetForm}>
          <div className="bg-card w-full max-w-lg rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">{selectedType ? `Ajouter — ${ASSET_TYPE_LABELS[selectedType]}` : 'Choisir un type d\'actif'}</h3>
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
                <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Nom" value={name} onChange={e => setName(e.target.value)} />

                {['compte_bancaire', 'livret_epargne'].includes(selectedType) && (
                  <>
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Établissement" value={platform} onChange={e => setPlatform(e.target.value)} />
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Solde actuel" type="number" value={value} onChange={e => setValue(e.target.value)} />
                    <select className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
                    </select>
                  </>
                )}

                {selectedType === 'assurance_vie' && (
                  <>
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Assureur (ex: Linxea, Boursorama…)" value={platform} onChange={e => setPlatform(e.target.value)} />
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Valeur actuelle du contrat €" type="number" value={value} onChange={e => setValue(e.target.value)} />
                    <select className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="EUR">EUR</option>
                    </select>
                  </>
                )}

                {['actions', 'etf'].includes(selectedType) && (
                  <>
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Ticker (ex: MSCI World)" value={ticker} onChange={e => setTicker(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Quantité" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
                      <input className="bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Prix unitaire" type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
                    </div>
                    <select className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)}>
                      <option value="EUR">EUR</option><option value="USD">USD</option>
                    </select>
                    <div className="bg-muted/30 rounded-xl px-3 py-2 flex justify-between">
                      <span className="text-xs text-muted-foreground">Valeur totale calculée</span>
                      <span className="text-sm font-bold text-primary">{formatCurrency(computedValue, priceCurrency)}</span>
                    </div>
                  </>
                )}

                {selectedType === 'crypto' && (
                  <>
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Symbole (ex: BTC)" value={ticker} onChange={e => setTicker(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Quantité" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
                      <input className="bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Prix spot" type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
                    </div>
                    <select className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)}>
                      <option value="EUR">EUR</option><option value="USD">USD</option>
                    </select>
                    <div className="bg-muted/30 rounded-xl px-3 py-2 flex justify-between">
                      <span className="text-xs text-muted-foreground">Valeur totale</span>
                      <span className="text-sm font-bold text-primary">{formatCurrency(computedValue, priceCurrency)}</span>
                    </div>
                  </>
                )}

                {selectedType === 'immobilier' && (
                  <>
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Type de bien (appartement, maison...)" value={propertyType} onChange={e => setPropertyType(e.target.value)} />
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Valeur estimée actuelle" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Capital restant dû" type="number" value={outstandingMortgage} onChange={e => setOutstandingMortgage(e.target.value)} />
                    <select className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="EUR">EUR</option><option value="USD">USD</option>
                    </select>
                    <div className="bg-muted/30 rounded-xl px-3 py-2 flex justify-between">
                      <span className="text-xs text-muted-foreground">Valeur nette</span>
                      <span className="text-sm font-bold text-primary">{formatCurrency(computedValue)}</span>
                    </div>
                  </>
                )}

                {['vehicule', 'objet_valeur', 'autre_actif'].includes(selectedType) && (
                  <>
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Valeur estimée" type="number" value={value} onChange={e => setValue(e.target.value)} />
                    <select className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="EUR">EUR</option><option value="USD">USD</option>
                    </select>
                  </>
                )}

                {selectedType === 'dette' && (
                  <>
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Organisme" value={lender} onChange={e => setLender(e.target.value)} />
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Montant restant dû" type="number" value={value} onChange={e => setValue(e.target.value)} />
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Mensualité €" type="number" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} />
                    <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Taux % (optionnel)" type="number" value={rate} onChange={e => setRate(e.target.value)} />
                  </>
                )}

                <input className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Note (optionnel)" value={notes} onChange={e => setNotes(e.target.value)} />

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setSelectedType(null)} className="flex-1 py-2.5 rounded-xl text-sm bg-muted/50 text-foreground">← Type</button>
                  <button onClick={handleSubmit} disabled={!name} className="flex-1 py-2.5 rounded-xl text-sm bg-primary text-primary-foreground font-semibold disabled:opacity-40">Ajouter</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
