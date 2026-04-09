import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency, getCurrentMonthKey, getPreviousMonthKey, getMonthLabel, getLevelForXp, getNextLevel } from '@/lib/constants'
import { calculateHealthScore } from '@/lib/analytics'
import type { FinanceStore, MonthlyCheckIn, Account, Asset, Debt } from '@/types/finance'

interface Props {
  store: FinanceStore
  onSaveCheckIn: (c: MonthlyCheckIn) => void
  onUpdateAccount: (id: string, patch: Partial<Account>) => void
  onUpdateAsset: (id: string, patch: Partial<Asset>) => void
  onUpdateDebt: (id: string, patch: Partial<Debt>) => void
  targetMonthKey?: string  // if set: retroactive check-in for a past month
  onClose?: () => void     // close button for retroactive modal
}

export function shouldShowCheckin(store: FinanceStore): boolean {
  const today = new Date()
  const day = today.getDate()
  const checkIns = store.monthlyCheckIns || []
  const currentMonthKey = getCurrentMonthKey()
  const prevMonthKey = getPreviousMonthKey(currentMonthKey)
  // Last 3 days of month → bilan du mois en cours
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (day >= lastDay - 2) {
    return !checkIns.some(c => c.monthKey === currentMonthKey)
  }
  // 1er jour du mois suivant → bilan du mois précédent (grace period)
  if (day === 1) {
    return !checkIns.some(c => c.monthKey === prevMonthKey)
  }
  return false
}

// ─── Wrapped cards ────────────────────────────────────────────────────────────

interface WrappedCard {
  bg: string
  emoji: string
  label: string
  value: string
  sub?: string
}

function buildWrappedCards(store: FinanceStore, prevMonthKey: string): WrappedCard[] {
  const ops = store.operations.filter(op => op.monthKey === prevMonthKey)
  const txs = store.transactions.filter(t => t.monthKey === prevMonthKey)
  if (ops.length === 0 && txs.length === 0) return []

  const cards: WrappedCard[] = []

  // Card 1: Intro
  cards.push({
    bg: 'from-primary/20 to-background',
    emoji: '📊',
    label: `Bilan de ${getMonthLabel(prevMonthKey)}`,
    value: '',
    sub: 'Voici comment s\'est passé votre mois financièrement',
  })

  // Card 2: Revenus
  const revOps = ops.filter(op => op.family === 'revenu')
  const revActual = revOps.reduce((s, op) => s + op.actual, 0)
  const revForecast = revOps.reduce((s, op) => s + op.forecast, 0)
  const txIncome = txs.filter(t => t.direction === 'income').reduce((s, t) => s + t.amount, 0)
  const totalIncome = revActual || txIncome
  if (totalIncome > 0) {
    const pct = revForecast > 0 ? Math.round((revActual / revForecast) * 100) : null
    cards.push({
      bg: 'from-emerald-500/20 to-background',
      emoji: '💰',
      label: 'Revenus encaissés',
      value: formatCurrency(totalIncome),
      sub: pct !== null ? `${pct}% de l'objectif prévu` : undefined,
    })
  }

  // Card 3: Dépenses
  const chargeOps = ops.filter(op => op.family !== 'revenu')
  const chargeActual = chargeOps.reduce((s, op) => s + op.actual, 0)
  const txExpense = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalExpense = chargeActual || txExpense
  if (totalExpense > 0) {
    const chargeForecast = chargeOps.reduce((s, op) => s + op.forecast, 0)
    const pct = chargeForecast > 0 ? Math.round((chargeActual / chargeForecast) * 100) : null
    cards.push({
      bg: 'from-destructive/20 to-background',
      emoji: '💸',
      label: 'Dépenses du mois',
      value: formatCurrency(totalExpense),
      sub: pct !== null ? (pct > 100 ? `⚠️ +${pct - 100}% au-dessus du budget` : `${pct}% du budget utilisé`) : undefined,
    })
  }

  // Card 4: Résultat net
  if (totalIncome > 0 || totalExpense > 0) {
    const net = totalIncome - totalExpense
    cards.push({
      bg: net >= 0 ? 'from-emerald-500/20 to-background' : 'from-destructive/20 to-background',
      emoji: net >= 0 ? '✅' : '⚠️',
      label: 'Résultat net',
      value: `${net >= 0 ? '+' : ''}${formatCurrency(net)}`,
      sub: net >= 0 ? 'Mois positif — bien joué !' : 'Mois déficitaire — à ajuster',
    })
  }

  // Card 5: Score santé financière
  const health = calculateHealthScore(store)
  const healthEmoji = health.total >= 75 ? '💚' : health.total >= 60 ? '🟡' : health.total >= 40 ? '🟠' : '🔴'
  const healthMsg = health.total >= 75 ? 'Excellente santé financière' : health.total >= 60 ? 'Bonne dynamique' : health.total >= 40 ? 'Des marges de progression' : 'Point d\'attention requis'
  cards.push({
    bg: health.total >= 60 ? 'from-emerald-500/15 to-background' : 'from-amber-500/15 to-background',
    emoji: healthEmoji,
    label: 'Score santé financière',
    value: `${health.total} / 100`,
    sub: health.weakestCriterion ? `À renforcer : ${health.weakestCriterion}` : healthMsg,
  })

  // Card 6: Niveau & XP
  const level = getLevelForXp(store.settings.xp)
  const nextLevel = getNextLevel(level.level)
  const xpToNext = nextLevel ? nextLevel.minXp - store.settings.xp : null
  cards.push({
    bg: 'from-primary/15 to-background',
    emoji: level.emoji,
    label: `Niveau ${level.level} — ${level.name}`,
    value: `${store.settings.xp} XP`,
    sub: xpToNext !== null ? `Plus que ${xpToNext} XP avant Niveau ${level.level + 1}` : '🎖️ Niveau maximum atteint !',
  })

  // Card 7: Quêtes complétées ce mois (conditionnel)
  const completedThisMonth = store.quests.filter(q => q.status === 'completed')
  if (completedThisMonth.length > 0) {
    const q = completedThisMonth[0]
    cards.push({
      bg: 'from-amber-500/20 to-background',
      emoji: q.emoji || '🏆',
      label: 'Quête accomplie !',
      value: q.title,
      sub: `+${q.xpReward} XP débloqués`,
    })
  }

  return cards
}

// ─── Steps ───────────────────────────────────────────────────────────────────

type CheckinStep = 'intro' | 'comptes' | 'actifs' | 'dettes' | 'confirm'

export const MonthlyCheckinModal: React.FC<Props> = ({
  store, onSaveCheckIn, onUpdateAccount, onUpdateAsset, onUpdateDebt,
  targetMonthKey, onClose,
}) => {
  const currentMonthKey = getCurrentMonthKey()
  const prevMonthKey = getPreviousMonthKey(currentMonthKey)
  const isRetroactive = !!targetMonthKey

  // For retroactive: load existing check-in data if any
  const existingCheckIn = useMemo(
    () => isRetroactive ? (store.monthlyCheckIns || []).find(c => c.monthKey === targetMonthKey) : undefined,
    [isRetroactive, store.monthlyCheckIns, targetMonthKey]
  )

  const wrappedCards = useMemo(() => buildWrappedCards(store, prevMonthKey), [store, prevMonthKey])
  const hasWrapped = wrappedCards.length > 0

  // Wrapped state — skip for retroactive
  const [wrappedIdx, setWrappedIdx] = useState(0)
  const [showingWrapped, setShowingWrapped] = useState(hasWrapped && !isRetroactive)

  // Checkin steps
  const activeAccounts = store.accounts.filter(a => a.isActive)
  const hasAssets = store.assets.length > 0
  const hasDebts = store.debts.length > 0
  const steps: CheckinStep[] = ['intro', 'comptes', ...(hasAssets ? ['actifs' as CheckinStep] : []), ...(hasDebts ? ['dettes' as CheckinStep] : []), 'confirm']
  const [stepIdx, setStepIdx] = useState(0)
  const currentStep = steps[stepIdx]

  // Editable balances — pre-fill from existing check-in for retroactive, empty for new retroactive, current balance for normal
  const [accountEdits, setAccountEdits] = useState<Record<string, string>>(() => {
    if (existingCheckIn?.accountBalances) {
      return Object.fromEntries(activeAccounts.map(a => [a.id, String(existingCheckIn.accountBalances[a.id] ?? '')]))
    }
    if (isRetroactive) return Object.fromEntries(activeAccounts.map(a => [a.id, '']))
    return Object.fromEntries(activeAccounts.map(a => [a.id, String(a.currentBalance)]))
  })
  const [assetEdits, setAssetEdits] = useState<Record<string, string>>(() => {
    if (existingCheckIn?.assetValues) {
      return Object.fromEntries(store.assets.map(a => [a.id, String(existingCheckIn.assetValues[a.id] ?? '')]))
    }
    if (isRetroactive) return Object.fromEntries(store.assets.map(a => [a.id, '']))
    return Object.fromEntries(store.assets.map(a => [a.id, String(a.value)]))
  })
  const [debtEdits, setDebtEdits] = useState<Record<string, string>>(() => {
    if (existingCheckIn?.debtBalances) {
      return Object.fromEntries(store.debts.map(d => [d.id, String(existingCheckIn.debtBalances[d.id] ?? '')]))
    }
    if (isRetroactive) return Object.fromEntries(store.debts.map(d => [d.id, '']))
    return Object.fromEntries(store.debts.map(d => [d.id, String(d.outstandingBalance)]))
  })

  const handleFinish = () => {
    // For non-retroactive check-ins only: update current account/asset/debt balances in the store
    if (!isRetroactive) {
      activeAccounts.forEach(a => {
        const val = parseFloat(accountEdits[a.id]) || 0
        if (val !== a.currentBalance) onUpdateAccount(a.id, { currentBalance: val })
      })
      store.assets.forEach(a => {
        const val = parseFloat(assetEdits[a.id]) || 0
        if (val !== a.value) onUpdateAsset(a.id, { value: val })
      })
      store.debts.forEach(d => {
        const val = parseFloat(debtEdits[d.id]) || 0
        if (val !== d.outstandingBalance) onUpdateDebt(d.id, { outstandingBalance: val })
      })
    }
    // Determine month key and save check-in
    const bilanMonthKey = targetMonthKey || (new Date().getDate() === 1 ? prevMonthKey : currentMonthKey)
    onSaveCheckIn({
      id: existingCheckIn?.id || `checkin_${Date.now()}`,
      monthKey: bilanMonthKey,
      doneAt: new Date().toISOString(),
      accountBalances: Object.fromEntries(activeAccounts.map(a => [a.id, parseFloat(accountEdits[a.id] || '0') || 0])),
      assetValues: Object.fromEntries(store.assets.map(a => [a.id, parseFloat(assetEdits[a.id] || '0') || 0])),
      debtBalances: Object.fromEntries(store.debts.map(d => [d.id, parseFloat(debtEdits[d.id] || '0') || 0])),
    })
  }

  // ─── Wrapped phase ──────────────────────────────────────────────────────────

  if (showingWrapped && wrappedCards.length > 0) {
    const card = wrappedCards[wrappedIdx]
    const isLast = wrappedIdx >= wrappedCards.length - 1
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center pt-safe pt-4 px-5">
          {wrappedCards.map((_, i) => (
            <div key={i} className={`h-1 rounded-full flex-1 transition-all ${i <= wrappedIdx ? 'bg-primary' : 'bg-muted/50'}`} />
          ))}
        </div>

        {/* Card */}
        <div className={`flex-1 flex flex-col items-center justify-center px-8 bg-gradient-to-b ${card.bg} text-center gap-6`}>
          <p className="text-7xl">{card.emoji}</p>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-2">{card.label}</p>
            {card.value && <p className="text-4xl font-black text-foreground mb-3">{card.value}</p>}
            {card.sub && <p className="text-sm text-muted-foreground">{card.sub}</p>}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 pb-8 pt-4">
          <button onClick={() => wrappedIdx > 0 && setWrappedIdx(i => i - 1)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${wrappedIdx > 0 ? 'text-muted-foreground' : 'opacity-0 pointer-events-none'}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-xs text-muted-foreground">{wrappedIdx + 1} / {wrappedCards.length}</p>
          <button onClick={() => isLast ? setShowingWrapped(false) : setWrappedIdx(i => i + 1)}
            className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            {isLast ? <span className="text-xs font-semibold">OK</span> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    )
  }

  // ─── Check-in phase ─────────────────────────────────────────────────────────

  const totalSteps = steps.length
  const pct = Math.round((stepIdx / (totalSteps - 1)) * 100)

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-primary uppercase tracking-wider font-semibold">
            {isRetroactive ? '📅 Bilan rétroactif' : 'Bilan d\'ouverture'}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">{stepIdx + 1} / {totalSteps}</p>
            {isRetroactive && onClose && (
              <button onClick={onClose} className="text-muted-foreground/60 hover:text-muted-foreground text-lg leading-none">✕</button>
            )}
          </div>
        </div>
        <div className="w-full bg-muted/40 rounded-full h-1">
          <div className="h-1 rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <h2 className="text-lg font-bold text-foreground mt-3 capitalize">
          {getMonthLabel(targetMonthKey || currentMonthKey)}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {currentStep === 'intro' && (
          <div className="flex flex-col items-center text-center gap-6 py-8">
            <p className="text-6xl">{isRetroactive ? '📅' : '📋'}</p>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {isRetroactive ? `Bilan de ${getMonthLabel(targetMonthKey!)}` : 'Mise à jour mensuelle'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isRetroactive
                  ? `Saisissez les soldes de vos comptes, actifs et dettes tels qu'ils étaient fin ${getMonthLabel(targetMonthKey!)}. Ces données alimenteront votre courbe d'évolution patrimoniale.`
                  : `Chaque 1er du mois, prenez 2 minutes pour mettre à jour les soldes de vos comptes, actifs et dettes.\n\nCela permet de garder votre patrimoine net à jour et de suivre votre progression réelle.`
                }
              </p>
            </div>
            <div className="w-full space-y-2 text-left">
              {[
                `${activeAccounts.length} compte${activeAccounts.length > 1 ? 's' : ''} à mettre à jour`,
                ...(hasAssets ? [`${store.assets.length} actif${store.assets.length > 1 ? 's' : ''} à vérifier`] : []),
                ...(hasDebts ? [`${store.debts.length} dette${store.debts.length > 1 ? 's' : ''} à ajuster`] : []),
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/20 rounded-xl px-4 py-3">
                  <span className="text-primary">✓</span>
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'comptes' && (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-base font-bold text-foreground">Soldes des comptes</h3>
              <p className="text-xs text-muted-foreground mt-1">Entrez le solde actuel de chaque compte</p>
            </div>
            {activeAccounts.map(a => (
              <div key={a.id} className="bg-card/60 rounded-2xl border border-border/30 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.institution}{a.subtype ? ` · ${a.subtype}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-28 bg-muted/50 rounded-xl px-3 py-2 text-sm font-medium text-right text-foreground outline-none border border-border/30 focus:border-primary/50"
                      value={accountEdits[a.id] ?? ''}
                      onChange={e => setAccountEdits(prev => ({ ...prev, [a.id]: e.target.value }))}
                    />
                    <span className="text-xs text-muted-foreground">€</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 'actifs' && (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-base font-bold text-foreground">Valeur des actifs</h3>
              <p className="text-xs text-muted-foreground mt-1">Mettez à jour la valeur estimée de chaque actif</p>
            </div>
            {store.assets.map(a => (
              <div key={a.id} className="bg-card/60 rounded-2xl border border-border/30 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.platform || a.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-28 bg-muted/50 rounded-xl px-3 py-2 text-sm font-medium text-right text-foreground outline-none border border-border/30 focus:border-primary/50"
                      value={assetEdits[a.id] ?? ''}
                      onChange={e => setAssetEdits(prev => ({ ...prev, [a.id]: e.target.value }))}
                    />
                    <span className="text-xs text-muted-foreground">€</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 'dettes' && (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-base font-bold text-foreground">Solde des dettes</h3>
              <p className="text-xs text-muted-foreground mt-1">Entrez le capital restant dû pour chaque dette</p>
            </div>
            {store.debts.map(d => (
              <div key={d.id} className="bg-card/60 rounded-2xl border border-border/30 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.lender}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-28 bg-muted/50 rounded-xl px-3 py-2 text-sm font-medium text-right text-foreground outline-none border border-border/30 focus:border-primary/50"
                      value={debtEdits[d.id] ?? ''}
                      onChange={e => setDebtEdits(prev => ({ ...prev, [d.id]: e.target.value }))}
                    />
                    <span className="text-xs text-muted-foreground">€</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 'confirm' && (
          <div className="flex flex-col items-center text-center gap-6 py-8">
            <p className="text-6xl">✅</p>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Tout est prêt</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isRetroactive
                  ? `Le bilan de ${getMonthLabel(targetMonthKey!)} va être enregistré.`
                  : `Votre situation financière du ${getMonthLabel(currentMonthKey)} va être enregistrée.`
                }
              </p>
            </div>
            {/* Summary */}
            <div className="w-full space-y-2 text-left">
              <div className="bg-muted/20 rounded-xl px-4 py-3 flex justify-between">
                <span className="text-sm text-muted-foreground">Total comptes</span>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(activeAccounts.reduce((s, a) => s + (parseFloat(accountEdits[a.id]) || 0), 0))}
                </span>
              </div>
              {hasAssets && (
                <div className="bg-muted/20 rounded-xl px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Total actifs</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(store.assets.reduce((s, a) => s + (parseFloat(assetEdits[a.id]) || 0), 0))}
                  </span>
                </div>
              )}
              {hasDebts && (
                <div className="bg-muted/20 rounded-xl px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Total dettes</span>
                  <span className="text-sm font-bold text-destructive">
                    {formatCurrency(store.debts.reduce((s, d) => s + (parseFloat(debtEdits[d.id]) || 0), 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-3 border-t border-border/50 flex gap-3">
        {stepIdx > 0 && (
          <button onClick={() => setStepIdx(i => i - 1)}
            className="flex-shrink-0 px-4 py-3 rounded-xl bg-muted/40 text-foreground text-sm font-medium">
            Retour
          </button>
        )}
        {currentStep !== 'confirm' ? (
          <button onClick={() => setStepIdx(i => i + 1)}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Continuer
          </button>
        ) : (
          <button onClick={handleFinish}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Enregistrer et continuer →
          </button>
        )}
      </div>
    </div>
  )
}
