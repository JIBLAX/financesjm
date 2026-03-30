import type { Account, AllocationRules, Category, CashEnvelope, AppSettings } from '@/types/finance'

export const DEFAULT_ALLOCATION_RULES: AllocationRules = {
  proPercent: 30,
  personalBasePercent: 70,
  boursoPercent: 80,
  livretAPercent: 10,
  lepPercent: 10,
  cashLibertePercent: 50,
  cashSecurityPercent: 25,
  cashVoyagePercent: 25,
}

export const DEFAULT_SETTINGS: AppSettings = {
  pin: '',
  pinConfigured: false,
  theme: 'dark',
  currency: 'EUR',
  allocationRules: DEFAULT_ALLOCATION_RULES,
}

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'qonto', name: 'Activité pro', institution: 'Qonto', type: 'pro', subtype: 'compte courant', currency: 'EUR', currentBalance: 0, isActive: true },
  { id: 'bourso', name: 'Vie courante', institution: 'BoursoBank', type: 'courant', subtype: 'compte courant', currency: 'EUR', currentBalance: 0, isActive: true },
  { id: 'livret-a', name: 'Tampon bancaire', institution: 'Caisse d\'Épargne', type: 'livret', subtype: 'Livret A', currency: 'EUR', currentBalance: 0, isActive: true },
  { id: 'lep', name: 'Fonds d\'urgence', institution: 'Caisse d\'Épargne', type: 'livret', subtype: 'LEP', currency: 'EUR', currentBalance: 0, isActive: true },
  { id: 'cash-liberte', name: 'Cash liberté', institution: 'Espèces', type: 'liquide', subtype: '', currency: 'EUR', currentBalance: 0, isActive: true },
  { id: 'cash-securite', name: 'Fonds sécurité liquide', institution: 'Espèces', type: 'liquide', subtype: '', currency: 'EUR', currentBalance: 0, isActive: true },
  { id: 'cash-voyage', name: 'Voyage', institution: 'Espèces', type: 'liquide', subtype: '', currency: 'EUR', currentBalance: 0, isActive: true },
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'loyer', name: 'Loyer', icon: '🏠', color: '220 70% 55%' },
  { id: 'electricite', name: 'Électricité', icon: '⚡', color: '45 90% 55%' },
  { id: 'internet', name: 'Internet', icon: '🌐', color: '200 70% 55%' },
  { id: 'telephone', name: 'Téléphone', icon: '📱', color: '280 60% 55%' },
  { id: 'assurances', name: 'Assurances', icon: '🛡️', color: '160 50% 45%' },
  { id: 'banque', name: 'Banque', icon: '🏦', color: '210 60% 50%' },
  { id: 'urssaf', name: 'URSSAF', icon: '📋', color: '0 60% 50%' },
  { id: 'tva', name: 'TVA', icon: '📊', color: '30 70% 50%' },
  { id: 'impots', name: 'Impôts', icon: '🏛️', color: '340 50% 50%' },
  { id: 'credit-conso', name: 'Crédit conso', icon: '💳', color: '0 50% 55%' },
  { id: 'essence', name: 'Essence', icon: '⛽', color: '25 80% 50%' },
  { id: 'nourriture', name: 'Nourriture', icon: '🍽️', color: '120 50% 45%' },
  { id: 'abonnements', name: 'Abonnements', icon: '🔄', color: '260 60% 55%' },
  { id: 'sante', name: 'Santé', icon: '🏥', color: '350 60% 50%' },
  { id: 'pro', name: 'Pro', icon: '💼', color: '210 50% 50%' },
  { id: 'sorties', name: 'Sorties', icon: '🎉', color: '300 60% 55%' },
  { id: 'voyage', name: 'Voyage', icon: '✈️', color: '190 70% 50%' },
  { id: 'divers', name: 'Divers', icon: '📦', color: '0 0% 55%' },
  { id: 'revenu', name: 'Revenu', icon: '💰', color: '142 60% 50%' },
]

export const DEFAULT_CASH_ENVELOPES: CashEnvelope[] = [
  { id: 'cash-liberte', name: 'Cash liberté', currentBalance: 0, targetBalance: 500 },
  { id: 'cash-securite', name: 'Fonds sécurité liquide', currentBalance: 0, targetBalance: 1000 },
  { id: 'cash-voyage', name: 'Voyage', currentBalance: 0, targetBalance: 2000 },
]

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export const formatCurrencyFull = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

export const getCurrentMonthKey = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year, month - 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
