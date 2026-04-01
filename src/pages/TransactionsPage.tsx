import React, { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, ArrowUpRight, ArrowDownRight, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel, getPreviousMonthKey, REVENUE_SOURCE_LABELS, REVENUE_TYPE_LABELS, REVENUE_RECURRENCE_LABELS, BE_ACTIV_OFFER_LABELS, BE_ACTIV_CHANNEL_LABELS, BE_ACTIV_PAYMENT_LABELS, BE_ACTIV_STATUS_LABELS } from '@/lib/constants'
import { NON_REAL_REVENUE_TYPES } from '@/types/finance'
import type { FinanceStore, Transaction, RevenueSource, RevenueType, RevenueRecurrence, BeActivDetails, BeActivOffer, BeActivChannel, BeActivPaymentMode, BeActivStatus } from '@/types/finance'

interface Props {
  store: FinanceStore
  onAdd: (t: Transaction) => void
  onDelete: (id: string) => void
}

export const TransactionsPage: React.FC<Props> = ({ store, onAdd, onDelete }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showForm, setShowForm] = useState(false)
  const [scope, setScope] = useState<'pro' | 'perso' | null>(null)
  const [filterMonth, setFilterMonth] = useState(getCurrentMonthKey())
  const [filterAccount, setFilterAccount] = useState('')

  // Auto-open form when navigating to /transactions/new
  useEffect(() => {
    if (location.pathname === '/transactions/new') {
      setShowForm(true)
    }
  }, [location.pathname])

  const navigateMonth = (dir: number) => {
    const [y, m] = filterMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Form state
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<'income' | 'expense'>('expense')
  const [sourceType, setSourceType] = useState<'bank' | 'cash'>('bank')
  const [accountId, setAccountId] = useState(store.accounts[0]?.id || '')
  const [categoryId, setCategoryId] = useState(store.categories[0]?.id || '')
  const [note, setNote] = useState('')

  // Revenue fields
  const [revenueSource, setRevenueSource] = useState<RevenueSource>('autre')
  const [revenueType, setRevenueType] = useState<RevenueType>('autre_revenu')
  const [revenueRecurrence, setRevenueRecurrence] = useState<RevenueRecurrence>('unique')
  // Installment mode (replaces recurrence)
  const [installmentMode, setInstallmentMode] = useState(false)
  const [installmentTotal, setInstallmentTotal] = useState('')
  const [installmentCount, setInstallmentCount] = useState('')

  // Be Activ fields
  const [baClient, setBaClient] = useState('')
  const [baOffer, setBaOffer] = useState<BeActivOffer | ''>('')
  const [baChannel, setBaChannel] = useState<BeActivChannel | ''>('')
  const [baPayment, setBaPayment] = useState<BeActivPaymentMode | ''>('')
  const [baStatus, setBaStatus] = useState<BeActivStatus>('recu')
  const [baIsInstallment, setBaIsInstallment] = useState(false)
  const [baTotalAmount, setBaTotalAmount] = useState('')
  const [baInstallmentLabel, setBaInstallmentLabel] = useState('')

  const isRealRevenue = !NON_REAL_REVENUE_TYPES.includes(revenueType)

  const filtered = useMemo(() => {
    return store.transactions
      .filter(t => t.monthKey === filterMonth)
      .filter(t => !filterAccount || t.accountId === filterAccount)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [store.transactions, filterMonth, filterAccount])

  const handleSubmit = () => {
    if (!label || !amount) return
    const tx: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      label,
      amount: Number(amount),
      direction,
      sourceType,
      accountId,
      categoryId,
      monthKey: getCurrentMonthKey(),
      note: installmentMode && installmentCount
        ? `${note ? note + ' · ' : ''}${installmentCount} versements · total ${formatCurrency(Number(installmentTotal))}`
        : note,
      isRecurring: installmentMode || revenueRecurrence === 'mensuelle' || revenueRecurrence === 'hebdomadaire',
    }

    if (direction === 'income') {
      tx.revenueSource = revenueSource
      tx.revenueType = revenueType
      tx.revenueRecurrence = installmentMode ? 'mensuelle' : revenueRecurrence
      tx.isRealRevenue = isRealRevenue

      if (revenueSource === 'be_activ') {
        tx.beActivDetails = {
          client: baClient,
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

  const scopedAccounts = scope === 'pro'
    ? store.accounts.filter(a => a.type === 'pro')
    : scope === 'perso'
    ? store.accounts.filter(a => a.type !== 'pro')
    : store.accounts

  const handleScopeSelect = (s: 'pro' | 'perso') => {
    setScope(s)
    const filtered = s === 'pro'
      ? store.accounts.filter(a => a.type === 'pro')
      : store.accounts.filter(a => a.type !== 'pro')
    if (filtered.length > 0) setAccountId(filtered[0].id)
  }

  const resetForm = () => {
    setLabel(''); setAmount(''); setNote(''); setShowForm(false); setScope(null)
    setRevenueSource('autre'); setRevenueType('autre_revenu'); setRevenueRecurrence('unique')
    setInstallmentMode(false); setInstallmentTotal(''); setInstallmentCount('')
    setBaClient(''); setBaOffer(''); setBaChannel(''); setBaPayment(''); setBaStatus('recu')
    setBaIsInstallment(false); setBaTotalAmount(''); setBaInstallmentLabel('')
  }

  const getAccountName = (id: string) => store.accounts.find(a => a.id === id)?.name || ''
  const getCategoryName = (id: string) => {
    const cat = store.categories.find(c => c.id === id)
    return cat ? `${cat.icon} ${cat.name}` : ''
  }

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Transactions</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {showForm && scope === null && (
        <FinanceCard>
          <p className="text-sm font-semibold text-foreground mb-4 text-center">C'est pour...</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleScopeSelect('perso')}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 active:bg-emerald-500/20">
              <span className="text-3xl">👤</span>
              <span className="text-sm font-semibold">Perso</span>
            </button>
            <button onClick={() => handleScopeSelect('pro')}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 active:bg-blue-500/20">
              <span className="text-3xl">💼</span>
              <span className="text-sm font-semibold">Pro</span>
            </button>
          </div>
          <button onClick={() => setShowForm(false)} className="w-full mt-3 py-2 rounded-xl text-sm text-muted-foreground bg-muted/30">Annuler</button>
        </FinanceCard>
      )}

      {showForm && scope !== null && (
        <FinanceCard className="space-y-3">
          <div className="flex items-center gap-2 pb-1">
            <span className="text-lg">{scope === 'pro' ? '💼' : '👤'}</span>
            <span className="text-sm font-semibold text-foreground">{scope === 'pro' ? 'Professionnel' : 'Personnel'}</span>
            <button onClick={() => setScope(null)} className="ml-auto text-xs text-muted-foreground px-2 py-0.5 rounded-lg bg-muted/30">Changer</button>
          </div>
          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Libellé" value={label} onChange={e => setLabel(e.target.value)} />
          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Montant €" type="number" inputMode="decimal" value={amount} onFocus={e => e.target.select()} onChange={e => setAmount(e.target.value)} />

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

              {/* Paiement : unique ou en x fois */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setInstallmentMode(false); setRevenueRecurrence('unique') }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${!installmentMode ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}
                >
                  Paiement unique
                </button>
                <button
                  onClick={() => { setInstallmentMode(true); setRevenueRecurrence('mensuelle') }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${installmentMode ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}
                >
                  En plusieurs fois
                </button>
              </div>

              {installmentMode ? (
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
                          if (n > 0 && Number(e.target.value) > 0) setAmount(String(Math.round((Number(e.target.value) / n) * 100) / 100))
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
                          if (n > 0 && total > 0) setAmount(String(Math.round((total / n) * 100) / 100))
                        }}
                      />
                    </div>
                  </div>
                  {Number(installmentTotal) > 0 && Number(installmentCount) > 0 && (
                    <div className="bg-emerald-500/10 rounded-xl px-3 py-2 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Ce versement</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCurrency(Math.round((Number(installmentTotal) / Number(installmentCount)) * 100) / 100)} × {installmentCount}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={revenueRecurrence} onChange={e => setRevenueRecurrence(e.target.value as RevenueRecurrence)}>
                  {Object.entries(REVENUE_RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              )}

              {/* Real revenue indicator */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${isRealRevenue ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                <Info className="w-3.5 h-3.5" />
                {isRealRevenue ? 'Compté dans les revenus' : 'Entrée d\'argent non comptée comme revenu réel'}
              </div>

              {/* Be Activ specific fields */}
              {revenueSource === 'be_activ' && (
                <div className="space-y-2 border-t border-border/30 pt-3">
                  <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Détails Be Activ</p>
                  <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Client, Groupe ou Cours" value={baClient} onChange={e => setBaClient(e.target.value)} />
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

                  {/* Installment */}
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
            {scopedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {store.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} />
          <button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold">Enregistrer</button>
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

      {/* Account filter */}
      <div className="flex gap-2">
        <select className="flex-1 bg-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
          <option value="">Tous les comptes</option>
          {store.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(t => (
          <FinanceCard key={t.id}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.direction === 'income' ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                {t.direction === 'income' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.label}</p>
                <p className="text-xs text-muted-foreground">{getAccountName(t.accountId)} · {getCategoryName(t.categoryId)}</p>
                {t.direction === 'income' && t.isRealRevenue === false && (
                  <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">Non comptée comme revenu</span>
                )}
                {t.beActivDetails && (
                  <p className="text-[10px] text-blue-400 mt-0.5">
                    {t.beActivDetails.client}{t.beActivDetails.offer ? ` · ${BE_ACTIV_OFFER_LABELS[t.beActivDetails.offer as keyof typeof BE_ACTIV_OFFER_LABELS] || ''}` : ''}
                    {t.beActivDetails.status ? ` · ${BE_ACTIV_STATUS_LABELS[t.beActivDetails.status as keyof typeof BE_ACTIV_STATUS_LABELS] || ''}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-bold ${t.direction === 'income' ? 'text-emerald-500' : 'text-destructive'}`}>
                  {t.direction === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </p>
                <button onClick={() => onDelete(t.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </FinanceCard>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune transaction ce mois</p>}
      </div>
    </div>
  )
}
