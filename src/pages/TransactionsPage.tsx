import React, { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, ArrowUpRight, ArrowDownRight, Info, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, REVENUE_SOURCE_LABELS, REVENUE_TYPE_LABELS, BE_ACTIV_OFFER_LABELS, BE_ACTIV_CHANNEL_LABELS, BE_ACTIV_PAYMENT_LABELS, BE_ACTIV_STATUS_LABELS } from '@/lib/constants'
import { NON_REAL_REVENUE_TYPES } from '@/types/finance'
import type { FinanceStore, Transaction, RevenueSource, RevenueType, RevenueRecurrence, BeActivOffer, BeActivChannel, BeActivPaymentMode, BeActivStatus } from '@/types/finance'

interface Props {
  store: FinanceStore
  onAdd: (t: Transaction) => void
  onDelete: (id: string) => void
}

const todayISO = () => new Date().toISOString().split('T')[0]

const formatTxDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export const TransactionsPage: React.FC<Props> = ({ store, onAdd, onDelete }) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Header-level scope toggle — drives both the list filter AND the add form
  const [filterScope, setFilterScope] = useState<'perso' | 'pro'>('perso')


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
  const [formScope, setFormScope] = useState<'perso' | 'pro'>('perso')

  // Revenue fields
  const [revenueSource, setRevenueSource] = useState<RevenueSource>('autre')
  const [revenueType, setRevenueType] = useState<RevenueType>('autre_revenu')
  const [revenueRecurrence, setRevenueRecurrence] = useState<RevenueRecurrence>('unique')
  const [paymentMode, setPaymentMode] = useState<'unique' | 'recurrent' | 'installment'>('unique')
  const [installmentTotal, setInstallmentTotal] = useState('')
  const [installmentCount, setInstallmentCount] = useState('')

  // Be Activ fields

  const [baOffer, setBaOffer] = useState<BeActivOffer | ''>('')
  const [baChannel, setBaChannel] = useState<BeActivChannel | ''>('')
  const [baPayment, setBaPayment] = useState<BeActivPaymentMode | ''>('')
  const [baStatus, setBaStatus] = useState<BeActivStatus>('recu')
  const [baIsInstallment, setBaIsInstallment] = useState(false)
  const [baTotalAmount, setBaTotalAmount] = useState('')
  const [baInstallmentLabel, setBaInstallmentLabel] = useState('')

  const isRealRevenue = !NON_REAL_REVENUE_TYPES.includes(revenueType)

  // Transfer interne state
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferFees, setTransferFees] = useState('')
  const [transferDate, setTransferDate] = useState(todayISO())
  const [transferLabel, setTransferLabel] = useState('')

  const resetTransfer = () => {
    setShowTransfer(false)
    setTransferFrom(''); setTransferTo('')
    setTransferAmount(''); setTransferFees(''); setTransferLabel('')
    setTransferDate(todayISO())
  }

  const handleTransfer = () => {
    if (!transferAmount || !transferFrom || !transferTo || transferFrom === transferTo) return
    const amt = Number(transferAmount)
    const fees = Number(transferFees) || 0
    if (!amt) return
    const dateMonthKey = transferDate.substring(0, 7)
    const fromAcc = store.accounts.find(a => a.id === transferFrom)
    const toAcc = store.accounts.find(a => a.id === transferTo)
    const lbl = transferLabel || `Transfert ${fromAcc?.name || ''} → ${toAcc?.name || ''}`
    // Find "Frais" category or fallback to first
    const fraisCategory = store.categories.find(c =>
      c.name.toLowerCase().includes('frais') || c.name.toLowerCase().includes('banque')
    ) || store.categories[0]
    const base: Omit<Transaction, 'id' | 'direction' | 'accountId' | 'label'> = {
      date: new Date(transferDate + 'T12:00:00').toISOString(),
      amount: amt,
      sourceType: 'bank',
      categoryId: store.categories[0]?.id || '',
      monthKey: dateMonthKey,
      note: 'Transfert interne',
      isRecurring: false,
      revenueType: 'transfert_interne',
      isRealRevenue: false,
    }
    // Sortie du compte source
    onAdd({ ...base, id: crypto.randomUUID(), direction: 'expense', accountId: transferFrom, label: `${lbl} (sortie)` })
    // Entrée sur le compte destination
    onAdd({ ...base, id: crypto.randomUUID(), direction: 'income', accountId: transferTo, label: `${lbl} (entrée)`, revenueSource: 'virement_interne' })
    // Frais bancaires (si renseignés)
    if (fees > 0) {
      onAdd({
        id: crypto.randomUUID(),
        date: new Date(transferDate + 'T12:00:00').toISOString(),
        label: `Frais — ${lbl}`,
        amount: fees,
        direction: 'expense',
        sourceType: 'bank',
        accountId: transferFrom,
        categoryId: fraisCategory?.id || store.categories[0]?.id || '',
        monthKey: dateMonthKey,
        note: 'Frais de transfert',
        isRecurring: false,
      })
    }
    resetTransfer()
  }

  const scopeAccounts = (s: 'perso' | 'pro') =>
    s === 'pro'
      ? store.accounts.filter(a => a.type === 'pro')
      : store.accounts.filter(a => a.type !== 'pro')

  const openForm = (targetScope = filterScope) => {
    const accs = scopeAccounts(targetScope)
    setFormScope(targetScope)
    setAccountId(accs[0]?.id || store.accounts[0]?.id || '')
    setShowForm(true)
  }

  const changeFormScope = (s: 'perso' | 'pro') => {
    setFormScope(s)
    const accs = scopeAccounts(s)
    setAccountId(accs[0]?.id || '')
  }

  const resetForm = () => {
    setLabel(''); setAmount(''); setNote(''); setShowForm(false)
    setTxDate(todayISO())
    setRevenueSource('autre'); setRevenueType('autre_revenu'); setRevenueRecurrence('unique')
    setPaymentMode('unique'); setInstallmentTotal(''); setInstallmentCount('')
    setBaOffer(''); setBaChannel(''); setBaPayment(''); setBaStatus('recu')
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
        tx.beActivDetails = {
          client: label,
          offer: baOffer,
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

  const formAccounts = scopeAccounts(formScope)

  const filtered = useMemo(() => {
    const scopeIds = new Set(scopeAccounts(filterScope).map(a => a.id))
    return store.transactions
      .filter(t => t.monthKey === filterMonth)
      .filter(t => scopeIds.has(t.accountId))
      .filter(t => !filterAccount || t.accountId === filterAccount)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [store.transactions, filterMonth, filterScope, filterAccount, store.accounts]) // eslint-disable-line react-hooks/exhaustive-deps

  const getAccountName = (id: string) => store.accounts.find(a => a.id === id)?.name || ''
  const getCategoryName = (id: string) => {
    const cat = store.categories.find(c => c.id === id)
    return cat ? `${cat.icon} ${cat.name}` : ''
  }

  const isPerso = filterScope === 'perso'

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-white shrink-0">Transactions</h1>

        {/* Neon Perso / Pro toggle */}
        <div className="flex items-center bg-muted/30 rounded-xl p-0.5 gap-0.5 flex-1 max-w-[140px] mx-auto">
          <button
            onClick={() => { setFilterScope('perso'); setFilterAccount('') }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${isPerso
              ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.35)]'
              : 'text-muted-foreground'}`}
          >
            Perso
          </button>
          <button
            onClick={() => { setFilterScope('pro'); setFilterAccount('') }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!isPerso
              ? 'bg-violet-500/20 text-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.35)]'
              : 'text-muted-foreground'}`}
          >
            Pro
          </button>
        </div>

        <button
          onClick={() => { resetForm(); setShowTransfer(v => !v) }}
          className={`flex items-center gap-1.5 px-2.5 h-9 rounded-xl shrink-0 transition-colors text-xs font-semibold border ${showTransfer ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-muted/40 text-muted-foreground border-border/30'}`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Transfert</span>
        </button>
        <button
          onClick={() => { resetTransfer(); showForm ? resetForm() : openForm() }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground shrink-0 transition-colors ${isPerso ? 'bg-cyan-500' : 'bg-violet-500'}`}
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
              <p className="text-[10px] text-muted-foreground">Mouvement entre comptes — ne compte pas dans les revenus</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">De (source)</p>
              <select
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                value={transferFrom}
                onChange={e => setTransferFrom(e.target.value)}
              >
                <option value="">Choisir</option>
                {store.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Vers (destination)</p>
              <select
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                value={transferTo}
                onChange={e => setTransferTo(e.target.value)}
              >
                <option value="">Choisir</option>
                {store.accounts.filter(a => a.id !== transferFrom).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

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
            placeholder="Libellé (ex: Virement Bourso → JiBET)"
            value={transferLabel}
            onChange={e => setTransferLabel(e.target.value)}
          />

          {transferFrom && transferTo && transferFrom === transferTo && (
            <p className="text-xs text-rose-400 text-center">Les deux comptes doivent être différents</p>
          )}

          <div className="flex gap-2">
            <button onClick={resetTransfer} className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground bg-muted/30">Annuler</button>
            <button
              onClick={handleTransfer}
              disabled={!transferAmount || !transferFrom || !transferTo || transferFrom === transferTo}
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
          {/* Scope badge */}
          <div className="flex items-center gap-2 pb-1">
            <span className="text-lg">{formScope === 'pro' ? '💼' : '👤'}</span>
            <span className={`text-sm font-semibold ${formScope === 'perso' ? 'text-cyan-400' : 'text-violet-400'}`}>
              {formScope === 'pro' ? 'Professionnel' : 'Personnel'}
            </span>
            <button
              onClick={() => changeFormScope(formScope === 'pro' ? 'perso' : 'pro')}
              className="ml-auto text-xs text-muted-foreground px-2 py-0.5 rounded-lg bg-muted/30"
            >
              Changer
            </button>
          </div>

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
                  <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={baOffer} onChange={e => setBaOffer(e.target.value as BeActivOffer)}>
                    <option value="">Offre / prestation</option>
                    {Object.entries(BE_ACTIV_OFFER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
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
            <button onClick={handleSubmit} className={`flex-2 basis-0 grow-[2] text-primary-foreground rounded-xl py-2.5 text-sm font-semibold ${formScope === 'perso' ? 'bg-cyan-500' : 'bg-violet-500'}`}>Enregistrer</button>
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
        <option value="">Tous les comptes {filterScope === 'perso' ? 'perso' : 'pro'}</option>
        {scopeAccounts(filterScope).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
                  {t.beActivDetails && (
                    <p className="text-[10px] text-blue-400 mt-0.5">
                      {t.beActivDetails.client}{t.beActivDetails.offer ? ` · ${BE_ACTIV_OFFER_LABELS[t.beActivDetails.offer as keyof typeof BE_ACTIV_OFFER_LABELS] || ''}` : ''}
                      {t.beActivDetails.status ? ` · ${BE_ACTIV_STATUS_LABELS[t.beActivDetails.status as keyof typeof BE_ACTIV_STATUS_LABELS] || ''}` : ''}
                    </p>
                  )}
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
            Aucune transaction {filterScope === 'perso' ? 'perso' : 'pro'} ce mois
          </p>
        )}
      </div>
    </div>
  )
}
