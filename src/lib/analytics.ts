import type { FinanceStore, Alert, HealthScore, PilotageMode, ComputedMission, MissionAxis } from '@/types/finance'
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

// ─── Missions computation ────────────────────────────────────────────────────

export function computeMissions(store: FinanceStore): ComputedMission[] {
  const totalAccounts = store.accounts.filter(a => a.isActive && a.type !== 'dette').reduce((s, a) => s + a.currentBalance, 0)
  const totalAssets = store.assets.filter(a => a.type !== 'dette').reduce((s, a) => s + a.value, 0)
  const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
  const assetDebts = store.assets.filter(a => a.type === 'dette').reduce((s, a) => s + (a.outstandingBalance || a.value), 0)
  const allDebts = totalDebts + assetDebts
  const netWorth = totalAccounts + totalAssets - allDebts
  const lep = store.accounts.find(a => a.id === 'lep')?.currentBalance || 0
  const livretA = store.accounts.find(a => a.id === 'livret-a')?.currentBalance || 0
  const monthKey = getCurrentMonthKey()
  const income = getRealIncome(store, monthKey)
  const txs = store.transactions.filter(t => t.monthKey === monthKey)
  const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0

  // Check if specific account types exist
  const hasProjet = store.accounts.some(a => a.group === 'Projet' && a.isActive)
  const hasReserve = store.accounts.some(a => a.group === 'Réserve' && a.isActive)
  const hasUrgence = store.accounts.some(a => a.group === 'Urgence' && a.isActive)
  const hasPEA = store.accounts.some(a => a.name.toLowerCase().includes('pea') && a.isActive)
    || store.assets.some(a => a.name.toLowerCase().includes('pea'))
  const hasAV = store.accounts.some(a => a.name.toLowerCase().includes('assurance vie') && a.isActive)
    || store.assets.some(a => a.type === 'assurance_vie' || a.name.toLowerCase().includes('assurance vie'))
  const peaValue = store.assets.filter(a => a.name.toLowerCase().includes('pea')).reduce((s, a) => s + a.value, 0)
  const allocationConfigured = store.settings.allocationRules.groups.length > 0
    && store.settings.allocationRules.groups.some(g => g.slots.length > 0)

  // Find specific debts
  const urssafDebt = store.debts.find(d => d.name.toLowerCase().includes('urssaf'))
  const creditConsoDebt = store.debts.find(d => d.name.toLowerCase().includes('crédit') || d.name.toLowerCase().includes('credit'))

  const missions: ComputedMission[] = []
  let order = 0

  // ASSAINIR
  if (urssafDebt && urssafDebt.outstandingBalance > 0) {
    missions.push({ id: 'm_urssaf', title: 'Dette URSSAF à 0 €', emoji: '🧹', axis: 'assainir', type: 'amount_reduce', targetValue: 0, currentValue: urssafDebt.outstandingBalance, completed: urssafDebt.outstandingBalance <= 0, pct: 0, xpReward: 200, order: order++ })
  }
  if (creditConsoDebt && creditConsoDebt.outstandingBalance > 0) {
    missions.push({ id: 'm_credit', title: 'Crédit conso à 0 €', emoji: '🧹', axis: 'assainir', type: 'amount_reduce', targetValue: 0, currentValue: creditConsoDebt.outstandingBalance, completed: creditConsoDebt.outstandingBalance <= 0, pct: 0, xpReward: 400, order: order++ })
  }
  if (allDebts > 0) {
    missions.push({ id: 'm_dette_zero', title: 'Dette totale à 0 €', emoji: '🧹', axis: 'assainir', type: 'amount_reduce', targetValue: 0, currentValue: allDebts, completed: allDebts <= 0, pct: 0, xpReward: 600, order: order++ })
  }

  // Compute pct for reduce missions
  missions.forEach(m => {
    if (m.type === 'amount_reduce') {
      // For debt reduction: start value is the initial debt. We use currentValue.
      // If currentValue is 0 → 100%, otherwise estimate based on target being 0
      // We don't know the initial, so just show how close to 0
      const initialGuess = Math.max(m.currentValue, m.targetValue + 1)
      m.pct = m.currentValue <= 0 ? 100 : Math.max(0, Math.min(100, ((initialGuess - m.currentValue) / initialGuess) * 100))
      m.completed = m.currentValue <= 0
    }
  })

  // SÉCURISER
  missions.push({ id: 'm_reserve_500', title: 'Réserve bancaire 500 €', emoji: '🛡️', axis: 'securiser', type: 'amount_target', targetValue: 500, currentValue: livretA, completed: livretA >= 500, pct: Math.min(100, (livretA / 500) * 100), xpReward: 300, order: order++ })
  missions.push({ id: 'm_urgence_1000', title: 'Fonds d\'urgence 1 000 €', emoji: '🛡️', axis: 'securiser', type: 'amount_target', targetValue: 1000, currentValue: lep, completed: lep >= 1000, pct: Math.min(100, (lep / 1000) * 100), xpReward: 400, order: order++ })
  missions.push({ id: 'm_urgence_2000', title: 'Fonds d\'urgence 2 000 €', emoji: '🛡️', axis: 'securiser', type: 'amount_target', targetValue: 2000, currentValue: lep, completed: lep >= 2000, pct: Math.min(100, (lep / 2000) * 100), xpReward: 600, order: order++ })

  // STRUCTURER
  missions.push({ id: 'm_projet_cree', title: 'Compte Projet créé', emoji: '🏗️', axis: 'structurer', type: 'boolean', targetValue: 1, currentValue: hasProjet ? 1 : 0, completed: hasProjet, pct: hasProjet ? 100 : 0, xpReward: 100, order: order++ })
  missions.push({ id: 'm_reserve_cree', title: 'Compte Réserve créé', emoji: '🏗️', axis: 'structurer', type: 'boolean', targetValue: 1, currentValue: hasReserve ? 1 : 0, completed: hasReserve, pct: hasReserve ? 100 : 0, xpReward: 100, order: order++ })
  missions.push({ id: 'm_urgence_cree', title: 'Compte Urgence créé', emoji: '🏗️', axis: 'structurer', type: 'boolean', targetValue: 1, currentValue: hasUrgence ? 1 : 0, completed: hasUrgence, pct: hasUrgence ? 100 : 0, xpReward: 100, order: order++ })
  missions.push({ id: 'm_alloc_config', title: 'Répartition automatique configurée', emoji: '🏗️', axis: 'structurer', type: 'boolean', targetValue: 1, currentValue: allocationConfigured ? 1 : 0, completed: allocationConfigured, pct: allocationConfigured ? 100 : 0, xpReward: 150, order: order++ })

  // INVESTIR
  missions.push({ id: 'm_pea_ouvert', title: 'Ouvrir un PEA', emoji: '📈', axis: 'investir', type: 'boolean', targetValue: 1, currentValue: hasPEA ? 1 : 0, completed: hasPEA, pct: hasPEA ? 100 : 0, xpReward: 200, order: order++ })
  missions.push({ id: 'm_pea_100', title: 'PEA à 100 €', emoji: '📈', axis: 'investir', type: 'amount_target', targetValue: 100, currentValue: peaValue, completed: peaValue >= 100, pct: Math.min(100, (peaValue / 100) * 100), xpReward: 150, order: order++ })
  missions.push({ id: 'm_pea_1000', title: 'PEA à 1 000 €', emoji: '📈', axis: 'investir', type: 'amount_target', targetValue: 1000, currentValue: peaValue, completed: peaValue >= 1000, pct: Math.min(100, (peaValue / 1000) * 100), xpReward: 500, order: order++ })
  missions.push({ id: 'm_av_ouverte', title: 'Assurance vie ouverte', emoji: '📈', axis: 'investir', type: 'boolean', targetValue: 1, currentValue: hasAV ? 1 : 0, completed: hasAV, pct: hasAV ? 100 : 0, xpReward: 200, order: order++ })

  // ACCÉLÉRER
  missions.push({ id: 'm_net_5000', title: 'Patrimoine net 5 000 €', emoji: '🚀', axis: 'accelerer', type: 'amount_target', targetValue: 5000, currentValue: netWorth, completed: netWorth >= 5000, pct: Math.min(100, Math.max(0, (netWorth / 5000) * 100)), xpReward: 800, order: order++ })
  missions.push({ id: 'm_net_10000', title: 'Patrimoine net 10 000 €', emoji: '🚀', axis: 'accelerer', type: 'amount_target', targetValue: 10000, currentValue: netWorth, completed: netWorth >= 10000, pct: Math.min(100, Math.max(0, (netWorth / 10000) * 100)), xpReward: 1000, order: order++ })
  missions.push({ id: 'm_epargne_20', title: 'Taux d\'épargne > 20%', emoji: '🚀', axis: 'accelerer', type: 'amount_target', targetValue: 20, currentValue: Math.max(0, savingsRate), completed: savingsRate >= 20, pct: Math.min(100, (savingsRate / 20) * 100), xpReward: 500, order: order++ })
  missions.push({ id: 'm_net_25000', title: 'Patrimoine 25 000 €', emoji: '🚀', axis: 'accelerer', type: 'amount_target', targetValue: 25000, currentValue: netWorth, completed: netWorth >= 25000, pct: Math.min(100, Math.max(0, (netWorth / 25000) * 100)), xpReward: 1500, order: order++ })
  missions.push({ id: 'm_net_50000', title: 'Patrimoine 50 000 €', emoji: '🚀', axis: 'accelerer', type: 'amount_target', targetValue: 50000, currentValue: netWorth, completed: netWorth >= 50000, pct: Math.min(100, Math.max(0, (netWorth / 50000) * 100)), xpReward: 2000, order: order++ })
  missions.push({ id: 'm_net_100000', title: 'Patrimoine 100 000 €', emoji: '🚀', axis: 'accelerer', type: 'amount_target', targetValue: 100000, currentValue: netWorth, completed: netWorth >= 100000, pct: Math.min(100, Math.max(0, (netWorth / 100000) * 100)), xpReward: 5000, order: order++ })

  return missions
}

// ─── Adaptive Advice ─────────────────────────────────────────────────────────

export function generateAdaptiveAdvice(store: FinanceStore): string[] {
  const advice: string[] = []
  const monthKey = getCurrentMonthKey()
  const income = getRealIncome(store, monthKey)
  const txs = store.transactions.filter(t => t.monthKey === monthKey)
  const expenses = txs.filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalDebts = store.debts.reduce((s, d) => s + d.outstandingBalance, 0)
  const lep = store.accounts.find(a => a.id === 'lep')?.currentBalance || 0
  const livretA = store.accounts.find(a => a.id === 'livret-a')?.currentBalance || 0
  const mode = calculatePilotageMode(store)
  const reg = store.settings.profileRegulation
  const profile = store.settings.investorProfile

  if (mode === 'protection') {
    advice.push('🛑 Suspends temporairement tout investissement ce mois-ci. Priorise la trésorerie et les dettes urgentes.')
  }

  if (totalDebts > 0 && lep < 500) {
    advice.push('💡 Ton fonds d\'urgence est trop faible pour ton niveau de dettes. Renforce-le avant d\'accélérer les remboursements.')
  }

  if (totalDebts > 0) {
    const creditConso = store.debts.find(d => d.name.toLowerCase().includes('crédit') || d.name.toLowerCase().includes('credit'))
    if (creditConso && creditConso.monthlyPayment > 0) {
      const months = Math.ceil(creditConso.outstandingBalance / creditConso.monthlyPayment)
      if (income - expenses > 50) {
        advice.push(`💡 Tu peux accélérer le remboursement de +50 €/mois et passer de ${months} à ${Math.max(1, months - Math.floor(50 / creditConso.monthlyPayment * months / 10))} mois.`)
      }
    }
  }

  if (livretA < 500 && totalDebts === 0) {
    advice.push('🛡️ Renforce ta réserve bancaire (Livret A) avant de passer aux investissements.')
  }

  if (lep >= 2000 && totalDebts === 0 && livretA >= 500) {
    advice.push('🚀 Ta structure est prête pour passer au palier d\'investissement suivant. Ouvre un PEA si ce n\'est pas fait.')
  }

  if (mode === 'regulation') {
    const suggestedInvest = Math.max(0, Math.round((income - expenses - reg.monthlyFamilyCharges) * 0.15))
    advice.push(`⚙️ Réduis l'investissement à ${suggestedInvest} € ce mois. Charges en hausse ou sécurité insuffisante.`)
  }

  if (reg.revenueStability === 'fragile') {
    advice.push('⚠️ Revenus fragiles détectés. Constitue 3 mois de charges en fonds d\'urgence avant toute autre action.')
  }

  if (profile === 'prudent') {
    advice.push('📘 Profil prudent : privilégie les livrets et fonds euros avant les ETF actions.')
  } else if (profile === 'dynamique' || profile === 'entrepreneur') {
    if (lep >= 2000 && totalDebts === 0) {
      advice.push('🔥 Profil dynamique : tu peux viser 70% ETF World + 20% émergents + 10% obligataire.')
    }
  }

  return advice.slice(0, 4)
}
