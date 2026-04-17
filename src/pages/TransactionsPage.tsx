import React, { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, ASSET_TYPE_ICONS } from '@/lib/constants'
import type { FinanceStore, Transaction, Asset } from '@/types/finance'

interface Props {
  store: FinanceStore
  onAdd: (t: Transaction) => void
  onDelete: (id: string) => void
  onUpdateAsset: (id: string, patch: Partial<Asset>) => void
}

const todayISO = () => new Date().toISOString().split('T')[0]
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

export const TransactionsPage: React.FC<Props> = ({ store, onAdd, onDelete, onUpdateAsset }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [filterMonth, setFilterMonth] = useState(getCurrentMonthKey())
  const [filterAccount, setFilterAccount] = useState('')
  const [showTransfer, setShowTransfer] = useState(false)

  useEffect(() => {
    if (location.pathname === '/transactions/new') setShowTransfer(true)
  }, [location.pathname])

  const navigateMonth = (dir: number) => {
    const [y, m] = filterMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // ── Transfer state ─────────────────────────────────────────────────────────
  const [transferFrom,       setTransferFrom]       = useState('')
  const [transferTo,         setTransferTo]         = useState('')
  const [transferFromCrypto, setTransferFromCrypto] = useState('')
  const [transferToCrypto,   setTransferToCrypto]   = useState('')
  const [transferAmount,     setTransferAmount]     = useState('')
  const [transferFees,       setTransferFees]       = useState('')
  const [transferDate,       setTransferDate]       = useState(todayISO())
  const [transferLabel,      setTransferLabel]      = useState('')

  const cryptoAssets    = useMemo(() => store.assets.filter(a => a.type === 'crypto'), [store.assets])
  const nonCryptoAssets = useMemo(() => store.assets.filter(a => a.type !== 'crypto' && a.type !== 'dette'), [store.assets])

  const resolveTarget = (target: string, sub: string) =>
    target === '__crypto__' ? (sub ? `asset:${sub}` : '') : target

  const targetLabel = (target: string, sub: string) => {
    const r = resolveTarget(target, sub)
    if (!r) return ''
    if (r.startsWith('acc:'))   return store.accounts.find(a => a.id === r.slice(4))?.name || ''
    if (r.startsWith('asset:')) {
      const a = store.assets.find(x => x.id === r.slice(6))
      return a ? `${ASSET_TYPE_ICONS[a.type] || '📦'} ${a.name}` : ''
    }
    return ''
  }

  const resetTransfer = () => {
    setShowTransfer(false)
    setTransferFrom(''); setTransferTo('')
    setTransferFromCrypto(''); setTransferToCrypto('')
    setTransferAmount(''); setTransferFees(''); setTransferLabel('')
    setTransferDate(todayISO())
  }

  const handleTransfer = () => {
    const from = resolveTarget(transferFrom, transferFromCrypto)
    const to   = resolveTarget(transferTo,   transferToCrypto)
    if (!from || !to || from === to || !transferAmount) return
    const amt  = Number(transferAmount)
    const fees = Number(transferFees) || 0
    if (!amt) return

    const fromAccId   = from.startsWith('acc:')   ? from.slice(4) : null
    const fromAssetId = from.startsWith('asset:') ? from.slice(6) : null
    const toAccId     = to.startsWith('acc:')     ? to.slice(4)   : null
    const toAssetId   = to.startsWith('asset:')   ? to.slice(6)   : null

    const lbl          = transferLabel || `Transfert ${targetLabel(transferFrom, transferFromCrypto)} → ${targetLabel(transferTo, transferToCrypto)}`
    const dateMonthKey = transferDate.substring(0, 7)
    const isoDate      = new Date(transferDate + 'T12:00:00').toISOString()
    const fraisCat     = store.categories.find(c => c.name.toLowerCase().includes('frais') || c.name.toLowerCase().includes('banque')) || store.categories[0]

    const base: Omit<Transaction, 'id' | 'direction' | 'accountId' | 'label'> = {
      date: isoDate, amount: amt, sourceType: 'bank',
      categoryId: store.categories[0]?.id || '',
      monthKey: dateMonthKey, note: 'Transfert interne',
      isRecurring: false, revenueType: 'transfert_interne', isRealRevenue: false,
    }

    if (fromAccId)   onAdd({ ...base, id: crypto.randomUUID(), direction: 'expense', accountId: fromAccId, label: `${lbl} (sortie)` })
    else if (fromAssetId) {
      const a = store.assets.find(x => x.id === fromAssetId)
      if (a) onUpdateAsset(fromAssetId, { value: Math.max(0, a.value - amt), updatedAt: new Date().toISOString() })
    }

    if (toAccId)   onAdd({ ...base, id: crypto.randomUUID(), direction: 'income', accountId: toAccId, label: `${lbl} (entrée)`, revenueSource: 'virement_interne' })
    else if (toAssetId) {
      const a = store.assets.find(x => x.id === toAssetId)
      if (a) onUpdateAsset(toAssetId, { value: a.value + amt, updatedAt: new Date().toISOString() })
    }

    if (fees > 0 && fromAccId) {
      onAdd({
        id: crypto.randomUUID(), date: isoDate, label: `Frais — ${lbl}`,
        amount: fees, direction: 'expense', sourceType: 'bank',
        accountId: fromAccId, categoryId: fraisCat?.id || store.categories[0]?.id || '',
        monthKey: dateMonthKey, note: 'Frais de transfert', isRecurring: false,
      })
    }
    resetTransfer()
  }

  const fromResolved  = resolveTarget(transferFrom, transferFromCrypto)
  const toResolved    = resolveTarget(transferTo,   transferToCrypto)
  const transferValid = !!fromResolved && !!toResolved && fromResolved !== toResolved && !!transferAmount

  // ── List ───────────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    store.transactions
      .filter(t => t.monthKey === filterMonth)
      .filter(t => !filterAccount || t.accountId === filterAccount)
      .filter(t => t.revenueType === 'transfert_interne' || t.note === 'Transfert interne')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [store.transactions, filterMonth, filterAccount]
  )

  const getAccountName = (id: string) => store.accounts.find(a => a.id === id)?.name || ''

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-white shrink-0">Transferts</h1>
        <button
          onClick={() => setShowTransfer(v => !v)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl shrink-0 transition-colors text-xs font-semibold border ${showTransfer ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-muted/40 text-muted-foreground border-border/30'}`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Nouveau</span>
        </button>
      </div>

      {/* Transfer form */}
      {showTransfer && (
        <FinanceCard className="space-y-3 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 pb-1 border-b border-amber-500/20">
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-sm font-semibold text-amber-400">Transfert interne</span>
              <p className="text-[10px] text-muted-foreground">Mouvement entre comptes ou actifs — ne compte pas dans les revenus</p>
            </div>
          </div>

          {/* Source */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">De (source)</p>
            <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
              value={transferFrom} onChange={e => { setTransferFrom(e.target.value); setTransferFromCrypto('') }}>
              <option value="">Choisir</option>
              <optgroup label="Comptes">
                {store.accounts.map(a => <option key={a.id} value={`acc:${a.id}`}>{a.name}</option>)}
              </optgroup>
              {cryptoAssets.length > 0 && (
                <optgroup label="Cryptos">
                  <option value="__crypto__">🪙 Cryptos (choisir ci-dessous)</option>
                </optgroup>
              )}
              {nonCryptoAssets.length > 0 && (
                <optgroup label="Autres actifs">
                  {nonCryptoAssets.map(a => <option key={a.id} value={`asset:${a.id}`}>{ASSET_TYPE_ICONS[a.type] || '📦'} {a.name}</option>)}
                </optgroup>
              )}
            </select>
            {transferFrom === '__crypto__' && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cryptoAssets.map(a => (
                  <button key={a.id} onClick={() => setTransferFromCrypto(a.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${transferFromCrypto === a.id ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'bg-muted/40 text-muted-foreground border border-border/30'}`}>
                    🪙 {a.symbol || a.name} {a.quantity ? `(${a.quantity})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Vers (destination)</p>
            <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
              value={transferTo} onChange={e => { setTransferTo(e.target.value); setTransferToCrypto('') }}>
              <option value="">Choisir</option>
              <optgroup label="Comptes">
                {store.accounts.map(a => <option key={a.id} value={`acc:${a.id}`}>{a.name}</option>)}
              </optgroup>
              {cryptoAssets.length > 0 && (
                <optgroup label="Cryptos">
                  <option value="__crypto__">🪙 Cryptos (choisir ci-dessous)</option>
                </optgroup>
              )}
              {nonCryptoAssets.length > 0 && (
                <optgroup label="Autres actifs">
                  {nonCryptoAssets.map(a => <option key={a.id} value={`asset:${a.id}`}>{ASSET_TYPE_ICONS[a.type] || '📦'} {a.name}</option>)}
                </optgroup>
              )}
            </select>
            {transferTo === '__crypto__' && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cryptoAssets.map(a => (
                  <button key={a.id} onClick={() => setTransferToCrypto(a.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${transferToCrypto === a.id ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'bg-muted/40 text-muted-foreground border border-border/30'}`}>
                    🪙 {a.symbol || a.name} {a.quantity ? `(${a.quantity})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {fromResolved && toResolved && fromResolved !== toResolved && (
            <div className="flex items-center gap-2 bg-amber-500/10 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-300 font-medium truncate">{targetLabel(transferFrom, transferFromCrypto)}</span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300 font-medium truncate">{targetLabel(transferTo, transferToCrypto)}</span>
            </div>
          )}

          {/* Amount + fees */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Montant</p>
              <input type="number" inputMode="decimal" placeholder="0 €"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                value={transferAmount} onFocus={e => e.target.select()} onChange={e => setTransferAmount(e.target.value)} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Frais (optionnel)</p>
              <input type="number" inputMode="decimal" placeholder="0 €"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                value={transferFees} onFocus={e => e.target.select()} onChange={e => setTransferFees(e.target.value)} />
            </div>
          </div>
          {Number(transferFees) > 0 && (
            <p className="text-[10px] text-amber-300 -mt-1">Les frais seront comptabilisés en dépense (frais bancaires)</p>
          )}

          <input type="date" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
            value={transferDate} max={todayISO()} onChange={e => setTransferDate(e.target.value)} />

          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Libellé (ex: Achat XRP via Binance)"
            value={transferLabel} onChange={e => setTransferLabel(e.target.value)} />

          <div className="flex gap-2">
            <button onClick={resetTransfer} className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground bg-muted/30">Annuler</button>
            <button onClick={handleTransfer} disabled={!transferValid}
              className="flex-2 basis-0 grow-[2] bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40">
              Enregistrer
            </button>
          </div>
        </FinanceCard>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigateMonth(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(filterMonth)}</span>
        <button onClick={() => navigateMonth(1)} disabled={filterMonth >= getCurrentMonthKey()}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Account filter */}
      <select className="w-full bg-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
        value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
        <option value="">Tous les comptes</option>
        {store.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {/* Transfer list */}
      <div className="space-y-2">
        {filtered.map(t => (
          <FinanceCard key={t.id} className="border border-amber-500/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10">
                <ArrowLeftRight className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.label}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(t.date)} · {getAccountName(t.accountId)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-sm font-bold text-amber-400">{formatCurrency(t.amount)}</p>
                <button onClick={() => onDelete(t.id)} className="text-muted-foreground active:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </FinanceCard>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun transfert ce mois</p>
        )}
      </div>
    </div>
  )
}
