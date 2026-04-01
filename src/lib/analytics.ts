import type { FinanceStore, Alert, HealthScore, PilotageMode } from '@/types/finance'
import { NON_REAL_REVENUE_TYPES } from '@/types/finance'
import { getCurrentMonthKey, getPreviousMonthKey } from './constants'

/** Get real income (excluding non-real revenue types) */
export function getRealIncome(store: FinanceStore, monthKey?: string): number {
  const mk = monthKey || getCurrentMonthKey()
  return store.transactions
    .filter(t => t.monthKey === mk && t.direction === 'income')
    .filter(t => t.isRealRevenue !== false) // exclude explicitly marked non-real
    .reduce((s, t) => s + t.amount, 0)
}

/** Get total income including non-real */
export function getTotalIncome(store: FinanceStore, monthKey?: string): number {
  const mk = monthKey || getCurrentMonthKey()
  return store.transactions
    .filter(t => t.monthKey === mk && t.direction === 'income')
    .reduce((s, t) => s + t.amount, 0)
}

export function generateAlerts(store: FinanceStore): Alert[] {
  const alerts: Alert[] = []
  const monthKey = getCurrentMonthKey()
  const txs = store.transactions.filter(t => t.monthKey === monthKey)
  const income = getRealIncome(store, monthKey)
  const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
  const fixedCharges = txs.filter(t => t.direction === 'expense' && t.isRecurring).reduce((s, t) => s + t.amount, 0)
  const bourso = store.accounts.find(a => a.id === 'bourso')
  const livretA = store.accounts.find(a => a.id === 'livret-a')

  if (income > 0 && fixedCharges > income) {
    alerts.push({ id: 'alert-charges-income', severity: 'critical', message: '🚨 Charges supérieures aux revenus ce mois. Quête en danger.', icon: '🚨', dismissed: false, createdAt: new Date().toISOString() })
  }
  if (bourso && bourso.currentBalance < 50 && bourso.currentBalance !== 0) {
    alerts.push({ id: 'alert-bourso-low', severity: 'critical', message: '🚨 Vie courante très basse. Surveille tes dépenses immédiatement.', icon: '🚨', dismissed: false, createdAt: new Date().toISOString() })
  }

  const prev3Months = [1, 2, 3].map(i => getPreviousMonthKey(monthKey, i))
  const catMap = new Map<string, number>()
  txs.filter(t => t.direction === 'expense').forEach(t => {
    catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amount)
  })
  catMap.forEach((amount, catId) => {
    const cat = store.categories.find(c => c.id === catId)
    const prevAmounts = prev3Months.map(mk => {
      return store.transactions.filter(t => t.monthKey === mk && t.direction === 'expense' && t.categoryId === catId).reduce((s, t) => s + t.amount, 0)
    }).filter(a => a > 0)
    if (prevAmounts.length > 0) {
      const avg = prevAmounts.reduce((s, a) => s + a, 0) / prevAmounts.length
      if (avg > 0 && amount > avg * 1.5) {
        const delta = Math.round(amount - avg)
        alerts.push({ id: `alert-cat-${catId}`, severity: 'warning', message: `⚠️ Tu as dépensé ${delta} € de plus en ${cat?.name || catId} ce mois.`, icon: '⚠️', dismissed: false, createdAt: new Date().toISOString() })
      }
    }
  })

  if (livretA) {
    const prev2 = [1, 2].map(i => store.monthlySnapshots.find(s => s.monthKey === getPreviousMonthKey(monthKey, i)))
    const stalled = prev2.every(s => s && livretA.currentBalance <= 0)
    if (stalled && livretA.currentBalance <= 0) {
      alerts.push({ id: 'alert-tampon-stalled', severity: 'warning', message: '⚠️ Ton tampon bancaire est bloqué depuis 2 mois. Progression Nv.1 ralentie.', icon: '⚠️', dismissed: false, createdAt: new Date().toISOString() })
    }
  }

  if (txs.length === 0) {
    const lastTx = store.transactions[0]
    if (lastTx) {
      const daysSince = Math.floor((Date.now() - new Date(lastTx.date).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince >= 10) {
        alerts.push({ id: 'alert-no-tx', severity: 'info', message: `📋 Aucune transaction depuis ${daysSince} jours. Ton bilan mensuel sera incomplet.`, icon: '📋', dismissed: false, createdAt: new Date().toISOString() })
      }
    }
  }

  store.quests.filter(q => q.status === 'active' && q.targetAmount > 0).forEach(q => {
    const pct = q.targetAmount > 0 ? (q.currentAmount / q.targetAmount) * 100 : 0
    if (pct >= 10 && pct < 100) {
      alerts.push({ id: `alert-quest-${q.id}`, severity: 'positive', message: `✅ Bonne progression sur ${q.title} ! Tu es à ${Math.round(pct)}% de l'objectif.`, icon: '✅', dismissed: false, createdAt: new Date().toISOString() })
    }
  })

  // Pilotage mode alert
  const mode = calculatePilotageMode(store)
  if (mode === 'protection') {
    alerts.push({ id: 'alert-mode-protection', severity: 'warning', message: '🛑 Mode Protection actif : cashflow fragile. Priorise la trésorerie et les dettes.', icon: '🛑', dismissed: false, createdAt: new Date().toISOString() })
  } else if (mode === 'regulation') {
    alerts.push({ id: 'alert-mode-regulation', severity: 'info', message: '⚙️ Mode Régulation actif : ajuste tes investissements pour protéger ton reste à vivre.', icon: '⚙️', dismissed: false, createdAt: new Date().toISOString() })
  }

  return alerts.filter(a => !store.dismissedAlerts.includes(a.id))
}

export function generateInsights(store: FinanceStore): string[] {
  const insights: string[] = []
  const monthKey = getCurrentMonthKey()
  const prevKey = getPreviousMonthKey(monthKey)
  const txs = store.transactions.filter(t => t.monthKey === monthKey && t.direction === 'expense')
  const prevTxs = store.transactions.filter(t => t.monthKey === prevKey && t.direction === 'expense')

  const catMap = new Map<string, number>()
  txs.forEach(t => {
    const cat = store.categories.find(c => c.id === t.categoryId)
    const name = cat?.name || 'Divers'
    catMap.set(name, (catMap.get(name) || 0) + t.amount)
  })
  const sorted = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])
  if (sorted.length > 0) {
    const [topName, topAmount] = sorted[0]
    const prevCatMap = new Map<string, number>()
    prevTxs.forEach(t => {
      const cat = store.categories.find(c => c.id === t.categoryId)
      const name = cat?.name || 'Divers'
      prevCatMap.set(name, (prevCatMap.get(name) || 0) + t.amount)
    })
    const prevAmount = prevCatMap.get(topName) || 0
    const diff = topAmount - prevAmount
    insights.push(`${topName} est ta catégorie #1 ce mois (${Math.round(topAmount)} €)${prevAmount > 0 ? `, ${diff > 0 ? '+' : ''}${Math.round(diff)} € vs mois dernier` : ''}.`)
  }

  const abos = txs.filter(t => t.isRecurring)
  if (abos.length > 0) {
    const totalAbos = abos.reduce((s, t) => s + t.amount, 0)
    insights.push(`Tes abonnements coûtent ${Math.round(totalAbos)} €/mois. As-tu vérifié lesquels tu utilises vraiment ?`)
  }

  const impulsiveCats = store.categories.filter(c => c.classification === 'impulsive').map(c => c.id)
  const impulsiveTotal = txs.filter(t => impulsiveCats.includes(t.categoryId)).reduce((s, t) => s + t.amount, 0)
  if (impulsiveTotal > 50) {
    const saving = Math.round(impulsiveTotal * 0.3)
    insights.push(`En réduisant tes dépenses impulsives de 30% tu économises ${saving} €/mois.`)
  }

  return insights.slice(0, 3)
}

export function calculateHealthScore(store: FinanceStore): HealthScore {
  const monthKey = getCurrentMonthKey()
  const txs = store.transactions.filter(t => t.monthKey === monthKey)
  const income = getRealIncome(store, monthKey)
  const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
  const lep = store.accounts.find(a => a.id === 'lep')?.currentBalance || 0
  const prevKey = getPreviousMonthKey(monthKey)
  const prevTxCount = store.transactions.filter(t => t.monthKey === prevKey).length
  const currentTxCount = txs.length

  let debtRatio = 20
  if (income > 0 && totalDebts > 0) {
    const ratio = totalDebts / income
    debtRatio = ratio >= 3 ? 0 : Math.round(20 * (1 - ratio / 3))
  } else if (totalDebts === 0) {
    debtRatio = 20
  }

  let savingsRate = 0
  if (income > 0) {
    const rate = ((income - expenses) / income) * 100
    savingsRate = Math.min(20, Math.max(0, Math.round(rate)))
  }

  const emergencyFund = Math.min(20, Math.round((lep / 2000) * 20))

  let regularity = 10
  if (prevTxCount > 0) {
    regularity = Math.min(20, Math.round((currentTxCount / Math.max(prevTxCount, 1)) * 20))
  } else if (currentTxCount > 0) {
    regularity = 15
  }

  const monthlyBalance = income >= expenses ? 20 : 0

  const total = debtRatio + savingsRate + emergencyFund + regularity + monthlyBalance

  const scores = { debtRatio, savingsRate, emergencyFund, regularity, monthlyBalance }
  const weakest = Object.entries(scores).sort(([, a], [, b]) => a - b)[0]
  const adviceMap: Record<string, string> = {
    debtRatio: 'Réduis tes dettes pour améliorer ton score.',
    savingsRate: 'Augmente ton taux d\'épargne en réduisant les dépenses.',
    emergencyFund: 'Alimente ton fonds d\'urgence (LEP) régulièrement.',
    regularity: 'Saisis tes transactions plus régulièrement.',
    monthlyBalance: 'Vise un solde mensuel positif ce mois.',
  }

  return { total, debtRatio, savingsRate, emergencyFund, regularity, monthlyBalance, weakestCriterion: weakest[0], advice: adviceMap[weakest[0]] || '' }
}

/** Calculate Pilotage Mode based on financial data */
export function calculatePilotageMode(store: FinanceStore): PilotageMode {
  const monthKey = getCurrentMonthKey()
  const income = getRealIncome(store, monthKey)
  const txs = store.transactions.filter(t => t.monthKey === monthKey)
  const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
  const lep = store.accounts.find(a => a.id === 'lep')?.currentBalance || 0
  const bourso = store.accounts.find(a => a.id === 'bourso')?.currentBalance || 0
  const reg = store.settings.profileRegulation

  const resteAVivre = income - expenses - reg.monthlyFamilyCharges
  const hasFragileRevenue = reg.revenueStability === 'fragile'
  const hasLowSecurity = reg.desiredSecurityLevel >= 4
  const debtRatio = income > 0 ? totalDebts / income : 0

  // Protection mode
  if (
    (income > 0 && resteAVivre < 0) ||
    (hasFragileRevenue && bourso < 100) ||
    (debtRatio > 3) ||
    (hasFragileRevenue && lep < 200)
  ) {
    return 'protection'
  }

  // Regulation mode
  if (
    (income > 0 && resteAVivre < income * 0.1) ||
    (reg.monthlyFamilyCharges > income * 0.3) ||
    (hasFragileRevenue) ||
    (lep < 500 && totalDebts > 0)
  ) {
    return 'regulation'
  }

  return 'acceleration'
}

export function getPilotageRecommendation(store: FinanceStore): { mode: PilotageMode; reason: string; adjustment: string } {
  const mode = calculatePilotageMode(store)
  const monthKey = getCurrentMonthKey()
  const income = getRealIncome(store, monthKey)
  const txs = store.transactions.filter(t => t.monthKey === monthKey)
  const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
  const reg = store.settings.profileRegulation

  if (mode === 'protection') {
    return {
      mode,
      reason: 'Cashflow fragile ou reste à vivre insuffisant.',
      adjustment: 'Suspends les investissements, priorise la trésorerie et le remboursement des dettes urgentes.',
    }
  }
  if (mode === 'regulation') {
    const suggestedInvest = Math.max(0, Math.round((income - expenses - reg.monthlyFamilyCharges) * 0.15))
    return {
      mode,
      reason: 'Charges en hausse ou sécurité insuffisante.',
      adjustment: `Réduis l'investissement à ${suggestedInvest} € ce mois, sans arrêter totalement.`,
    }
  }
  return {
    mode,
    reason: 'Revenus solides, tampon correct, reste à vivre sain.',
    adjustment: 'Continue d\'investir selon ton plan. Tu peux augmenter l\'effort si possible.',
  }
}
