import type { FinanceStore } from '@/types/finance'
import { DEFAULT_SETTINGS, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_CASH_ENVELOPES, DEFAULT_QUESTS, DEFAULT_PROFILE_REGULATION, DEFAULT_OP_CATEGORIES, DEFAULT_OP_SUBCATEGORIES } from './constants'

const STORE_KEY = 'finances_jm_store'
const PIN_SESSION_KEY = 'finances_jm_session'

function getDefaultStore(): FinanceStore {
  return {
    settings: { ...DEFAULT_SETTINGS },
    accounts: [...DEFAULT_ACCOUNTS],
    transactions: [],
    assets: [],
    debts: [],
    monthlySnapshots: [],
    categories: [...DEFAULT_CATEGORIES],
    cashEnvelopes: [...DEFAULT_CASH_ENVELOPES],
    quests: [...DEFAULT_QUESTS],
    dismissedAlerts: [],
    monthlyJournals: {},
    operations: [],
    opCategories: DEFAULT_OP_CATEGORIES.map(c => ({ ...c })),
    opSubcategories: DEFAULT_OP_SUBCATEGORIES.map(s => ({ ...s })),
    monthlyCheckIns: [],
    monthlyBudgets: {},
    allocationInjections: {},
    projects: [],
  }
}

export function loadStore(): FinanceStore {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return getDefaultStore()
    const parsed = JSON.parse(raw)
    const defaults = getDefaultStore()
    return {
      ...defaults,
      ...parsed,
      settings: {
        ...defaults.settings,
        ...parsed.settings,
        allocationRules: parsed.settings?.allocationRules?.groups
          ? parsed.settings.allocationRules
          : defaults.settings.allocationRules,
        investorQuestionnaire: { ...defaults.settings.investorQuestionnaire, ...(parsed.settings?.investorQuestionnaire || {}) },
        profileRegulation: { ...DEFAULT_PROFILE_REGULATION, ...(parsed.settings?.profileRegulation || {}) },
        beActivConnection: parsed.settings?.beActivConnection || 'not_connected',
        activeScenario: null,
      },
      quests: parsed.quests?.length
        ? parsed.quests.filter((q: any) => q.category !== 'liberte3')
        : defaults.quests,
      dismissedAlerts: parsed.dismissedAlerts || [],
      monthlyJournals: parsed.monthlyJournals || {},
      operations: parsed.operations || [],
      opCategories: parsed.opCategories?.some((c: any) => c.id?.startsWith('opc_p_') || c.id?.startsWith('opc_r_'))
        ? parsed.opCategories
        : DEFAULT_OP_CATEGORIES.map(c => ({ ...c })),
      opSubcategories: parsed.opSubcategories?.some((s: any) => s.categoryId === 'opc_r_be_activ')
        ? parsed.opSubcategories
        : DEFAULT_OP_SUBCATEGORIES.map(s => ({ ...s })),
      monthlyCheckIns: parsed.monthlyCheckIns || [],
      monthlyBudgets: parsed.monthlyBudgets || {},
      allocationInjections: parsed.allocationInjections || {},
      projects: parsed.projects || [],
    }
  } catch {
    return getDefaultStore()
  }
}

export function saveStore(store: FinanceStore): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export function exportData(): string {
  const store = loadStore()
  return JSON.stringify(store, null, 2)
}

export function importData(json: string): FinanceStore {
  const store = JSON.parse(json) as FinanceStore
  saveStore(store)
  return store
}

export function resetStore(): FinanceStore {
  const fresh = getDefaultStore()
  saveStore(fresh)
  return fresh
}

export function isSessionValid(): boolean {
  try {
    const raw = localStorage.getItem(PIN_SESSION_KEY)
    if (!raw) return false
    const { expiresAt } = JSON.parse(raw)
    return Date.now() < expiresAt
  } catch { return false }
}

export function createSession(durationMinutes: number = 30): void {
  localStorage.setItem(PIN_SESSION_KEY, JSON.stringify({ expiresAt: Date.now() + durationMinutes * 60 * 1000 }))
}

export function clearSession(): void {
  localStorage.removeItem(PIN_SESSION_KEY)
}
