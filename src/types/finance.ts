export interface Account {
  id: string
  name: string
  institution: string
  type: 'pro' | 'courant' | 'livret' | 'liquide' | 'investissement' | 'dette'
  subtype: string
  currency: string
  currentBalance: number
  isActive: boolean
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
  monthKey: string // YYYY-MM
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
  type: 'compte' | 'livret' | 'crypto' | 'assurance_vie' | 'immobilier' | 'autre'
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
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export interface CashEnvelope {
  id: string
  name: string
  currentBalance: number
  targetBalance: number
}

export interface AppSettings {
  pin: string
  pinConfigured: boolean
  theme: 'dark' | 'light'
  currency: string
  allocationRules: AllocationRules
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
}
