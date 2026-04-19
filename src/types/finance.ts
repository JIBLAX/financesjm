export interface Account {
  id: string
  name: string
  institution: string
  type: 'pro' | 'courant' | 'livret' | 'liquide' | 'investissement' | 'dette' | 'epargne_projet'
  subtype: string
  currency: string
  currentBalance: number
  isActive: boolean
  group?: string
  note?: string
}

// Revenue source
export type RevenueSource = 'be_activ' | 'client_direct' | 'salaire' | 'caf' | 'ami_famille' | 'remboursement' | 'vente' | 'prime' | 'revenus_financiers' | 'virement_interne' | 'autre'

// Revenue type
export type RevenueType = 'revenu_pro_recurrent' | 'revenu_pro_exceptionnel' | 'salaire' | 'cadeau' | 'remboursement' | 'aide_soutien' | 'aide_sociale' | 'virement_amical' | 'vente_exceptionnelle' | 'cashback' | 'interets' | 'dividendes' | 'plus_value' | 'transfert_interne' | 'autre_revenu'

export type RevenueRecurrence = 'unique' | 'hebdomadaire' | 'mensuelle' | 'trimestrielle' | 'annuelle' | 'irreguliere'

// Types that should NOT count as real revenue
export const NON_REAL_REVENUE_TYPES: RevenueType[] = ['cadeau', 'remboursement', 'transfert_interne', 'virement_amical']

// Be Activ specific
export type BeActivOffer = 'jm_pass_coaching' | 'coaching_a_la_carte' | 'activ_program_essentiel' | 'activ_reset_online' | 'activ_reset_hybride' | 'cardio_mouv' | 'activ_training' | 'boutique'
export type BeActivChannel = 'banque' | 'especes' | 'qonto' | 'autre'
export type BeActivPaymentMode = 'virement' | 'carte' | 'especes' | 'plateforme' | 'autre'
export type BeActivStatus = 'prevu' | 'en_attente' | 'recu'
export type BaSaleType = 'individual' | 'groupe' | 'collectif'

export interface BeActivDetails {
  client: string
  // ── Business catalog linkage ───────────────────────────────────────────────
  business_offer_id?: string       // Offer ID from BE ACTIV Business catalog
  business_offer_name?: string     // Name snapshot at time of sale
  catalog_price_snapshot?: number  // Catalog (standard) price at time of sale
  actual_amount?: number           // Amount actually collected — mirrors Transaction.amount
  needs_review?: boolean           // true if offer not confirmed from Business catalog
  // ─────────────────────────────────────────────────────────────────────────
  channel: BeActivChannel | ''
  paymentMode: BeActivPaymentMode | ''
  status: BeActivStatus
  // For installment payments
  isInstallment: boolean
  totalAmount?: number
  installmentLabel?: string // e.g. "1/2", "2/3"
  sale_type?: BaSaleType
  participant_count?: number
  is_sap?: boolean
  sap_hours?: number
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
  // V2 Revenue typing
  revenueSource?: RevenueSource
  revenueType?: RevenueType
  revenueRecurrence?: RevenueRecurrence
  isRealRevenue?: boolean // computed from revenueType
  beActivDetails?: BeActivDetails
}

export interface AllocationSlot {
  accountId: string  // references Account.id
  label: string      // display name
  percent: number    // absolute % of the income stream (bancaire or cash)
}

export interface AllocationGroup {
  id: string
  label: string
  incomeType: 'bancaire' | 'cash'
  slots: AllocationSlot[]
}

export interface AllocationRules {
  groups: AllocationGroup[]
}

// Enhanced Asset types
export type AssetType = 'compte_bancaire' | 'livret_epargne' | 'assurance_vie' | 'actions' | 'etf' | 'crypto' | 'immobilier' | 'vehicule' | 'objet_valeur' | 'autre_actif' | 'paris_sportif' | 'dette'

export type AssetClass = 'cash' | 'epargne' | 'marches' | 'crypto' | 'immobilier' | 'autres' | 'dettes'

export interface Asset {
  id: string
  name: string
  type: AssetType
  value: number // total value (computed for some types)
  platform: string
  notes: string
  currency: string
  updatedAt: string
  // Actions / ETF / Crypto
  ticker?: string
  symbol?: string
  quantity?: number
  unitPrice?: number
  priceCurrency?: string
  manualExchangeRate?: number
  // Immobilier
  propertyType?: string
  estimatedValue?: number
  outstandingMortgage?: number
  // Debt
  lender?: string
  outstandingBalance?: number
  monthlyPayment?: number
  rate?: number
}

export interface Debt {
  id: string
  name: string
  lender: string
  outstandingBalance: number
  monthlyPayment: number
  rate: number
  notes: string
  updatedAt?: string
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
  isManual?: boolean
  assetBreakdown?: Record<string, number>
  accountBalances?: Record<string, number>  // per-account balances for re-editing
  totalRevenuesPro?: number   // revenus ops pro
  totalChargesPro?: number    // charges ops pro
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

// Alerts & Insights
export type AlertSeverity = 'critical' | 'warning' | 'info' | 'positive'

export interface Alert {
  id: string
  severity: AlertSeverity
  message: string
  icon: string
  dismissed: boolean
  createdAt: string
}

// Quests
export type QuestCategory = 'assainissement' | 'securisation' | 'croissance' | 'liberte' | 'liberte2' | 'custom'
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

// Health Score
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

// Investor Profile
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

// Profile Regulation
export type LifeSituation = 'solo' | 'couple' | 'famille'
export type RevenueStability = 'stable' | 'variable' | 'fragile'
export type PilotageMode = 'acceleration' | 'regulation' | 'protection'

export interface ProfileRegulation {
  lifeSituation: LifeSituation
  childrenCount: number
  monthlyFamilyCharges: number
  revenueStability: RevenueStability
  desiredSecurityLevel: number // 1-5
  financialStressTolerance: number // 1-5
}

// Be Activ connection
export type BeActivConnectionStatus = 'not_connected' | 'coming_soon' | 'connected'

// Fiscal / professional status
export type FiscalStatus =
  | 'micro_bnc'            // Micro-entrepreneur BNC (coach, conseil, freelance libéral)
  | 'micro_bic_services'   // Micro-entrepreneur BIC prestation de services
  | 'micro_bic_vente'      // Micro-entrepreneur BIC vente/artisan
  | 'salarie'              // Salarié uniquement
  | 'portage_salarial'     // Portage salarial (JUMP, etc.)
  | 'salarie_micro_bnc'    // Salarié + Micro BNC
  | 'salarie_micro_bic'    // Salarié + Micro BIC
  | 'salarie_portage'      // Salarié + Portage salarial

export interface AppSettings {
  pin: string
  pinConfigured: boolean
  theme: 'dark' | 'light'
  currency: string
  allocationRules: AllocationRules
  investorProfile: InvestorProfile
  investorQuestionnaire: InvestorQuestionnaire
  level: number
  xp: number
  profileRegulation: ProfileRegulation
  beActivConnection: BeActivConnectionStatus
  fiscalStatus?: FiscalStatus
}

export interface MonthlyCheckIn {
  id: string
  monthKey: string
  doneAt: string
  accountBalances: Record<string, number>
  assetValues: Record<string, number>       // assetId → valeur totale (devise choisie)
  assetQuantities?: Record<string, number>  // assetId → quantité (bag, pour cryptos)
  assetUnitPrices?: Record<string, number>  // assetId → prix unitaire au moment du bilan
  assetCurrencies?: Record<string, 'EUR' | 'USD'> // assetId → devise du prix saisi
  debtBalances: Record<string, number>
}

// ─── Budget Operations ───────────────────────────────────────────────────────

export type OperationFamily = 'charge_fixe' | 'charge_variable' | 'revenu'
export type OperationScope = 'perso' | 'pro'

export interface Operation {
  id: string
  monthKey: string
  family: OperationFamily
  scope: OperationScope
  label: string
  categoryId: string
  subcategoryId?: string   // used for revenue sub-offers
  forecast: number         // prévision
  actual: number           // réel (0 = not yet filled)
  isTemplate: boolean      // if true, auto-carry to next months
  templateId?: string      // links copies to their origin template
  recurrenceMonths?: number // if set, stop copying after N total instances (undefined = indefinite)
  skipped?: boolean        // true = recurring op explicitly skipped this month (not re-created)
  accountId?: string       // account affected by this operation (used for dynamic balance)
  sourceType?: 'bank' | 'cash'  // for revenue ops: how the money is received
  note?: string
  tvaRate?: number         // TVA rate on pro revenue: 0.20 | 0.10 | 0.055 — undefined = pas de TVA
  clientName?: string      // kept for backwards compat — label is now the primary name
  date?: string            // ISO date string (optional, for individual op tracking)
  beActivClientId?: string  // ID du client BE ACTIV sélectionné (restauré à l'édition)
  beActivOfferId?: string   // ID de l'offre BE ACTIV sélectionnée (restauré à l'édition)
}

export interface OpCategory {
  id: string
  family: OperationFamily
  scope?: OperationScope   // undefined = all scopes, set = scope-specific
  name: string
  icon: string
  order: number
}

export interface OpSubcategory {
  id: string
  categoryId: string
  name: string
  icon?: string
}

// ─── Missions (computed, not stored) ─────────────────────────────────────────

export type MissionType = 'amount_target' | 'amount_reduce' | 'count' | 'boolean'
export type MissionAxis = 'assainir' | 'securiser' | 'structurer' | 'investir' | 'accelerer'

export interface ComputedMission {
  id: string
  title: string
  emoji: string
  axis: MissionAxis
  type: MissionType
  targetValue: number
  currentValue: number
  completed: boolean
  pct: number
  xpReward: number
  order: number
}

// ─── Projects / Objectifs ────────────────────────────────────────────────────

export type ProjectTheme =
  | 'tech' | 'maison' | 'mobilier' | 'cuisine' | 'mode' | 'beaute' | 'sante'
  | 'sport' | 'voyage' | 'auto' | 'velo' | 'bureau' | 'etudes' | 'photo'
  | 'audio' | 'gaming' | 'culture' | 'enfants' | 'animaux' | 'cadeaux'
  | 'lifestyle' | 'business' | 'immobilier' | 'travaux' | 'abonnements'
  | 'collectibles' | 'solidarite'

export interface Project {
  id: string
  theme: ProjectTheme
  label: string
  targetAmount: number
  savedAmount: number
  targetDate?: string
  createdAt: string
  completedAt?: string
  milestonesReached: number[] // e.g. [25, 50]
}

// ─────────────────────────────────────────────────────────────────────────────

export interface FinanceStore {
  _schemaVersion: number   // bump when a breaking change is introduced — used in loadStore migrations
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
  monthlyJournals: Record<string, string>
  operations: Operation[]
  opCategories: OpCategory[]
  opSubcategories: OpSubcategory[]
  monthlyCheckIns: MonthlyCheckIn[]
  monthlyBudgets: Record<string, Record<string, number>>
  allocationInjections: Record<string, Record<string, number>>
  projects: Project[]
}
