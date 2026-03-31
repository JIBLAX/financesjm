export interface Account {
  id: string
  name: string
  institution: string
  type: 'pro' | 'courant' | 'livret' | 'liquide' | 'investissement' | 'dette' | 'epargne_projet'
  subtype: string
  currency: string
  currentBalance: number
  isActive: boolean
  group?: string // 'bunq' | 'main' etc
  note?: string
}

export interface Transaction {
  id: string
  date: string
  label: string
  amount: number
  direction: 'income' | 'expense' | 'transfer'
  sourceType: 'bank' | 'cash'
  accountId: string
  categoryId: string
  monthKey: string
  note: string
  isRecurring: boolean
}

export interface AllocationRules {
  proPercent: number
  personalBasePercent: number
  boursoPercent: number
  livretAPercent: number
  lepPercent: number
  cashLibertePercent: number
  cashSecurityPercent: number
  cashVoyagePercent: number
}

export interface Asset {
  id: string
  name: string
  type: 'compte' | 'livret' | 'crypto' | 'assurance_vie' | 'immobilier' | 'pea' | 'per' | 'autre'
  value: number
  platform: string
  notes: string
}

export interface Debt {
  id: string
  name: string
  lender: string
  outstandingBalance: number
  monthlyPayment: number
  rate: number
  notes: string
}

export interface MonthlySnapshot {
  id: string
  monthKey: string
  totalIncomeBank: number
  totalIncomeCash: number
  totalExpenses: number
  totalAssets: number
  totalDebts: number
  netWorth: number
  xpGained?: number
  journalNote?: string
  dismissed?: boolean
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  classification?: 'indispensable' | 'optimisable' | 'impulsive'
}

export interface CashEnvelope {
  id: string
  name: string
  currentBalance: number
  targetBalance: number
}

// V2 — Alerts & Insights
export type AlertSeverity = 'critical' | 'warning' | 'info' | 'positive'

export interface Alert {
  id: string
  severity: AlertSeverity
  message: string
  icon: string
  dismissed: boolean
  createdAt: string
}

// V2 — Quests
export type QuestCategory = 'assainissement' | 'securisation' | 'croissance' | 'liberte' | 'liberte2' | 'liberte3' | 'custom'
export type QuestStatus = 'active' | 'paused' | 'completed' | 'locked'

export interface QuestStep {
  label: string
  completed: boolean
}

export interface Quest {
  id: string
  title: string
  emoji: string
  category: QuestCategory
  description: string
  targetAmount: number
  currentAmount: number
  linkedAccountId?: string
  steps: QuestStep[]
  xpReward: number
  status: QuestStatus
  isCustom: boolean
  targetDate?: string
  order: number
}

// V2 — Health Score
export interface HealthScore {
  total: number
  debtRatio: number
  savingsRate: number
  emergencyFund: number
  regularity: number
  monthlyBalance: number
  weakestCriterion: string
  advice: string
}

// V3 — Investor Profile
export type InvestorProfile = 'prudent' | 'equilibre' | 'dynamique' | 'entrepreneur' | null

export interface InvestorQuestionnaire {
  riskTolerance: 'low' | 'moderate' | 'high' | null
  horizon: 'short' | 'medium' | 'long' | null
  realEstate: 'later' | 'soon' | 'no' | null
  crypto: 'none' | 'small' | 'already' | null
  income: 'stable' | 'variable' | 'growing' | null
  priority: 'passive_income' | 'max_patrimony' | 'security' | null
  completed: boolean
}

// V4 — Liberty Scenario
export type LibertyScenario = 'bourse' | 'immo_bourse' | 'business' | null

export interface AppSettings {
  pin: string
  pinConfigured: boolean
  theme: 'dark' | 'light'
  currency: string
  allocationRules: AllocationRules
  investorProfile: InvestorProfile
  investorQuestionnaire: InvestorQuestionnaire
  activeScenario: LibertyScenario
  level: number
  xp: number
}

export interface FinanceStore {
  settings: AppSettings
  accounts: Account[]
  transactions: Transaction[]
  assets: Asset[]
  debts: Debt[]
  monthlySnapshots: MonthlySnapshot[]
  categories: Category[]
  cashEnvelopes: CashEnvelope[]
  quests: Quest[]
  dismissedAlerts: string[]
  monthlyJournals: Record<string, string> // monthKey -> note
}
