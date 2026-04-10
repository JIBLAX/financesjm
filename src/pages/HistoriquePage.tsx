import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, X, Check, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/constants'
import type { FinanceStore, MonthlySnapshot, Account } from '@/types/finance'

interface Props {
  store: FinanceStore
  onSaveSnapshot: (s: MonthlySnapshot) => void
}

// April 2026 = first month with connected data
const AUTO_FROM = '2026-04'

// ── Bilan Account Groups ─────────────────────────────────────────────────────
const BILAN_COVERED_IDS = ['qonto', 'bunq-fiscal']
const BILAN_COVERED_GROUPS = ['Vie', 'Réserve', 'Urgence', 'Voyage', 'Projet']

const BILAN_ACCOUNT_GROUPS = [
  { key: 'jm_be_activ',      label: 'JM BE ACTIV',      emoji: '💪', filter: (a: Account) => a.id === 'qonto' },
  { key: 'vie',              label: 'VIE',               emoji: '🏠', filter: (a: Account) => a.group === 'Vie' },
  { key: 'epargne',          label: 'Épargne',           emoji: '💰', filter: (a: Account) => a.group === 'Réserve' || a.group === 'Urgence' },
  { key: 'voyage',           label: 'Voyage',            emoji: '✈️', filter: (a: Account) => a.group === 'Voyage' },
  { key: 'projet',           label: 'Projet',            emoji: '🎯', filter: (a: Account) => a.group === 'Projet' },
  { key: 'reserve_fiscale',  label: 'Réserve Fiscale',   emoji: '📋', filter: (a: Account) => a.id === 'bunq-fiscal' },
  { key: 'autres_comptes',   label: 'Autres Comptes',    emoji: '🏦', filter: (a: Account) => !BILAN_COVERED_IDS.includes(a.id) && !BILAN_COVERED_GROUPS.includes(a.group || '') },
]

// ── Asset classes for bilan ──────────────────────────────────────────────────
const ASSET_CLASSES = [
  { key: 'crypto',        label: 'Cryptos',           emoji: '🪙' },
  { key: 'assurance_vie', label: 'Assurance Vie',     emoji: '🛡️' },
  { key: 'actions_etf',   label: 'Actions ETF',       emoji: '📈' },
  { key: 'immobilier',    label: 'Immobilier',        emoji: '🏠' },
  { key: 'paris_sportif', label: 'Bankrol JIBET',     emoji: '🎰' },
  { key: 'autres',        label: 'Autres Actifs',     emoji: '📦' },
]

// Asset type → class key
const ASSET_TYPE_TO_CLASS: Record<string, string> = {
  crypto:          'crypto',
  assurance_vie:   'assurance_vie',
  livret_epargne:  'livret',
  actions:         'actions_etf',
  etf:             'actions_etf',
  immobilier:      'immobilier',
  compte_bancaire: 'cash',
  vehicule:        'autres',
  objet_valeur:    'autres',
  autre_actif:     'autres',
  paris_sportif:   'paris_sportif',
}

// Account type → asset class
const ACCOUNT_TYPE_TO_CLASS: Record<string, string> = {
  courant:        'cash',
  liquide:        'cash',
  pro:            'cash',
  investissement: 'cash',
  livret:         'livret',
  epargne_projet: 'livret',
}

function getAllMonthKeys(): string[] {
  const keys: string[] = []
  const start = new Date(2026, 0)
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth())
  const d = new Date(start)
  while (d <= end) {
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  return keys.reverse()
}

interface FormState {
  totalIncomePerso: string
  totalIncomeCash: string
  totalRevenuesPro: string
  totalChargesPerso: string
  totalChargesPro: string
  totalDebts: string
  assetBreakdown: Record<string, string>
  accountBalances: Record<string, string>
  accountMissing: Record<string, boolean>
}

function emptyForm(): FormState {
  return {
    totalIncomePerso: '', totalIncomeCash: '', totalRevenuesPro: '',
    totalChargesPerso: '', totalChargesPro: '', totalDebts: '',
    assetBreakdown: {}, accountBalances: {}, accountMissing: {},
  }
}

const fmtN = (n: number) => n > 0 ? String(Math.round(n * 100) / 100) : ''

export const HistoriquePage: React.FC<Props> = ({ store, onSaveSnapshot }) => {
  const navigate = useNavigate()
  const months = useMemo(() => getAllMonthKeys(), [])
  const [editingMonth, setEditingMonth] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [autoFilled, setAutoFilled] = useState(false)
  const [showRevenueDetail, setShowRevenueDetail] = useState(false)
  const [showChargesDetail, setShowChargesDetail] = useState(false)

  const snapshotMap = useMemo(
    () => new Map(store.monthlySnapshots.map(s => [s.monthKey, s])),
    [store.monthlySnapshots]
  )

  const activeAccounts = useMemo(
    () => store.accounts.filter(a => a.isActive && a.type !== 'dette'),
    [store.accounts]
  )

  useEffect(() => {
    if (editingMonth !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [editingMonth])

  const buildAccountData = (monthKey: string): { balances: Record<string, string>; missing: Record<string, boolean> } => {
    const checkIn = store.monthlyCheckIns.find(ci => ci.monthKey === monthKey)
    const balances: Record<string, string> = {}
    const missing: Record<string, boolean> = {}
    activeAccounts.forEach(acc => {
      if (checkIn?.accountBalances?.[acc.id] !== undefined) {
        balances[acc.id] = String(checkIn.accountBalances[acc.id])
        missing[acc.id] = false
      } else if (monthKey >= AUTO_FROM) {
        balances[acc.id] = String(acc.currentBalance ?? 0)
        missing[acc.id] = false
      } else {
        balances[acc.id] = ''
        missing[acc.id] = true
      }
    })
    return { balances, missing }
  }

  const computeAutoData = (monthKey: string): FormState => {
    const ops = store.operations.filter(op => op.monthKey === monthKey && op.actual > 0)
    const txs = store.transactions.filter(t => t.monthKey === monthKey)
    const checkIn = store.monthlyCheckIns.find(ci => ci.monthKey === monthKey)

    const opsRevPerso  = ops.filter(op => op.family === 'revenu' && op.scope === 'perso').reduce((s, op) => s + op.actual, 0)
    const opsRevPro    = ops.filter(op => op.family === 'revenu' && op.scope === 'pro').reduce((s, op) => s + op.actual, 0)
    const opsCharPerso = ops.filter(op => op.family !== 'revenu' && op.scope === 'perso').reduce((s, op) => s + op.actual, 0)
    const opsCharPro   = ops.filter(op => op.family !== 'revenu' && op.scope === 'pro').reduce((s, op) => s + op.actual, 0)

    const txIncomeBank = txs.filter(t => t.direction === 'income' && t.sourceType === 'bank').reduce((s, t) => s + t.amount, 0)
    const txIncomeCash = txs.filter(t => t.direction === 'income' && t.sourceType === 'cash').reduce((s, t) => s + t.amount, 0)
    const txExpenses   = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)

    const incomePerso  = opsRevPerso  > 0 ? opsRevPerso  : txIncomeBank
    const incomeCash   = txIncomeCash
    const chargesPerso = opsCharPerso > 0 ? opsCharPerso : txExpenses
    const chargesPro   = opsCharPro
    const revenusPro   = opsRevPro

    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)

    const assetBreakdown: Record<string, string> = {}
    store.assets.forEach(a => {
      const cls = ASSET_TYPE_TO_CLASS[a.type]
      if (!cls) return
      const val = checkIn?.assetValues?.[a.id] ?? a.value
      if (val > 0) {
        const prev = parseFloat(assetBreakdown[cls] || '0') || 0
        assetBreakdown[cls] = fmtN(prev + val)
      }
    })

    return {
      totalIncomePerso:  fmtN(incomePerso),
      totalIncomeCash:   fmtN(incomeCash),
      totalRevenuesPro:  fmtN(revenusPro),
      totalChargesPerso: fmtN(chargesPerso),
      totalChargesPro:   fmtN(chargesPro),
      totalDebts:        totalDebts > 0 ? fmtN(totalDebts) : '',
      assetBreakdown,
      ...(() => { const d = buildAccountData(monthKey); return { accountBalances: d.balances, accountMissing: d.missing } })(),
    }
  }

  const openEdit = (monthKey: string) => {
    const existing = snapshotMap.get(monthKey)
    setShowRevenueDetail(false)
    setShowChargesDetail(false)

    if (existing) {
      const breakdown: Record<string, string> = {}
      Object.entries(existing.assetBreakdown || {}).forEach(([k, v]) => {
        if (k !== 'cash' && k !== 'livret') breakdown[k] = String(v)
      })
      // Restore per-account balances from saved snapshot if available,
      // otherwise fall back to check-in / current balance
      let accData: { balances: Record<string, string>; missing: Record<string, boolean> }
      if (existing.accountBalances && Object.keys(existing.accountBalances).length > 0) {
        const balances: Record<string, string> = {}
        const missing: Record<string, boolean> = {}
        activeAccounts.forEach(acc => {
          if (existing.accountBalances![acc.id] !== undefined) {
            balances[acc.id] = String(existing.accountBalances![acc.id])
            missing[acc.id] = false
          } else {
            balances[acc.id] = ''
            missing[acc.id] = true
          }
        })
        accData = { balances, missing }
      } else {
        accData = buildAccountData(monthKey)
      }
      setForm({
        totalIncomePerso:  existing.totalIncomeBank  > 0 ? String(existing.totalIncomeBank)  : '',
        totalIncomeCash:   existing.totalIncomeCash  > 0 ? String(existing.totalIncomeCash)  : '',
        totalRevenuesPro:  existing.totalRevenuesPro ? String(existing.totalRevenuesPro) : '',
        totalChargesPerso: existing.totalExpenses    > 0 ? String(existing.totalExpenses)    : '',
        totalChargesPro:   existing.totalChargesPro  ? String(existing.totalChargesPro)  : '',
        totalDebts:        existing.totalDebts       > 0 ? String(existing.totalDebts)       : '',
        assetBreakdown:    breakdown,
        accountBalances:   accData.balances,
        accountMissing:    accData.missing,
      })
      setAutoFilled(false)
    } else if (monthKey >= AUTO_FROM) {
      setForm(computeAutoData(monthKey))
      setAutoFilled(true)
    } else {
      const accData = buildAccountData(monthKey)
      setForm({ ...emptyForm(), accountBalances: accData.balances, accountMissing: accData.missing })
      setAutoFilled(false)
    }
    setEditingMonth(monthKey)
  }

  const handleSave = () => {
    if (!editingMonth) return

    const assetBreakdown: Record<string, number> = {}
    Object.entries(form.assetBreakdown).forEach(([k, v]) => {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) assetBreakdown[k] = n
    })

    activeAccounts.forEach(acc => {
      if (form.accountMissing[acc.id]) return
      const val = parseFloat(form.accountBalances[acc.id] || '0') || 0
      if (val <= 0) return
      const cls = ACCOUNT_TYPE_TO_CLASS[acc.type] || 'cash'
      assetBreakdown[cls] = (assetBreakdown[cls] || 0) + val
    })

    const totalAssets  = Object.values(assetBreakdown).reduce((s, v) => s + v, 0)
    const incomeBank   = parseFloat(form.totalIncomePerso)  || 0
    const incomeCash   = parseFloat(form.totalIncomeCash)   || 0
    const revenusPro   = parseFloat(form.totalRevenuesPro)  || 0
    const chargesPerso = parseFloat(form.totalChargesPerso) || 0
    const chargesPro   = parseFloat(form.totalChargesPro)   || 0
    const debts        = parseFloat(form.totalDebts)        || 0
    const existing     = snapshotMap.get(editingMonth)

    // Réserve Fiscale exclue du patrimoine net
    const reserveFiscaleAccounts = activeAccounts.filter(a => a.id === 'bunq-fiscal')
    let reserveFiscaleVal = 0
    reserveFiscaleAccounts.forEach(acc => {
      if (!form.accountMissing[acc.id]) {
        reserveFiscaleVal += parseFloat(form.accountBalances[acc.id] || '0') || 0
      }
    })

    // Save per-account balances so they can be restored on re-edit
    const savedAccountBalances: Record<string, number> = {}
    activeAccounts.forEach(acc => {
      if (!form.accountMissing[acc.id]) {
        savedAccountBalances[acc.id] = parseFloat(form.accountBalances[acc.id] || '0') || 0
      }
    })

    const snapshot: MonthlySnapshot = {
      id:               existing?.id || crypto.randomUUID(),
      monthKey:         editingMonth,
      totalIncomeBank:  incomeBank,
      totalIncomeCash:  incomeCash,
      totalRevenuesPro: revenusPro   || undefined,
      totalExpenses:    chargesPerso,
      totalChargesPro:  chargesPro   || undefined,
      totalAssets,
      totalDebts:       debts,
      netWorth:         totalAssets - debts - reserveFiscaleVal,
      isManual:         true,
      assetBreakdown,
      accountBalances:  Object.keys(savedAccountBalances).length > 0 ? savedAccountBalances : undefined,
      dismissed:        existing?.dismissed,
    }
    onSaveSnapshot(snapshot)
    setEditingMonth(null)
  }

  const setAssetVal = (key: string, val: string) =>
    setForm(f => ({ ...f, assetBreakdown: { ...f.assetBreakdown, [key]: val } }))

  const totalIncome  = (f: FormState) => (parseFloat(f.totalIncomePerso) || 0) + (parseFloat(f.totalIncomeCash) || 0) + (parseFloat(f.totalRevenuesPro) || 0)
  const totalCharges = (f: FormState) => (parseFloat(f.totalChargesPerso) || 0) + (parseFloat(f.totalChargesPro) || 0)
  const solde        = (f: FormState) => totalIncome(f) - totalCharges(f)

  const hasFormData = (f: FormState) =>
    f.totalIncomePerso || f.totalIncomeCash || f.totalRevenuesPro ||
    f.totalChargesPerso || f.totalChargesPro

  // Compute grouped account totals for a snapshot
  const getGroupedAccountTotal = (groupKey: string, snapshot: MonthlySnapshot | undefined): number | null => {
    if (!snapshot) return null
    const group = BILAN_ACCOUNT_GROUPS.find(g => g.key === groupKey)
    if (!group) return null
    const accs = activeAccounts.filter(group.filter)
    if (accs.length === 0) return null
    // Check if we have check-in data for this month
    const checkIn = store.monthlyCheckIns.find(ci => ci.monthKey === snapshot.monthKey)
    let total = 0
    let hasAny = false
    accs.forEach(acc => {
      if (checkIn?.accountBalances?.[acc.id] !== undefined) {
        total += checkIn.accountBalances[acc.id]
        hasAny = true
      } else if (snapshot.accountBalances?.[acc.id] !== undefined) {
        total += snapshot.accountBalances[acc.id]
        hasAny = true
      }
    })
    return hasAny ? total : null
  }

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground uppercase tracking-wider">Historique</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Bilan mensuel — toutes périodes</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[11px] text-muted-foreground">Saisie manuelle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span className="text-[11px] text-muted-foreground">Données connectées</span>
        </div>
      </div>

      {/* Month list */}
      <div className="space-y-2">
        {months.map(monthKey => {
          const snapshot  = snapshotMap.get(monthKey)
          const isAuto    = monthKey >= AUTO_FROM
          const isCurrent = monthKey === getCurrentMonthKey()
          const totalInc  = snapshot ? snapshot.totalIncomeBank + snapshot.totalIncomeCash + (snapshot.totalRevenuesPro || 0) : null
          const totalExp  = snapshot ? snapshot.totalExpenses + (snapshot.totalChargesPro || 0) : null
          const hasData   = !!snapshot

          return (
            <FinanceCard key={monthKey}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isAuto ? 'bg-emerald-500' : 'bg-primary'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(monthKey)}</p>
                      {isCurrent && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">En cours</span>
                      )}
                      {isAuto && !isCurrent && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />auto
                        </span>
                      )}
                    </div>
                    {hasData ? (
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        {totalInc !== null && totalInc > 0 && (
                          <span className="text-[11px] text-emerald-400">+{formatCurrency(totalInc)}</span>
                        )}
                        {totalExp !== null && totalExp > 0 && (
                          <span className="text-[11px] text-rose-400">−{formatCurrency(totalExp)}</span>
                        )}
                        {snapshot!.totalAssets > 0 && (
                          <span className="text-[11px] text-blue-400">Actifs {formatCurrency(snapshot!.totalAssets)}</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                        {isAuto ? 'Cliquer pour générer automatiquement' : 'Aucune donnée — cliquer pour saisir'}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(monthKey)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 text-muted-foreground text-xs font-medium flex-shrink-0 border border-border/30 active:bg-muted/50"
                >
                  <Pencil className="w-3 h-3" />
                  {hasData ? 'Modifier' : isAuto ? 'Générer' : 'Saisir'}
                </button>
              </div>

              {/* Asset breakdown preview */}
              {hasData && snapshot!.assetBreakdown && Object.keys(snapshot!.assetBreakdown).length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20 flex flex-wrap gap-1.5">
                  {Object.entries(snapshot!.assetBreakdown).map(([key, val]) => {
                    const cls = ASSET_CLASSES.find(c => c.key === key)
                    return (
                      <div key={key} className="flex items-center gap-1 bg-muted/30 rounded-lg px-2 py-0.5">
                        <span className="text-[10px]">{cls?.emoji || '📦'}</span>
                        <span className="text-[10px] text-muted-foreground">{cls?.label || key}</span>
                        <span className="text-[10px] font-semibold text-foreground">{formatCurrency(val)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </FinanceCard>
          )
        })}
      </div>

      {/* ── Edit modal ── */}
      {editingMonth && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={() => setEditingMonth(null)}>
          <div
            className="bg-card w-full max-w-lg rounded-t-2xl max-h-[92vh] overflow-y-auto overscroll-contain"
            style={{ touchAction: 'pan-y' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 border-b border-border/50 sticky top-0 bg-card z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground capitalize">{getMonthLabel(editingMonth)}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {autoFilled ? '⚡ Pré-rempli automatiquement — modifiable'
                      : editingMonth >= AUTO_FROM ? 'Données modifiées manuellement'
                      : 'Saisie manuelle du bilan'}
                  </p>
                </div>
                <button onClick={() => setEditingMonth(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              {autoFilled && (
                <div className="mt-3 flex items-start gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-emerald-300 leading-relaxed">
                    Pré-rempli depuis tes opérations et actifs connectés. Modifiable.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 space-y-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">

              {/* ── REVENUS TOTAUX ── */}
              <div>
                <button
                  onClick={() => setShowRevenueDetail(!showRevenueDetail)}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    💰 Revenus Totaux Pro & Perso
                  </p>
                  {showRevenueDetail ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {/* Summary line */}
                <div className="flex justify-between items-center bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2 mb-2">
                  <span className="text-[11px] text-muted-foreground">Total revenus</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency(totalIncome(form))}
                  </span>
                </div>

                {/* Detail */}
                {showRevenueDetail && (
                  <div className="space-y-2 pl-2 border-l-2 border-emerald-500/20 ml-1">
                    <div>
                      <label className="text-[11px] text-muted-foreground">👤 Revenus Perso (bancaire)</label>
                      <input type="number" inputMode="decimal"
                        className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                        placeholder="0 €" value={form.totalIncomePerso} onFocus={e => e.target.select()}
                        onChange={e => setForm(f => ({ ...f, totalIncomePerso: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">💵 Revenus Perso (espèces)</label>
                      <input type="number" inputMode="decimal"
                        className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                        placeholder="0 €" value={form.totalIncomeCash} onFocus={e => e.target.select()}
                        onChange={e => setForm(f => ({ ...f, totalIncomeCash: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">💼 Revenus Pro</label>
                      <input type="number" inputMode="decimal"
                        className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                        placeholder="0 €" value={form.totalRevenuesPro} onFocus={e => e.target.select()}
                        onChange={e => setForm(f => ({ ...f, totalRevenuesPro: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── CHARGES TOTALES ── */}
              <div>
                <button
                  onClick={() => setShowChargesDetail(!showChargesDetail)}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    💸 Charges Totales Pro & Perso
                  </p>
                  {showChargesDetail ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                <div className="flex justify-between items-center bg-rose-500/8 border border-rose-500/20 rounded-xl px-3 py-2 mb-2">
                  <span className="text-[11px] text-muted-foreground">Total charges</span>
                  <span className="text-sm font-bold text-rose-400">
                    {formatCurrency(totalCharges(form))}
                  </span>
                </div>

                {showChargesDetail && (
                  <div className="space-y-2 pl-2 border-l-2 border-rose-500/20 ml-1">
                    <div>
                      <label className="text-[11px] text-muted-foreground">👤 Dépenses Perso</label>
                      <input type="number" inputMode="decimal"
                        className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                        placeholder="0 €" value={form.totalChargesPerso} onFocus={e => e.target.select()}
                        onChange={e => setForm(f => ({ ...f, totalChargesPerso: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">💼 Dépenses Pro</label>
                      <input type="number" inputMode="decimal"
                        className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                        placeholder="0 €" value={form.totalChargesPro} onFocus={e => e.target.select()}
                        onChange={e => setForm(f => ({ ...f, totalChargesPro: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── SOLDE ── */}
              {hasFormData(form) && (
                <div className={`flex justify-between items-center rounded-xl px-3 py-2 border ${solde(form) >= 0 ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-rose-500/8 border-rose-500/20'}`}>
                  <span className="text-xs font-semibold text-muted-foreground">Solde du mois</span>
                  <span className={`text-sm font-bold ${solde(form) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(solde(form))}
                  </span>
                </div>
              )}

              {/* ── DETTES ── */}
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">📉 Dettes Totales</p>
                <input type="number" inputMode="decimal"
                  className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  placeholder="0 €" value={form.totalDebts} onFocus={e => e.target.select()}
                  onChange={e => setForm(f => ({ ...f, totalDebts: e.target.value }))} />
              </div>

              {/* ── ÉTAT FINAL DES COMPTES (grouped) ── */}
              {activeAccounts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">🏦 État final des comptes</p>
                  <div className="space-y-3">
                    {BILAN_ACCOUNT_GROUPS.map(group => {
                      const accs = activeAccounts.filter(group.filter)
                      if (accs.length === 0) return null

                      // Compute group total
                      let groupTotal = 0
                      let allMissing = true
                      accs.forEach(acc => {
                        if (!form.accountMissing[acc.id]) {
                          groupTotal += parseFloat(form.accountBalances[acc.id] || '0') || 0
                          allMissing = false
                        }
                      })

                      return (
                        <div key={group.key} className="bg-muted/20 rounded-xl border border-border/30 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{group.emoji}</span>
                              <span className="text-xs font-semibold text-foreground">{group.label}</span>
                              {accs.length > 1 && (
                                <span className="text-[10px] text-muted-foreground/60">({accs.length} comptes)</span>
                              )}
                            </div>
                            {!allMissing && (
                              <span className="text-xs font-bold text-foreground">{formatCurrency(groupTotal)}</span>
                            )}
                            {allMissing && (
                              <span className="text-xs font-bold text-amber-400">X</span>
                            )}
                          </div>
                          <div className="px-3 pb-2 space-y-1.5">
                            {accs.map(acc => {
                              const isMissing = !!form.accountMissing[acc.id]
                              return (
                                <div key={acc.id} className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground flex-1 min-w-0 truncate">{acc.name}</span>
                                  {isMissing ? (
                                    <button
                                      onClick={() => setForm(f => ({ ...f, accountMissing: { ...f.accountMissing, [acc.id]: false }, accountBalances: { ...f.accountBalances, [acc.id]: '0' } }))}
                                      className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1 active:bg-amber-500/20 min-w-[40px] text-center"
                                    >X</button>
                                  ) : (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <input
                                        type="number" inputMode="decimal"
                                        className="w-24 bg-muted/50 rounded-xl px-2 py-1.5 text-sm text-right text-foreground outline-none"
                                        placeholder="0" value={form.accountBalances[acc.id] || ''}
                                        onFocus={e => e.target.select()}
                                        onChange={e => setForm(f => ({ ...f, accountBalances: { ...f.accountBalances, [acc.id]: e.target.value } }))}
                                      />
                                      <span className="text-xs text-muted-foreground">€</span>
                                      <button
                                        onClick={() => setForm(f => ({ ...f, accountMissing: { ...f.accountMissing, [acc.id]: true }, accountBalances: { ...f.accountBalances, [acc.id]: '' } }))}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-amber-400 active:bg-muted/50 text-[11px] font-bold"
                                        title="Marquer comme inconnu"
                                      >X</button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── ACTIFS ── */}
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">📈 Actifs</p>
                <div className="space-y-2">
                  {ASSET_CLASSES.map(cls => (
                    <div key={cls.key} className="flex items-center gap-2">
                      <span className="text-base w-6 flex-shrink-0">{cls.emoji}</span>
                      <span className="text-[11px] text-muted-foreground w-28 flex-shrink-0">{cls.label}</span>
                      <input
                        type="number" inputMode="decimal"
                        className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                        placeholder="0 €" value={form.assetBreakdown[cls.key] || ''}
                        onFocus={e => e.target.select()}
                        onChange={e => setAssetVal(cls.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {Object.values(form.assetBreakdown).some(v => parseFloat(v) > 0) && (
                  <div className="mt-2 flex justify-between items-center bg-muted/30 rounded-xl px-3 py-2">
                    <span className="text-xs text-muted-foreground">Total actifs (hors comptes)</span>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(Object.values(form.assetBreakdown).reduce((s, v) => s + (parseFloat(v) || 0), 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Aperçu patrimoine net ── */}
              {hasFormData(form) && (
                <div className="bg-muted/20 rounded-xl p-3 border border-border/30">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Aperçu patrimoine net</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Revenus totaux</span>
                      <span className="text-emerald-400">+{formatCurrency(totalIncome(form))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Charges totales</span>
                      <span className="text-rose-400">−{formatCurrency(totalCharges(form))}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-border/30 mt-1">
                      <span className="text-muted-foreground font-semibold">Solde net</span>
                      <span className={`font-bold ${solde(form) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(solde(form))}
                      </span>
                    </div>
                    {activeAccounts.some(a => form.accountMissing[a.id]) && (
                      <p className="text-[10px] text-amber-400/70 mt-2">
                        ⚠️ Données partielles — {activeAccounts.filter(a => form.accountMissing[a.id]).length} compte(s) marqué(s) X, non inclus dans le total.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button onClick={handleSave}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                <Check className="w-4 h-4 inline mr-1.5" />
                Enregistrer le bilan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
