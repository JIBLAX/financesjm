import type { Account, AllocationRules, Category, CashEnvelope, AppSettings, Quest, InvestorQuestionnaire, ProfileRegulation, RevenueSource, RevenueType, RevenueRecurrence, BeActivOffer, BeActivChannel, BeActivPaymentMode, BeActivStatus, AssetType, OpCategory, OpSubcategory } from '@/types/finance'

export const DEFAULT_PROFILE_REGULATION: ProfileRegulation = {
  lifeSituation: 'solo',
  childrenCount: 0,
  monthlyFamilyCharges: 0,
  revenueStability: 'variable',
  desiredSecurityLevel: 3,
  financialStressTolerance: 3,
}

export const DEFAULT_INVESTOR_QUESTIONNAIRE: InvestorQuestionnaire = {
  riskTolerance: null, horizon: null, realEstate: null, crypto: null, income: null, priority: null, completed: false,
}

export const DEFAULT_ALLOCATION_RULES: AllocationRules = {
  proPercent: 30, personalBasePercent: 70, boursoPercent: 80, livretAPercent: 10, lepPercent: 10,
  cashLibertePercent: 50, cashSecurityPercent: 25, cashVoyagePercent: 25,
}

export const DEFAULT_SETTINGS: AppSettings = {
  pin: '', pinConfigured: false, theme: 'dark', currency: 'EUR',
  allocationRules: DEFAULT_ALLOCATION_RULES,
  investorProfile: null,
  investorQuestionnaire: DEFAULT_INVESTOR_QUESTIONNAIRE,
  activeScenario: null,
  level: 1, xp: 0,
  profileRegulation: DEFAULT_PROFILE_REGULATION,
  beActivConnection: 'not_connected',
}

export const ACCOUNT_GROUPS = ['Professionnel', 'Vie', 'Réserve', 'Urgence', 'Voyage', 'Cadeaux', 'Projet'] as const

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'qonto', name: 'Activité pro', institution: 'Qonto', type: 'pro', subtype: 'compte courant', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Professionnel' },
  { id: 'bourso', name: 'Vie courante', institution: 'BoursoBank', type: 'courant', subtype: 'compte courant', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Vie' },
  { id: 'livret-a', name: 'Tampon bancaire', institution: 'Caisse d\'Épargne', type: 'livret', subtype: 'Livret A', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Réserve' },
  { id: 'lep', name: 'Fonds d\'urgence', institution: 'Caisse d\'Épargne', type: 'livret', subtype: 'LEP', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Urgence' },
  { id: 'cash-liberte', name: 'Cash liberté', institution: 'Espèces', type: 'liquide', subtype: '', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Vie' },
  { id: 'cash-securite', name: 'Fonds sécurité liquide', institution: 'Espèces', type: 'liquide', subtype: '', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Réserve' },
  { id: 'cash-voyage', name: 'Voyage', institution: 'Espèces', type: 'liquide', subtype: '', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Voyage' },
  { id: 'bunq-voyage', name: 'Voyages BUNQ', institution: 'BUNQ', type: 'epargne_projet', subtype: 'épargne projet', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Voyage' },
  { id: 'bunq-fiscal', name: 'Réserve Fiscale BUNQ', institution: 'BUNQ', type: 'pro', subtype: 'réserve fiscale', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Professionnel' },
  { id: 'bunq-projet', name: 'Projet BUNQ', institution: 'BUNQ', type: 'epargne_projet', subtype: 'projet', currency: 'EUR', currentBalance: 0, isActive: true, group: 'Projet', note: '2 retraits maximum par mois' },
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'loyer', name: 'Loyer', icon: '🏠', color: '220 70% 55%', classification: 'indispensable' },
  { id: 'electricite', name: 'Électricité', icon: '⚡', color: '45 90% 55%', classification: 'indispensable' },
  { id: 'internet', name: 'Internet', icon: '🌐', color: '200 70% 55%', classification: 'optimisable' },
  { id: 'telephone', name: 'Téléphone', icon: '📱', color: '280 60% 55%', classification: 'optimisable' },
  { id: 'assurances', name: 'Assurances', icon: '🛡️', color: '160 50% 45%', classification: 'indispensable' },
  { id: 'banque', name: 'Banque', icon: '🏦', color: '210 60% 50%', classification: 'indispensable' },
  { id: 'urssaf', name: 'URSSAF', icon: '📋', color: '0 60% 50%', classification: 'indispensable' },
  { id: 'tva', name: 'TVA', icon: '📊', color: '30 70% 50%', classification: 'indispensable' },
  { id: 'impots', name: 'Impôts', icon: '🏛️', color: '340 50% 50%', classification: 'indispensable' },
  { id: 'credit-conso', name: 'Crédit conso', icon: '💳', color: '0 50% 55%', classification: 'indispensable' },
  { id: 'essence', name: 'Essence', icon: '⛽', color: '25 80% 50%', classification: 'indispensable' },
  { id: 'nourriture', name: 'Nourriture', icon: '🍽️', color: '120 50% 45%', classification: 'indispensable' },
  { id: 'abonnements', name: 'Abonnements', icon: '🔄', color: '260 60% 55%', classification: 'optimisable' },
  { id: 'sante', name: 'Santé', icon: '🏥', color: '350 60% 50%', classification: 'indispensable' },
  { id: 'pro', name: 'Pro', icon: '💼', color: '210 50% 50%', classification: 'indispensable' },
  { id: 'sorties', name: 'Sorties', icon: '🎉', color: '300 60% 55%', classification: 'impulsive' },
  { id: 'voyage', name: 'Voyage', icon: '✈️', color: '190 70% 50%', classification: 'impulsive' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '320 60% 55%', classification: 'impulsive' },
  { id: 'livraison', name: 'Livraison', icon: '📦', color: '15 60% 50%', classification: 'impulsive' },
  { id: 'divers', name: 'Divers', icon: '📦', color: '0 0% 55%', classification: 'impulsive' },
  { id: 'revenu', name: 'Revenu', icon: '💰', color: '142 60% 50%' },
]

export const DEFAULT_CASH_ENVELOPES: CashEnvelope[] = [
  { id: 'cash-liberte', name: 'Cash liberté', currentBalance: 0, targetBalance: 500 },
  { id: 'cash-securite', name: 'Fonds sécurité liquide', currentBalance: 0, targetBalance: 1000 },
  { id: 'cash-voyage', name: 'Voyage', currentBalance: 0, targetBalance: 2000 },
]

export const DEFAULT_QUESTS: Quest[] = [
  // 🧹 ASSAINISSEMENT
  { id: 'q1', title: 'Éponger les dettes URSSAF', emoji: '🧹', category: 'assainissement', description: 'Rembourser intégralement les dettes URSSAF', targetAmount: 0, currentAmount: 0, linkedAccountId: 'bunq-fiscal', steps: [{ label: 'Identifier le solde exact', completed: false }, { label: 'Virer 178 €/mois depuis Qonto vers Réserve Fiscale BUNQ', completed: false }, { label: 'Ne pas interrompre les versements', completed: false }], xpReward: 200, status: 'active', isCustom: false, order: 1 },
  { id: 'q2', title: 'Rembourser le crédit conso CE', emoji: '🧹', category: 'assainissement', description: 'Objectif : 789,85 €', targetAmount: 789.85, currentAmount: 0, steps: [{ label: 'Maintenir 102,50 €/mois', completed: false }, { label: 'Ajouter 50 €/mois si possible', completed: false }, { label: 'Ne pas contracter de nouveau crédit', completed: false }], xpReward: 400, status: 'active', isCustom: false, order: 2 },
  { id: 'q3', title: 'Atteindre 0 € de dette totale', emoji: '🧹', category: 'assainissement', description: 'Quête finale d\'assainissement — débloque Niveau 2', targetAmount: 0, currentAmount: 0, steps: [{ label: 'Compléter les quêtes 1 et 2', completed: false }], xpReward: 600, status: 'locked', isCustom: false, order: 3 },
  // 🛡️ SÉCURISATION
  { id: 'q4', title: 'Tampon bancaire 500 €', emoji: '🛡️', category: 'securisation', description: 'Progression live depuis solde Livret A', targetAmount: 500, currentAmount: 0, linkedAccountId: 'livret-a', steps: [{ label: 'Activer le virement automatique de 10% perso', completed: false }, { label: 'Ne pas toucher ce livret', completed: false }, { label: 'Atteindre 500 €', completed: false }], xpReward: 300, status: 'active', isCustom: false, order: 4 },
  { id: 'q5', title: 'Fonds d\'urgence 1 000 €', emoji: '🛡️', category: 'securisation', description: 'Progression live depuis solde LEP', targetAmount: 1000, currentAmount: 0, linkedAccountId: 'lep', steps: [{ label: 'Atteindre 1 000 € sur le LEP', completed: false }], xpReward: 400, status: 'active', isCustom: false, order: 5 },
  { id: 'q6', title: 'Fonds d\'urgence complet 2 000 €', emoji: '🛡️', category: 'securisation', description: 'Objectif final LEP — débloque Niveau 3', targetAmount: 2000, currentAmount: 0, linkedAccountId: 'lep', steps: [{ label: 'Atteindre 2 000 € sur le LEP', completed: false }], xpReward: 600, status: 'locked', isCustom: false, order: 6 },
  // 🚀 CROISSANCE
  { id: 'q7', title: 'Patrimoine net 5 000 €', emoji: '🚀', category: 'croissance', description: 'Calculé en temps réel', targetAmount: 5000, currentAmount: 0, steps: [], xpReward: 800, status: 'active', isCustom: false, order: 7 },
  { id: 'q8', title: 'Ouvrir un PEA', emoji: '🚀', category: 'croissance', description: 'Checklist manuelle', targetAmount: 0, currentAmount: 0, steps: [{ label: 'Choisir courtier (Trade Republic / Fortuneo)', completed: false }, { label: 'Ouvrir le compte', completed: false }, { label: 'Virer 100 €', completed: false }, { label: 'Acheter premier ETF World', completed: false }], xpReward: 200, status: 'active', isCustom: false, order: 8 },
  { id: 'q9', title: 'Taux d\'épargne > 20%', emoji: '🚀', category: 'croissance', description: 'Calculé automatiquement chaque mois', targetAmount: 20, currentAmount: 0, steps: [], xpReward: 500, status: 'active', isCustom: false, order: 9 },
  { id: 'q10', title: 'Patrimoine 10 000 €', emoji: '🚀', category: 'croissance', description: 'Débloque le niveau 4', targetAmount: 10000, currentAmount: 0, steps: [], xpReward: 1000, status: 'locked', isCustom: false, order: 10 },
  // 👑 LIBERTÉ
  { id: 'q11', title: 'Revenus passifs > 200 €/mois', emoji: '👑', category: 'liberte', description: 'Saisie manuelle', targetAmount: 200, currentAmount: 0, steps: [], xpReward: 1500, status: 'locked', isCustom: false, order: 11 },
  { id: 'q12', title: 'PEA > 3 000 €', emoji: '👑', category: 'liberte', description: 'Saisie manuelle du solde PEA', targetAmount: 3000, currentAmount: 0, steps: [], xpReward: 1000, status: 'locked', isCustom: false, order: 12 },
  { id: 'q13', title: 'Patrimoine 20 000 €', emoji: '👑', category: 'liberte', description: 'Calculé en temps réel', targetAmount: 20000, currentAmount: 0, steps: [], xpReward: 2000, status: 'locked', isCustom: false, order: 13 },
  { id: 'q14', title: 'Maître financier 👑', emoji: '👑', category: 'liberte', description: 'Toutes conditions du niveau 5 remplies', targetAmount: 0, currentAmount: 0, steps: [], xpReward: 5000, status: 'locked', isCustom: false, order: 14 },
  // 🏁 LIBERTÉ 2.0 — Road to 100K (solidité)
  { id: 'q15', title: 'Premier investissement — 100 € en ETF World', emoji: '🏁', category: 'liberte2', description: '', targetAmount: 100, currentAmount: 0, steps: [], xpReward: 300, status: 'locked', isCustom: false, order: 15 },
  { id: 'q16', title: 'PEA > 1 000 €', emoji: '🏁', category: 'liberte2', description: '', targetAmount: 1000, currentAmount: 0, steps: [], xpReward: 500, status: 'locked', isCustom: false, order: 16 },
  { id: 'q17', title: 'Assurance vie ouverte', emoji: '🏁', category: 'liberte2', description: '', targetAmount: 0, currentAmount: 0, steps: [{ label: 'Ouvrir une assurance vie', completed: false }], xpReward: 300, status: 'locked', isCustom: false, order: 17 },
  { id: 'q18', title: 'Taux d\'épargne moyen > 25% sur 3 mois', emoji: '🏁', category: 'liberte2', description: '', targetAmount: 25, currentAmount: 0, steps: [], xpReward: 600, status: 'locked', isCustom: false, order: 18 },
  { id: 'q19', title: 'Patrimoine 25 000 €', emoji: '🏁', category: 'liberte2', description: '', targetAmount: 25000, currentAmount: 0, steps: [], xpReward: 1000, status: 'locked', isCustom: false, order: 19 },
  { id: 'q20', title: 'Patrimoine 50 000 €', emoji: '🏁', category: 'liberte2', description: '', targetAmount: 50000, currentAmount: 0, steps: [], xpReward: 2000, status: 'locked', isCustom: false, order: 20 },
  { id: 'q21', title: 'Patrimoine 100 000 € — Solidité 🎯', emoji: '🎯', category: 'liberte2', description: '', targetAmount: 100000, currentAmount: 0, steps: [], xpReward: 10000, status: 'locked', isCustom: false, order: 21 },
]

export const LEVELS = [
  { level: 1, name: 'Novice', minXp: 0, emoji: '🌱' },
  { level: 2, name: 'Apprenti', minXp: 1200, emoji: '📘' },
  { level: 3, name: 'Stable', minXp: 3500, emoji: '🛡️' },
  { level: 4, name: 'Indépendant', minXp: 7000, emoji: '🚀' },
  { level: 5, name: 'Maître financier', minXp: 15000, emoji: '👑' },
]

export const QUEST_CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  assainissement: { label: 'Assainissement', emoji: '🧹', color: 'text-amber-400' },
  securisation: { label: 'Sécurisation', emoji: '🛡️', color: 'text-blue-400' },
  croissance: { label: 'Croissance', emoji: '🚀', color: 'text-emerald-400' },
  liberte: { label: 'Liberté', emoji: '👑', color: 'text-purple-400' },
  liberte2: { label: 'Liberté 2.0 — Solidité', emoji: '🏁', color: 'text-primary' },
  custom: { label: 'Personnalisée', emoji: '🎯', color: 'text-muted-foreground' },
}

export const REVENUE_SOURCE_LABELS: Record<RevenueSource, string> = {
  be_activ: 'Be Activ', client_direct: 'Client direct', salaire: 'Salaire', caf: 'CAF',
  ami_famille: 'Ami / famille', remboursement: 'Remboursement', vente: 'Vente', prime: 'Prime',
  revenus_financiers: 'Revenus financiers', virement_interne: 'Virement interne', autre: 'Autre',
}

export const REVENUE_TYPE_LABELS: Record<RevenueType, string> = {
  revenu_pro_recurrent: 'Revenu pro récurrent', revenu_pro_exceptionnel: 'Revenu pro exceptionnel',
  salaire: 'Salaire', cadeau: 'Cadeau', remboursement: 'Remboursement', aide_soutien: 'Aide / soutien',
  aide_sociale: 'Aide sociale', virement_amical: 'Virement amical', vente_exceptionnelle: 'Vente exceptionnelle',
  cashback: 'Cashback', interets: 'Intérêts', dividendes: 'Dividendes', plus_value: 'Plus-value',
  transfert_interne: 'Transfert interne', autre_revenu: 'Autre revenu',
}

export const REVENUE_RECURRENCE_LABELS: Record<RevenueRecurrence, string> = {
  unique: 'Unique', hebdomadaire: 'Hebdomadaire', mensuelle: 'Mensuelle',
  trimestrielle: 'Trimestrielle', annuelle: 'Annuelle', irreguliere: 'Irrégulière',
}

export const BE_ACTIV_OFFER_LABELS: Record<BeActivOffer, string> = {
  jm_pass_coaching: 'JM Pass Coaching', coaching_a_la_carte: 'Coaching À la carte',
  activ_program_essentiel: 'Activ Program Essentiel', activ_reset_online: 'Activ Reset Online',
  activ_reset_hybride: 'Activ Reset Hybride', cardio_mouv: 'Cardio Mouv',
  activ_training: 'Activ Training', boutique: 'Boutique',
}

export const BE_ACTIV_CHANNEL_LABELS: Record<BeActivChannel, string> = {
  banque: 'Banque', especes: 'Espèces', qonto: 'Qonto', autre: 'Autre',
}

export const BE_ACTIV_PAYMENT_LABELS: Record<BeActivPaymentMode, string> = {
  virement: 'Virement', carte: 'Carte', especes: 'Espèces', plateforme: 'Plateforme', autre: 'Autre',
}

export const BE_ACTIV_STATUS_LABELS: Record<BeActivStatus, string> = {
  prevu: 'Prévu', en_attente: 'En attente', recu: 'Reçu',
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  compte_bancaire: 'Compte bancaire', livret_epargne: 'Livret / épargne',
  assurance_vie: 'Assurance Vie', actions: 'Actions',
  etf: 'ETF', crypto: 'Crypto', immobilier: 'Immobilier', vehicule: 'Véhicule',
  objet_valeur: 'Objet de valeur', autre_actif: 'Autre actif', dette: 'Dette',
}

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  compte_bancaire: '🏦', livret_epargne: '💰', assurance_vie: '🛡️',
  actions: '📈', etf: '📊', crypto: '🪙', immobilier: '🏠',
  vehicule: '🚗', objet_valeur: '💎', autre_actif: '📦', dette: '💳',
}

export const ASSET_CLASS_MAP: Record<AssetType, string> = {
  compte_bancaire: 'cash', livret_epargne: 'epargne', assurance_vie: 'epargne',
  actions: 'marches', etf: 'marches', crypto: 'crypto', immobilier: 'immobilier',
  vehicule: 'autres', objet_valeur: 'autres', autre_actif: 'autres', dette: 'dettes',
}

export const ASSET_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  cash: { label: 'Trésorerie', color: 'hsl(165 60% 45%)' },
  epargne: { label: 'Épargne', color: 'hsl(38 70% 55%)' },
  marches: { label: 'Actions / ETF', color: 'hsl(210 70% 55%)' },
  crypto: { label: 'Crypto', color: 'hsl(280 60% 55%)' },
  immobilier: { label: 'Immobilier', color: 'hsl(25 80% 50%)' },
  autres: { label: 'Autres actifs', color: 'hsl(0 0% 55%)' },
  dettes: { label: 'Dettes', color: 'hsl(0 65% 52%)' },
}

export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export const formatCurrencyFull = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

export const getCurrentMonthKey = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const getNextMonthKey = (monthKey: string, offset: number = 1): string => {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const getPreviousMonthKey = (monthKey: string, offset: number = 1): string => {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year, month - 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export const getLevelForXp = (xp: number) => {
  const sorted = [...LEVELS].sort((a, b) => b.minXp - a.minXp)
  return sorted.find(l => xp >= l.minXp) || LEVELS[0]
}

export const getNextLevel = (currentLevel: number) => {
  return LEVELS.find(l => l.level === currentLevel + 1)
}

export const getRendementForProfile = (profile: string | null): number => {
  switch (profile) {
    case 'prudent': return 3
    case 'equilibre': return 5
    case 'dynamique': return 7
    case 'entrepreneur': return 8
    default: return 5
  }
}

export const DEFAULT_OP_CATEGORIES: OpCategory[] = [
  // ── PERSO — Charges Fixes ──────────────────────────────────────────────────
  { id: 'opc_p_logement',    family: 'charge_fixe',    scope: 'perso', name: 'Logement',       icon: '🏠', order: 1 },
  { id: 'opc_p_abonnements', family: 'charge_fixe',    scope: 'perso', name: 'Abonnements',    icon: '🔄', order: 2 },
  { id: 'opc_p_assurances',  family: 'charge_fixe',    scope: 'perso', name: 'Assurances',     icon: '🛡️', order: 3 },
  { id: 'opc_p_banque',      family: 'charge_fixe',    scope: 'perso', name: 'Banque',          icon: '🏦', order: 4 },
  { id: 'opc_p_dettes',      family: 'charge_fixe',    scope: 'perso', name: 'Dettes / Crédits', icon: '💳', order: 5 },
  { id: 'opc_p_fiscale',     family: 'charge_fixe',    scope: 'perso', name: 'Fiscale',         icon: '📋', order: 6 },
  // ── PERSO — Charges Variables ──────────────────────────────────────────────
  { id: 'opc_p_alim',        family: 'charge_variable', scope: 'perso', name: 'Alimentation',  icon: '🛒', order: 1 },
  { id: 'opc_p_menager',     family: 'charge_variable', scope: 'perso', name: 'Ménager',        icon: '🧹', order: 2 },
  { id: 'opc_p_essence',     family: 'charge_variable', scope: 'perso', name: 'Essence',        icon: '⛽', order: 3 },
  { id: 'opc_p_stationnement', family: 'charge_variable', scope: 'perso', name: 'Stationnement', icon: '🅿️', order: 4 },
  { id: 'opc_p_shop',        family: 'charge_variable', scope: 'perso', name: 'Shop',           icon: '🛍️', order: 5 },
  { id: 'opc_p_vetements',   family: 'charge_variable', scope: 'perso', name: 'Vêtements',      icon: '👗', order: 6 },
  { id: 'opc_p_bienetre',    family: 'charge_variable', scope: 'perso', name: 'Bien-être',      icon: '🧘', order: 7 },
  { id: 'opc_p_sante',       family: 'charge_variable', scope: 'perso', name: 'Santé',          icon: '🏥', order: 8 },
  { id: 'opc_p_resto',       family: 'charge_variable', scope: 'perso', name: 'Resto / Sorties', icon: '🍽️', order: 9 },
  { id: 'opc_p_frais_banc',  family: 'charge_variable', scope: 'perso', name: 'Frais Bancaires', icon: '🏦', order: 10 },
  { id: 'opc_p_cadeau',      family: 'charge_variable', scope: 'perso', name: 'Cadeau / Don',   icon: '🎁', order: 11 },
  { id: 'opc_p_jeux',        family: 'charge_variable', scope: 'perso', name: 'Jeux',           icon: '🎮', order: 12 },
  { id: 'opc_p_deplacements', family: 'charge_variable', scope: 'perso', name: 'Déplacements',  icon: '🚗', order: 13 },
  // ── PERSO — Revenus ────────────────────────────────────────────────────────
  { id: 'opc_p_aides',       family: 'revenu', scope: 'perso', name: 'Aides',                  icon: '🏛️', order: 1 },
  { id: 'opc_p_remb',        family: 'revenu', scope: 'perso', name: 'Remboursements perso',   icon: '🔄', order: 2 },
  { id: 'opc_p_gains',       family: 'revenu', scope: 'perso', name: 'Gains',                  icon: '💰', order: 3 },
  // ── PRO — Charges (regroupées sous charge_fixe) ────────────────────────────
  { id: 'opc_r_locaux',      family: 'charge_fixe', scope: 'pro', name: 'Locaux & Bureaux',            icon: '🏢', order: 1 },
  { id: 'opc_r_deplacements', family: 'charge_fixe', scope: 'pro', name: 'Déplacements & Transports',  icon: '🚗', order: 2 },
  { id: 'opc_r_sociales',    family: 'charge_fixe', scope: 'pro', name: 'Sociales & Fiscales',         icon: '📋', order: 3 },
  { id: 'opc_r_outils',      family: 'charge_fixe', scope: 'pro', name: 'Outils & Logiciels',          icon: '🛠️', order: 4 },
  { id: 'opc_r_client',      family: 'charge_fixe', scope: 'pro', name: 'Expérience Client',           icon: '🤝', order: 5 },
  { id: 'opc_r_materiel',    family: 'charge_fixe', scope: 'pro', name: 'Matériel & Entretien',        icon: '🔧', order: 6 },
  { id: 'opc_r_dettes',      family: 'charge_fixe', scope: 'pro', name: 'Dettes & Crédits',           icon: '💳', order: 7 },
  { id: 'opc_r_formation',   family: 'charge_fixe', scope: 'pro', name: 'Formation & Développement',  icon: '📚', order: 8 },
  { id: 'opc_r_bienetre',    family: 'charge_fixe', scope: 'pro', name: 'Bien-être & Santé',          icon: '🧘', order: 9 },
  // ── PRO — Revenus ──────────────────────────────────────────────────────────
  { id: 'opc_r_be_activ',    family: 'revenu', scope: 'pro', name: 'JM | Be Activ',            icon: '💪', order: 1 },
  { id: 'opc_r_remb_pro',    family: 'revenu', scope: 'pro', name: 'Remboursement pro',         icon: '🔄', order: 2 },
  { id: 'opc_r_fiscale',     family: 'revenu', scope: 'pro', name: 'Fiscale',                   icon: '📋', order: 3 },
]

export const DEFAULT_OP_SUBCATEGORIES: OpSubcategory[] = [
  // JM | Be Activ subcategories
  { id: 'ops_activ_reset_online',   categoryId: 'opc_r_be_activ', name: "Activ'RESET | Online",   icon: '💻' },
  { id: 'ops_activ_reset_hybride',  categoryId: 'opc_r_be_activ', name: "Activ'RESET | Hybride",  icon: '🔀' },
  { id: 'ops_jm_pass',              categoryId: 'opc_r_be_activ', name: 'JM Pass Coaching',        icon: '🎯' },
  { id: 'ops_a_la_carte',           categoryId: 'opc_r_be_activ', name: 'JM À la carte',           icon: '📋' },
  { id: 'ops_cardio_mouv',          categoryId: 'opc_r_be_activ', name: "Cardio Mouv'",            icon: '🏃' },
  { id: 'ops_activ_training',       categoryId: 'opc_r_be_activ', name: "Activ'Training",          icon: '🏋️' },
]
