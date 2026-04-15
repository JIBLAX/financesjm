// ── Dynamic Account Balance ──────────────────────────────────────────────────
// Principle:
//   live balance = last validated MonthlyCheckIn balance for this account
//                + Σ revenue operations (family=revenu) since that check-in
//                - Σ charge operations (family≠revenu) since that check-in
//                where op.accountId === accountId and op.actual > 0
//
// Rules:
//   - The dynamic balance is COMPUTED, never stored.
//   - Account.currentBalance is reserved for validated bilans — never touch it here.
//   - Operations without accountId are ignored.
//   - If no check-in exists for this account, falls back to Account.currentBalance.

import type { FinanceStore } from '@/types/finance'

export interface DynamicBalance {
  /** Balance from the most recent validated bilan (MonthlyCheckIn). */
  lastCheckinBalance: number
  /** MonthKey of the check-in used as the base, or null if none found. */
  lastCheckinMonthKey: string | null
  /** Computed live balance = lastCheckinBalance + delta. */
  dynamicBalance: number
  /** Net operations delta since the last check-in (revenues − charges). */
  delta: number
}

/**
 * Compute the dynamic (live) balance for a single account.
 * Operations strictly after the check-in's monthKey are included.
 */
export function computeDynamicBalance(accountId: string, store: FinanceStore): DynamicBalance {
  // Find the most recent check-in that recorded a balance for this account
  const relevantCheckIns = store.monthlyCheckIns
    .filter(ci => ci.accountBalances?.[accountId] !== undefined)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))

  const account = store.accounts.find(a => a.id === accountId)

  if (!relevantCheckIns.length) {
    // No check-in data: use currentBalance as static base with no delta
    const base = account?.currentBalance ?? 0
    return { lastCheckinBalance: base, lastCheckinMonthKey: null, dynamicBalance: base, delta: 0 }
  }

  const latestCheckIn = relevantCheckIns[0]
  const lastCheckinBalance = latestCheckIn.accountBalances![accountId]
  const checkinMonthKey = latestCheckIn.monthKey

  // Sum confirmed operations for this account in months strictly after the check-in
  let delta = 0
  store.operations
    .filter(op =>
      op.accountId === accountId &&
      op.monthKey > checkinMonthKey &&
      (op.actual ?? 0) > 0
    )
    .forEach(op => {
      if (op.family === 'revenu') {
        delta += op.actual
      } else {
        delta -= op.actual
      }
    })

  return {
    lastCheckinBalance,
    lastCheckinMonthKey: checkinMonthKey,
    dynamicBalance: lastCheckinBalance + delta,
    delta,
  }
}

/**
 * Compute dynamic balances for all active accounts at once.
 * Returns a map of accountId → DynamicBalance.
 */
export function computeAllDynamicBalances(store: FinanceStore): Record<string, DynamicBalance> {
  const result: Record<string, DynamicBalance> = {}
  store.accounts
    .filter(a => a.isActive)
    .forEach(a => { result[a.id] = computeDynamicBalance(a.id, store) })
  return result
}
