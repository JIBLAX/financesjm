import React, { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, ArrowUpRight, ArrowDownRight, Info, ChevronLeft, ChevronRight, ArrowLeftRight, ChevronDown } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, REVENUE_SOURCE_LABELS, REVENUE_TYPE_LABELS, BE_ACTIV_CHANNEL_LABELS, BE_ACTIV_PAYMENT_LABELS, BE_ACTIV_STATUS_LABELS, ASSET_TYPE_ICONS } from '@/lib/constants'
import { NON_REAL_REVENUE_TYPES } from '@/types/finance'
import { BUSINESS_OFFERS, resolveLegacyOffer } from '@/lib/beActiv'
import type { FinanceStore, Transaction, Asset, RevenueSource, RevenueType, RevenueRecurrence, BeActivChannel, BeActivPaymentMode, BeActivStatus } from '@/types/finance'

interface Props {
  store: FinanceStore
  onAdd: (t: Transaction) => void
  onDelete: (id: string) => void
  onUpdateAsset: (id: string, patch: Partial<Asset>) => void
}

const todayISO = () => new Date().toISOString().split('T')[0]

const formatTxDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export const TransactionsPage: React.FC<Props> = ({ store, onAdd, onDelete, onUpdateAsset }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [showForm, setShowForm] = useState(false)
  const [filterMonth, setFilterMonth] = useState(getCurrentMonthKey())
  const [filterAccount, setFilterAccount] = useState('')

  // Auto-open form when navigating to /transactions/new
  useEffect(() => {
    if (location.pathname === '/transactions/new') {
      openForm()
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const navigateMonth = (dir: number) => {
    const [y, m] = filterMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Form state
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [txDate, setTxDate] = useState(todayISO())
  const [direction, setDirection] = useState<'income' | 'expense'>('expense')
  const [sourceType, setSourceType] = useState<'bank' | 'cash'>('bank')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState(store.categories[0]?.id || '')
  const [note, setNote] = useState('')

  // Revenue fields
  const [revenueSource, setRevenueSource] = useState<RevenueSource>('autre')
  const [revenueType, setRevenueType] = useState<RevenueType>('autre_revenu')
  const [revenueRecurrence, setRevenueRecurrence] = useState<RevenueRecurrence>('unique')
  const [paymentMode, setPaymentMode] = useState<'unique' | 'recurrent' | 'installment'>('unique')
  const [installmentTotal, setInstallmentTotal] = useState('')
  const [installmentCount, setInstallmentCount] = useState('')

  // Be Activ fields — Business catalog
  const [baBusinessOfferId, setBaBusinessOfferId] = useState('')
  const [baCatalogPriceSnapshot, setBaCatalogPriceSnapshot] = useState('')
  const [baChannel, setBaChannel] = useState<BeActivChannel | ''>('')
  const [baPayment, setBaPayment] = useState<BeActivPaymentMode | ''>('')
  const [baStatus, setBaStatus] = useState<BeActivStatus>('recu')
  const [baIsInstallment, setBaIsInstallment] = useState(false)
  const [baTotalAmount, setBaTotalAmount] = useState('')
  const [baInstallmentLabel, setBaInstallmentLabel] = useState('')

  const isRealRevenue = !NON_REAL_REVENUE_TYPES.includes(revenueType)

  // Transfer interne state
  const [showTransfer, setShowTransfer] = useState(false)
  // 'acc:{id}' | 'asset:{id}' | '__crypto__'
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  // Sub-sélection crypto (quand __crypto__ choisi)
  const [transferFromCrypto, setTransferFromCrypto] = useState('')
  const [transferToCrypto, setTransferToCrypto] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferFees, setTransferFees] = useState('')
  const [transferDate, setTransferDate] = useState(todayISO())
  const [transferLabel, setTransferLabel] = useState('')

  const cryptoAssets = useMemo(() => store.assets.filter(a => a.type === 'crypto'), [store.assets])
  const nonCryptoAssets = useMemo(() => store.assets.filter(a => a.type !== 'crypto' && a.type !== 'dette'), [store.assets])

  // Résout le vrai identifiant cible (ex: __crypto__ + sub → asset:id)
  const resolveTarget = (target: string, cryptoSub: string): string => {
    if (target === '__crypto__') return cryptoSub ? `asset:${cryptoSub}` : ''
    return target
  }

  // Nom affiché pour un identifiant cible
  const targetLabel = (target: string, cryptoSub: string): string => {
    const resolved = resolveTarget(target, cryptoSub)
    if (!resolved) return ''
    if (resolved.startsWith('acc:')) return store.accounts.find(a => a.id === resolved.slice(4))?.name || ''
    if (resolved.startsWith('asset:')) {
      const a = store.assets.find(x => x.id === resolved.slice(6))
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
    const resolvedFrom = resolveTarget(transferFrom, transferFromCrypto)
    const resolvedTo   = resolveTarget(transferTo,   transferToCrypto)
    if (!resolvedFrom || !resolvedTo || resolvedFrom === resolvedTo || !transferAmount) return
    const amt  = Number(transferAmount)
    const fees = Number(transferFees) || 0
    if (!amt) return

    const fromAccId   = resolvedFrom.startsWith('acc:')   ? resolvedFrom.slice(4)  : null
    const fromAssetId = resolvedFrom.startsWith('asset:') ? resolvedFrom.slice(6)  : null
    const toAccId     = resolvedTo.startsWith('acc:')     ? resolvedTo.slice(4)    : null
    const toAssetId   = resolvedTo.startsWith('asset:')   ? resolvedTo.slice(6)    : null

    const fromName = targetLabel(transferFrom, transferFromCrypto)
    const toName   = targetLabel(transferTo,   transferToCrypto)
    const lbl      = transferLabel || `Transfert ${fromName} → ${toName}`
    const dateMonthKey = transferDate.substring(0, 7)
    const isoDate  = new Date(transferDate + 'T12:00:00').toISOString()
    const fraisCat = store.categories.find(c =>
      c.name.toLowerCase().includes('frais') || c.name.toLowerCase().includes('banque')
    ) || store.categories[0]
    const baseTx: Omit<Transaction, 'id' | 'direction' | 'accountId' | 'label'> = {
      date: isoDate, amount: amt, sourceType: 'bank',
      categoryId: store.categories[0]?.id || '',
      monthKey: dateMonthKey, note: 'Transfert interne',
      isRecurring: false, revenueType: 'transfert_interne', isRealRevenue: false,
    }

    // Côté source
    if (fromAccId) {
      onAdd({ ...baseTx, id: crypto.randomUUID(), direction: 'expense', accountId: fromAccId, label: `${lbl} (sortie)` })
    } else if (fromAssetId) {
      const asset = store.assets.find(a => a.id === fromAssetId)
      if (asset) onUpdateAsset(fromAssetId, { value: Math.max(0, asset.value - amt), updatedAt: new Date().toISOString() })
    }

    // Côté destination
    if (toAccId) {
      onAdd({ ...baseTx, id: crypto.randomUUID(), direction: 'income', accountId: toAccId, label: `${lbl} (entrée)`, revenueSource: 'virement_interne' })
    } else if (toAssetId) {
      const asset = store.assets.find(a => a.id === toAssetId)
      if (asset) onUpdateAsset(toAssetId, { value: asset.value + amt, updatedAt: new Date().toISOString() })
    }

    // Frais bancaires (déduits du compte source uniquement)
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

  // Validation transfert
  const transferFromResolved = resolveTarget(transferFrom, transferFromCrypto)
  const transferToResolved   = resolveTarget(transferTo, transferToCrypto)
  const transferValid = !!transferFromResolved && !!transferToResolved &&
    transferFromResolved !== transferToResolved && !!transferAmount

  const openForm = () => {
    setAccountId(store.accounts[0]?.id || '')
    setShowForm(true)
  }

  const resetForm = () => {
    setLabel(''); setAmount(''); setNote(''); setShowForm(false)
    setTxDate(todayISO())
    setRevenueSource('autre'); setRevenueType('autre_revenu'); setRevenueRecurrence('unique')
    setPaymentMode('unique'); setInstallmentTotal(''); setInstallmentCount('')
    setBaBusinessOfferId(''); setBaCatalogPriceSnapshot(''); setBaChannel(''); setBaPayment(''); setBaStatus('recu')
    setBaIsInstallment(false); setBaTotalAmount(''); setBaInstallmentLabel('')
  }

  const handleSubmit = () => {
    if (!label || !amount) return
    const dateMonthKey = txDate.substring(0, 7)
    const tx: Transaction = {
      id: crypto.randomUUID(),
      date: new Date(txDate + 'T12:00:00').toISOString(),
      label,
      amount: Number(amount),
      direction,
      sourceType,
      accountId,
      categoryId,
      monthKey: dateMonthKey,
      note: paymentMode === 'installment' && installmentCount
        ? `${note ? note + ' · ' : ''}${installmentCount} versements · total ${formatCurrency(Number(installmentTotal))}`
        : note,
      isRecurring: paymentMode === 'recurrent' || paymentMode === 'installment',
    }

    if (direction === 'income') {
      tx.revenueSource = revenueSource
      tx.revenueType = revenueType
      tx.revenueRecurrence = paymentMode === 'unique' ? 'unique' : revenueRecurrence
      tx.isRealRevenue = isRealRevenue

      if (revenueSource === 'be_activ') {
        const selectedOffer = BUSINESS_OFFERS.find(o => o.id === baBusinessOfferId)
        tx.beActivDetails = {
          client: label,
          business_offer_id: baBusinessOfferId || undefined,
          business_offer_name: selectedOffer?.name,
          catalog_price_snapshot: baCatalogPriceSnapshot ? Number(baCatalogPriceSnapshot) : undefined,
          actual_amount: Number(amount) || undefined,
          needs_review: !baBusinessOfferId,
          channel: baChannel,
          paymentMode: baPayment,
          status: baStatus,
          isInstallment: baIsInstallment,
          totalAmount: baIsInstallment ? Number(baTotalAmount) || undefined : undefined,
          installmentLabel: baIsInstallment ? baInstallmentLabel || undefined : undefined,
        }
      }
    }

    onAdd(tx)
    resetForm()
  }

  const formAccounts = store.accounts

  const filtered = useMemo(() => {
    return store.transactions
      .filter(t => t.monthKey === filterMonth)
      .filter(t => !filterAccount || t.accountId === filterAccount)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [store.transactions, filterMonth, filterAccount])

  const getAccountName = (id: string) => store.accounts.find(a => a.id === id)?.name || ''
  const getCategoryName = (id: string) => {
    const cat = store.categories.find(c => c.id === id)
    return cat ? `${cat.icon} ${cat.name}` : ''
  }

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-white shrink-0">Transactions</h1>

        <button
          onClick={() => { resetForm(); setShowTransfer(v => !v) }}
          className={`flex items-center gap-1.5 px-2.5 h-9 rounded-xl shrink-0 transition-colors text-xs font-semibold border ${showTransfer ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-muted/40 text-muted-foreground border-border/30'}`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Transfert</span>
        </button>
        <button
          onClick={() => { resetTransfer(); showForm ? resetForm() : openForm() }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground shrink-0 transition-colors bg-primary"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Transfert interne */}
      {showTransfer && (
        <FinanceCard className="space-y-3 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 pb-1 border-b border-amber-500/20">
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-sm font-semibold text-amber-400">Transfert interne</span>
              <p className="text-[10px] text-muted-foreground">Mouvement entre comptes ou actifs — ne compte pas dans les revenus</p>
            </div>
          </div>

          {/* ─── Sélecteur SOURCE ─── */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">De (source)</p>
            <select
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
              value={transferFrom}
              onChange={e => { setTransferFrom(e.target.value); setTransferFromCrypto('') }}
            >
              <option value="">Choisir</option>
              <optgroup label="Comptes">
                {store.accounts.map(a => (
                  <option key={a.id} value={`acc:${a.id}`}>{a.name}</option>
                ))}
              </optgroup>
              {cryptoAssets.length > 0 && (
                <optgroup label="Cryptos">
                  <option value="__crypto__">🪙 Cryptos (choisir la monnaie ci-dessous)</option>
                </optgroup>
              )}
              {nonCryptoAssets.length > 0 && (
                <optgroup label="Autres actifs">
                  {nonCryptoAssets.map(a => (
                    <option key={a.id} value={`asset:${a.id}`}>{ASSET_TYPE_ICONS[a.type] || '📦'} {a.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {/* Sub-sélection crypto source */}
            {transferFrom === '__crypto__' && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cryptoAssets.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setTransferFromCrypto(a.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${transferFromCrypto === a.id ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'bg-muted/40 text-muted-foreground border border-border/30'}`}
                  >
                    🪙 {a.symbol || a.name} {a.quantity ? `(${a.quantity})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Sélecteur DESTINATION ─── */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Vers (destination)</p>
            <select
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
              value={transferTo}
              onChange={e => { setTransferTo(e.target.value); setTransferToCrypto('') }}
            >
              <option value="">Choisir</option>
              <optgroup label="Comptes">
                {store.accounts.map(a => (
                  <option key={a.id} value={`acc:${a.id}`}>{a.name}</option>
                ))}
              </optgroup>
              {cryptoAssets.length > 0 && (
                <optgroup label="Cryptos">
                  <option value="__crypto__">🪙 Cryptos (choisir la monnaie ci-dessous)</option>
                </optgroup>
              )}
              {nonCryptoAssets.length > 0 && (
                <optgroup label="Autres actifs">
                  {nonCryptoAssets.map(a => (
                    <option key={a.id} value={`asset:${a.id}`}>{ASSET_TYPE_ICONS[a.type] || '📦'} {a.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {/* Sub-sélection crypto destination */}
            {transferTo === '__crypto__' && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cryptoAssets.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setTransferToCrypto(a.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${transferToCrypto === a.id ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'bg-muted/40 text-muted-foreground border border-border/30'}`}
                  >
                    🪙 {a.symbol || a.name} {a.quantity ? `(${a.quantity})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Résumé du transfert */}
          {transferFromResolved && transferToResolved && transferFromResolved !== transferToResolved && (
            <div className="flex items-center gap-2 bg-amber-500/10 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-300 font-medium truncate">{targetLabel(transferFrom, transferFromCrypto)}</span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300 font-medium truncate">{targetLabel(transferTo, transferToCrypto)}</span>
            </div>
          )}

          {/* Montant + Frais */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Montant</p>
              <input
                type="number" inputMode="decimal"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="0 €"
                value={transferAmount}
                onFocus={e => e.target.select()}
                onChange={e => setTransferAmount(e.target.value)}
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Frais (optionnel)</p>
              <input
                type="number" inputMode="decimal"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="0 €"
                value={transferFees}
                onFocus={e => e.target.select()}
                onChange={e => setTransferFees(e.target.value)}
              />
            </div>
          </div>
          {Number(transferFees) > 0 && (
            <p className="text-[10px] text-amber-300 -mt-1">Les frais seront comptabilisés automatiquement en dépense (frais bancaires)</p>
          )}

          <input
            type="date"
            className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
            value={transferDate}
            max={todayISO()}
            onChange={e => setTransferDate(e.target.value)}
          />

          <input
            className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Libellé (ex: Achat XRP via Binance)"
            value={transferLabel}
            onChange={e => setTransferLabel(e.target.value)}
          />

          <div className="flex gap-2">
            <button onClick={resetTransfer} className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground bg-muted/30">Annuler</button>
            <button
              onClick={handleTransfer}
              disabled={!transferValid}
              className="flex-2 basis-0 grow-[2] bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              Enregistrer le transfert
            </button>
          </div>
        </FinanceCard>
      )}

      {/* Add form */}
      {showForm && (
        <FinanceCard className="space-y-3">
          <input
            className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder={direction === 'income' ? 'Nom Prénom / Libellé' : 'Libellé'}
            value={label}
            onChange={e => setLabel(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
          />
          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Montant €" type="number" inputMode="decimal" value={amount} onFocus={e => e.target.select()} onChange={e => setAmount(e.target.value)} />

          {/* Date */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Date</p>
            <input
              type="date"
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
              value={txDate}
              max={todayISO()}
              onChange={e => setTxDate(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {(['income', 'expense'] as const).map(d => (
              <button key={d} onClick={() => setDirection(d)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${direction === d ? (d === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-destructive/20 text-destructive') : 'bg-muted/30 text-muted-foreground'}`}>
                {d === 'income' ? 'Revenu' : 'Dépense'}
              </button>
            ))}
          </div>

          {/* Revenue-specific fields */}
          {direction === 'income' && (
            <>
              <div className="border-t border-border/30 pt-3">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-2">Détails du revenu</p>
              </div>

              <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={revenueSource} onChange={e => setRevenueSource(e.target.value as RevenueSource)}>
                {Object.entries(REVENUE_SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>

              <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={revenueType} onChange={e => setRevenueType(e.target.value as RevenueType)}>
                {Object.entries(REVENUE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>

              {/* Mode de paiement — 3 modes */}
              <div className="relative flex bg-muted/40 rounded-xl p-1">
                <div
                  className="absolute top-1 bottom-1 rounded-lg bg-primary/20 transition-all duration-200"
                  style={{
                    left: `calc(4px + ${['unique','recurrent','installment'].indexOf(paymentMode)} * (100% - 8px) / 3)`,
                    width: 'calc((100% - 8px) / 3)',
                  }}
                />
                {([
                  { key: 'unique', label: 'Unique' },
                  { key: 'recurrent', label: '🔄 Récurrent' },
                  { key: 'installment', label: '📊 En x fois' },
                ] as const).map(m => (
                  <button
                    key={m.key}
                    onClick={() => {
                      setPaymentMode(m.key)
                      if (m.key === 'unique') setRevenueRecurrence('unique')
                      if (m.key === 'recurrent') setRevenueRecurrence('mensuelle')
                      if (m.key === 'installment') setRevenueRecurrence('mensuelle')
                    }}
                    className={`relative flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors z-10 ${paymentMode === m.key ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMode === 'recurrent' && (
                <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={revenueRecurrence} onChange={e => setRevenueRecurrence(e.target.value as RevenueRecurrence)}>
                  <option value="mensuelle">Mensuelle</option>
                  <option value="hebdomadaire">Hebdomadaire</option>
                </select>
              )}

              {paymentMode === 'installment' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Total €</p>
                      <input
                        className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                        placeholder="ex: 900"
                        type="number" inputMode="decimal"
                        value={installmentTotal}
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          setInstallmentTotal(e.target.value)
                          const n = Number(installmentCount) || 0
                          if (n > 0 && Number(e.target.value) > 0)
                            setAmount(String(Math.round((Number(e.target.value) / n) * 100) / 100))
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Nb de versements</p>
                      <input
                        className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                        placeholder="ex: 3"
                        type="number" inputMode="numeric"
                        value={installmentCount}
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          setInstallmentCount(e.target.value)
                          const total = Number(installmentTotal) || 0
                          const n = Number(e.target.value) || 0
                          if (n > 0 && total > 0)
                            setAmount(String(Math.round((total / n) * 100) / 100))
                        }}
                      />
                    </div>
                  </div>
                  {Number(installmentTotal) > 0 && Number(installmentCount) > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Ce versement</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-400">
                          {formatCurrency(Math.round((Number(installmentTotal) / Number(installmentCount)) * 100) / 100)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1.5">× {installmentCount} = {formatCurrency(Number(installmentTotal))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${isRealRevenue ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                <Info className="w-3.5 h-3.5" />
                {isRealRevenue ? 'Compté dans les revenus' : 'Entrée d\'argent non comptée comme revenu réel'}
              </div>

              {/* Be Activ specific fields */}
              {revenueSource === 'be_activ' && (
                <div className="space-y-2 border-t border-border/30 pt-3">
                  <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Détails Be Activ</p>

                  {/* Business offer chip picker */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Offre Business</p>
                    <div className="flex flex-wrap gap-1.5">
                      {BUSINESS_OFFERS.map(offer => (
                        <button
                          key={offer.id}
                          onClick={() => {
                            setBaBusinessOfferId(baBusinessOfferId === offer.id ? '' : offer.id)
                            if (offer.catalogPrice > 0) setBaCatalogPriceSnapshot(String(offer.catalogPrice))
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${baBusinessOfferId === offer.id ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40' : 'bg-muted/40 text-muted-foreground border border-border/30'}`}
                        >
                          {offer.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catalog price */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Prix standard catalogue €</p>
                    <input
                      type="number" inputMode="decimal"
                      className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      placeholder="0"
                      value={baCatalogPriceSnapshot}
                      onFocus={e => e.target.select()}
                      onChange={e => setBaCatalogPriceSnapshot(e.target.value)}
                    />
                  </div>

                  {/* Variance display */}
                  {baCatalogPriceSnapshot && Number(baCatalogPriceSnapshot) > 0 && Number(amount) > 0 && (() => {
                    const diff = Number(amount) - Number(baCatalogPriceSnapshot)
                    const pct = Math.round((diff / Number(baCatalogPriceSnapshot)) * 100)
                    return (
                      <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${diff < 0 ? 'bg-amber-500/10 text-amber-400' : diff > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <span>Écart catalogue</span>
                        <span className="font-bold">{diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({pct >= 0 ? '+' : ''}{pct}%)</span>
                      </div>
                    )
                  })()}

                  <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={baChannel} onChange={e => setBaChannel(e.target.value as BeActivChannel)}>
                    <option value="">Canal d'encaissement</option>
                    {Object.entries(BE_ACTIV_CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={baPayment} onChange={e => setBaPayment(e.target.value as BeActivPaymentMode)}>
                    <option value="">Mode de paiement</option>
                    {Object.entries(BE_ACTIV_PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={baStatus} onChange={e => setBaStatus(e.target.value as BeActivStatus)}>
                    {Object.entries(BE_ACTIV_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={() => setBaIsInstallment(!baIsInstallment)} className={`w-full py-2 rounded-xl text-xs font-medium ${baIsInstallment ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                    {baIsInstallment ? '✓ Paiement en plusieurs fois' : 'Paiement en plusieurs fois ?'}
                  </button>
                  {baIsInstallment && (
                    <div className="grid grid-cols-2 gap-2">
                      <input className="bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Total base €" type="number" value={baTotalAmount} onChange={e => setBaTotalAmount(e.target.value)} />
                      <input className="bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="ex: 1/2, 2/3" value={baInstallmentLabel} onChange={e => setBaInstallmentLabel(e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex gap-2">
            {(['bank', 'cash'] as const).map(s => (
              <button key={s} onClick={() => setSourceType(s)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${sourceType === s ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                {s === 'bank' ? 'Bancaire' : 'Liquide'}
              </button>
            ))}
          </div>

          <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={accountId} onChange={e => setAccountId(e.target.value)}>
            {formAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {store.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} />

          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground bg-muted/30">Annuler</button>
            <button onClick={handleSubmit} className="flex-2 basis-0 grow-[2] text-primary-foreground rounded-xl py-2.5 text-sm font-semibold bg-primary">Enregistrer</button>
          </div>
        </FinanceCard>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigateMonth(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(filterMonth)}</span>
        <button onClick={() => navigateMonth(1)} disabled={filterMonth >= getCurrentMonthKey()} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Account sub-filter */}
      <select className="w-full bg-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
        <option value="">Tous les comptes</option>
        {store.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {/* Transaction list */}
      <div className="space-y-2">
        {filtered.map(t => {
          const isTransfer = t.revenueType === 'transfert_interne' || t.note === 'Transfert interne'
          return (
            <FinanceCard key={t.id} className={isTransfer ? 'border border-amber-500/10' : ''}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isTransfer ? 'bg-amber-500/10' : t.direction === 'income' ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                  {isTransfer ? <ArrowLeftRight className="w-4 h-4 text-amber-400" /> : t.direction === 'income' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTxDate(t.date)} · {getAccountName(t.accountId)} · {getCategoryName(t.categoryId)}
                  </p>
                  {isTransfer && (
                    <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">Transfert interne</span>
                  )}
                  {!isTransfer && t.direction === 'income' && t.isRealRevenue === false && (
                    <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">Non comptée comme revenu</span>
                  )}
                  {t.beActivDetails && (() => {
                    const ba = t.beActivDetails!
                    const offerName = ba.business_offer_name
                      || (ba.business_offer_id ? BUSINESS_OFFERS.find(o => o.id === ba.business_offer_id)?.name : null)
                      || (ba.offer ? resolveLegacyOffer(ba.offer)?.name : null)
                      || ba.offer || ''
                    const needsLink = !ba.business_offer_id
                    const variance = (ba.catalog_price_snapshot && ba.actual_amount)
                      ? ba.actual_amount - ba.catalog_price_snapshot
                      : null
                    return (
                      <div className="mt-0.5 space-y-0.5">
                        <p className="text-[10px] text-blue-400">
                          {ba.client}{offerName ? ` · ${offerName}` : ''}
                          {ba.status ? ` · ${BE_ACTIV_STATUS_LABELS[ba.status] || ba.status}` : ''}
                        </p>
                        {ba.catalog_price_snapshot && ba.actual_amount && (
                          <p className="text-[10px] text-muted-foreground/70">
                            Catalogue {formatCurrency(ba.catalog_price_snapshot)} · Encaissé {formatCurrency(ba.actual_amount)}
                            {variance !== null && variance !== 0 && (
                              <span className={variance < 0 ? ' text-amber-400' : ' text-emerald-400'}>
                                {' '}{variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                              </span>
                            )}
                          </p>
                        )}
                        {needsLink && (
                          <span className="inline-block text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">⚠ À lier au catalogue Business</span>
                        )}
                      </div>
                    )
                  })()}
                  {t.note && !isTransfer && <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{t.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold ${isTransfer ? 'text-amber-400' : t.direction === 'income' ? 'text-emerald-500' : 'text-destructive'}`}>
                    {isTransfer ? '' : t.direction === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <button onClick={() => onDelete(t.id)} className="text-muted-foreground active:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </FinanceCard>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune transaction ce mois
          </p>
        )}
      </div>
    </div>
  )
}
