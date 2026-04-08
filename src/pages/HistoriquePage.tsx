import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, X, Check, Zap } from 'lucide-react'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/constants'
import type { FinanceStore, MonthlySnapshot } from '@/types/finance'

interface Props {
  store: FinanceStore
  onSaveSnapshot: (s: MonthlySnapshot) => void
}

// April 2026 = first month with connected data
const AUTO_FROM = '2026-04'

// Full list for display only
const ASSET_CLASSES = [
  { key: 'crypto',        label: 'Crypto',          emoji: '🪙' },
  { key: 'assurance_vie', label: 'Assurance Vie',    emoji: '🛡️' },
  { key: 'livret',        label: 'Livret épargne',   emoji: '💰' },
  { key: 'actions_etf',   label: 'Actions / ETF',    emoji: '📈' },
  { key: 'immobilier',    label: 'Immobilier',       emoji: '🏠' },
  { key: 'cash',          label: 'Cash / Comptes',   emoji: '🏦' },
  { key: 'paris_sportif', label: 'Paris Sportif',    emoji: '🎯' },
  { key: 'autres',        label: 'Autres actifs',    emoji: '📦' },
]

// Form inputs — 'cash' and 'livret' come from account inputs, not manual fields
const ASSET_CLASSES_FORM = [
  { key: 'crypto',        label: 'Crypto',          emoji: '🪙' },
  { key: 'assurance_vie', label: 'Assurance Vie',    emoji: '🛡️' },
  { key: 'actions_etf',   label: 'Actions / ETF',    emoji: '📈' },
  { key: 'immobilier',    label: 'Immobilier',       emoji: '🏠' },
  { key: 'paris_sportif', label: 'Paris Sportif',    emoji: '🎯' },
  { key: 'autres',        label: 'Autres actifs',    emoji: '📦' },
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

// Account type → asset class (livret/épargne → 'livret', rest → 'cash')
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
  accountMissing: Record<string, boolean>  // true = pas de données pour ce mois
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

  const snapshotMap = useMemo(
    () => new Map(store.monthlySnapshots.map(s => [s.monthKey, s])),
    [store.monthlySnapshots]
  )

  const activeAccounts = useMemo(
    () => store.accounts.filter(a => a.isActive && a.type !== 'dette'),
    [store.accounts]
  )

  // Body scroll lock when edit modal open
  useEffect(() => {
    if (editingMonth !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [editingMonth])

  // Build per-account balances + missing flags
  // Before AUTO_FROM without check-in → mark as missing (no fake 0 in totals)
  const buildAccountData = (monthKey: string): { balances: Record<string, string>; missing: Record<string, boolean> } => {
    const checkIn = store.monthlyCheckIns.find(ci => ci.monthKey === monthKey)
    const balances: Record<string, string> = {}
    const missing: Record<string, boolean> = {}
    activeAccounts.forEach(acc => {
      if (checkIn?.accountBalances?.[acc.id] !== undefined) {
        balances[acc.id] = String(checkIn.accountBalances[acc.id])
        missing[acc.id] = false
      } else if (monthKey >= AUTO_FROM) {
        // Connected months: use current balance (may be 0 but known)
        balances[acc.id] = String(acc.currentBalance ?? 0)
        missing[acc.id] = false
      } else {
        // Historical months without check-in: unknown
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

    // Ops — primary source (split by scope)
    const opsRevPerso  = ops.filter(op => op.family === 'revenu' && op.scope === 'perso').reduce((s, op) => s + op.actual, 0)
    const opsRevPro    = ops.filter(op => op.family === 'revenu' && op.scope === 'pro').reduce((s, op) => s + op.actual, 0)
    const opsCharPerso = ops.filter(op => op.family !== 'revenu' && op.scope === 'perso').reduce((s, op) => s + op.actual, 0)
    const opsCharPro   = ops.filter(op => op.family !== 'revenu' && op.scope === 'pro').reduce((s, op) => s + op.actual, 0)

    // Transactions — fallback for income
    const txIncomeBank = txs.filter(t => t.direction === 'income' && t.sourceType === 'bank').reduce((s, t) => s + t.amount, 0)
    const txIncomeCash = txs.filter(t => t.direction === 'income' && t.sourceType === 'cash').reduce((s, t) => s + t.amount, 0)
    const txExpenses   = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)

    const incomePerso  = opsRevPerso  > 0 ? opsRevPerso  : txIncomeBank
    const incomeCash   = txIncomeCash
    const chargesPerso = opsCharPerso > 0 ? opsCharPerso : txExpenses
    const chargesPro   = opsCharPro
    const revenusPro   = opsRevPro

    const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)

    // Non-account assets from check-in or current store values
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

    if (existing) {
      // Strip 'cash'/'livret' from saved breakdown — those come from account inputs now
      const breakdown: Record<string, string> = {}
      Object.entries(existing.assetBreakdown || {}).forEach(([k, v]) => {
        if (k !== 'cash' && k !== 'livret') breakdown[k] = String(v)
      })
      const accData = buildAccountData(monthKey)
      setForm({
        totalIncomePerso:  String(existing.totalIncomeBank  || ''),
        totalIncomeCash:   String(existing.totalIncomeCash  || ''),
        totalRevenuesPro:  String(existing.totalRevenuesPro || ''),
        totalChargesPerso: String(existing.totalExpenses    || ''),
        totalChargesPro:   String(existing.totalChargesPro  || ''),
        totalDebts:        String(existing.totalDebts       || ''),
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

    // Non-account assets
    const assetBreakdown: Record<string, number> = {}
    Object.entries(form.assetBreakdown).forEach(([k, v]) => {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) assetBreakdown[k] = n
    })

    // Account balances routed to 'cash' or 'livret'
    activeAccounts.forEach(acc => {
      if (form.accountMissing[acc.id]) return  // skip — données inconnues, pas de faux 0
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
      netWorth:         totalAssets - debts,
      isManual:         true,
      assetBreakdown,
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

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Historique</h1>
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
                    Pré-rempli depuis tes opérations (perso + pro), transactions et actifs connectés. Modifiable.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 space-y-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">

              {/* ── ENTRÉES ── */}
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Entrées</p>
                <div className="space-y-2">
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
              </div>

              {/* ── DÉPENSES ── */}
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Dépenses</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">👤 Charges Perso</label>
                    <input type="number" inputMode="decimal"
                      className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                      placeholder="0 €" value={form.totalChargesPerso} onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, totalChargesPerso: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">💼 Charges Pro</label>
                    <input type="number" inputMode="decimal"
                      className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
                      placeholder="0 €" value={form.totalChargesPro} onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, totalChargesPro: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* ── DETTES ── */}
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Dettes totales</p>
                <input type="number" inputMode="decimal"
                  className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  placeholder="0 €" value={form.totalDebts} onFocus={e => e.target.select()}
                  onChange={e => setForm(f => ({ ...f, totalDebts: e.target.value }))} />
              </div>

              {/* ── COMPTES (individuel) ── */}
              {activeAccounts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Comptes</p>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    💰 Livret/Épargne → Livret épargne · 🏦 Courant/Liquide/Pro → Cash
                  </p>
                  <div className="space-y-2">
                    {activeAccounts.map(acc => {
                      const cls = ACCOUNT_TYPE_TO_CLASS[acc.type] || 'cash'
                      const emoji = cls === 'livret' ? '💰' : acc.type === 'pro' ? '💼' : '🏦'
                      const isMissing = !!form.accountMissing[acc.id]
                      return (
                        <div key={acc.id} className="flex items-center gap-2">
                          <span className="text-sm flex-shrink-0">{emoji}</span>
                          <span className="text-[11px] text-muted-foreground flex-1 min-w-0 truncate">{acc.name}</span>
                          {isMissing ? (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] text-amber-400/70 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 italic">Manquant</span>
                              <button
                                onClick={() => setForm(f => ({ ...f, accountMissing: { ...f.accountMissing, [acc.id]: false }, accountBalances: { ...f.accountBalances, [acc.id]: '0' } }))}
                                className="text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-lg active:bg-primary/20"
                              >Saisir</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <input
                                type="number" inputMode="decimal"
                                className="w-24 bg-muted/50 rounded-xl px-2 py-2 text-sm text-right text-foreground outline-none"
                                placeholder="0" value={form.accountBalances[acc.id] || ''}
                                onFocus={e => e.target.select()}
                                onChange={e => setForm(f => ({ ...f, accountBalances: { ...f.accountBalances, [acc.id]: e.target.value } }))}
                              />
                              <span className="text-xs text-muted-foreground">€</span>
                              <button
                                onClick={() => setForm(f => ({ ...f, accountMissing: { ...f.accountMissing, [acc.id]: true }, accountBalances: { ...f.accountBalances, [acc.id]: '' } }))}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-amber-400 active:bg-muted/50 text-[11px]"
                                title="Marquer comme manquant"
                              >?</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── ACTIFS (non-account) ── */}
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Actifs</p>
                <div className="space-y-2">
                  {ASSET_CLASSES_FORM.map(cls => (
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

              {/* ── Aperçu bilan ── */}
              {hasFormData(form) && (
                <div className="bg-muted/20 rounded-xl p-3 border border-border/30">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Aperçu du bilan</p>
                  <div className="space-y-1">
                    {(parseFloat(form.totalIncomePerso) || 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">👤 Revenus Perso</span>
                        <span className="text-emerald-400">+{formatCurrency((parseFloat(form.totalIncomePerso) || 0) + (parseFloat(form.totalIncomeCash) || 0))}</span>
                      </div>
                    )}
                    {(parseFloat(form.totalRevenuesPro) || 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">💼 Revenus Pro</span>
                        <span className="text-emerald-400">+{formatCurrency(parseFloat(form.totalRevenuesPro) || 0)}</span>
                      </div>
                    )}
                    {(parseFloat(form.totalChargesPerso) || 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">👤 Charges Perso</span>
                        <span className="text-rose-400">−{formatCurrency(parseFloat(form.totalChargesPerso) || 0)}</span>
                      </div>
                    )}
                    {(parseFloat(form.totalChargesPro) || 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">💼 Charges Pro</span>
                        <span className="text-rose-400">−{formatCurrency(parseFloat(form.totalChargesPro) || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs pt-1 border-t border-border/30 mt-1">
                      <span className="text-muted-foreground font-semibold">Solde net</span>
                      <span className={`font-bold ${solde(form) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(solde(form))}
                      </span>
                    </div>
                    {activeAccounts.some(a => form.accountMissing[a.id]) && (
                      <p className="text-[10px] text-amber-400/70 mt-2">
                        ⚠️ Données partielles — {activeAccounts.filter(a => form.accountMissing[a.id]).length} compte(s) marqué(s) manquant(s), non inclus dans le total actifs.
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
