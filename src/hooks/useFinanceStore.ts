import { useState, useCallback } from 'react'
import type { FinanceStore, Account, Transaction, Asset, Debt, AppSettings, MonthlySnapshot, Quest, ProfileRegulation, Operation, OpCategory, OpSubcategory, MonthlyCheckIn, Project } from '@/types/finance'
import { loadStore, saveStore } from '@/lib/storage'
import { getPreviousMonthKey } from '@/lib/constants'

export function useFinanceStore() {
  const [store, setStore] = useState<FinanceStore>(loadStore)

  const persist = useCallback((next: FinanceStore) => {
    setStore(next)
    saveStore(next)
  }, [])

  const update = useCallback((fn: (prev: FinanceStore) => FinanceStore) => {
    setStore(prev => {
      const next = fn(prev)
      saveStore(next)
      return next
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    update(prev => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [update])

  const addTransaction = useCallback((t: Transaction) => {
    update(prev => {
      const accounts = prev.accounts.map(a => {
        if (a.id === t.accountId) {
          const delta = t.direction === 'income' ? t.amount : t.direction === 'expense' ? -t.amount : 0
          return { ...a, currentBalance: a.currentBalance + delta }
        }
        return a
      })
      return { ...prev, transactions: [t, ...prev.transactions], accounts }
    })
  }, [update])

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    update(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === id ? { ...t, ...patch } : t) }))
  }, [update])

  const deleteTransaction = useCallback((id: string) => {
    update(prev => {
      const tx = prev.transactions.find(t => t.id === id)
      let accounts = prev.accounts
      if (tx) {
        accounts = accounts.map(a => {
          if (a.id === tx.accountId) {
            const delta = tx.direction === 'income' ? -tx.amount : tx.direction === 'expense' ? tx.amount : 0
            return { ...a, currentBalance: a.currentBalance + delta }
          }
          return a
        })
      }
      return { ...prev, transactions: prev.transactions.filter(t => t.id !== id), accounts }
    })
  }, [update])

  const addAccount = useCallback((a: Account) => {
    update(prev => ({ ...prev, accounts: [...prev.accounts, a] }))
  }, [update])

  const removeAccount = useCallback((id: string) => {
    update(prev => ({ ...prev, accounts: prev.accounts.filter(a => a.id !== id) }))
  }, [update])

  const updateAccount = useCallback((id: string, patch: Partial<Account>) => {
    update(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, ...patch } : a) }))
  }, [update])

  const addAsset = useCallback((a: Asset) => {
    update(prev => ({ ...prev, assets: [...prev.assets, a] }))
  }, [update])

  const updateAsset = useCallback((id: string, patch: Partial<Asset>) => {
    update(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...patch } : a) }))
  }, [update])

  const removeAsset = useCallback((id: string) => {
    update(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }))
  }, [update])

  const addDebt = useCallback((d: Debt) => {
    update(prev => ({ ...prev, debts: [...prev.debts, d] }))
  }, [update])

  const removeDebt = useCallback((id: string) => {
    update(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }))
  }, [update])

  const updateDebt = useCallback((id: string, patch: Partial<Debt>) => {
    update(prev => ({ ...prev, debts: prev.debts.map(d => d.id === id ? { ...d, ...patch } : d) }))
  }, [update])

  const saveSnapshot = useCallback((s: MonthlySnapshot) => {
    update(prev => {
      const existing = prev.monthlySnapshots.findIndex(x => x.monthKey === s.monthKey)
      const snapshots = existing >= 0
        ? prev.monthlySnapshots.map((x, i) => i === existing ? s : x)
        : [...prev.monthlySnapshots, s]
      return { ...prev, monthlySnapshots: snapshots }
    })
  }, [update])

  const updateQuest = useCallback((id: string, patch: Partial<Quest>) => {
    update(prev => ({ ...prev, quests: prev.quests.map(q => q.id === id ? { ...q, ...patch } : q) }))
  }, [update])

  const addQuest = useCallback((q: Quest) => {
    update(prev => ({ ...prev, quests: [...prev.quests, q] }))
  }, [update])

  const dismissAlert = useCallback((alertId: string) => {
    update(prev => ({ ...prev, dismissedAlerts: [...prev.dismissedAlerts, alertId] }))
  }, [update])

  const updateJournal = useCallback((monthKey: string, note: string) => {
    update(prev => ({ ...prev, monthlyJournals: { ...prev.monthlyJournals, [monthKey]: note } }))
  }, [update])

  const addXp = useCallback((amount: number) => {
    update(prev => ({ ...prev, settings: { ...prev.settings, xp: prev.settings.xp + amount } }))
  }, [update])

  const updateProfileRegulation = useCallback((patch: Partial<ProfileRegulation>) => {
    update(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        profileRegulation: { ...prev.settings.profileRegulation, ...patch },
      },
    }))
  }, [update])

  // ─── Operations ──────────────────────────────────────────────────────────────

  const addOperation = useCallback((op: Operation) => {
    update(prev => ({ ...prev, operations: [...prev.operations, op] }))
  }, [update])

  const updateOperation = useCallback((id: string, patch: Partial<Operation>) => {
    update(prev => ({ ...prev, operations: prev.operations.map(op => op.id === id ? { ...op, ...patch } : op) }))
  }, [update])

  const removeOperation = useCallback((id: string) => {
    update(prev => ({ ...prev, operations: prev.operations.filter(op => op.id !== id) }))
  }, [update])

  /** Copy template operations from the previous month into targetMonthKey (only if that month has no operations). */
  const initMonthOperations = useCallback((targetMonthKey: string) => {
    update(prev => {
      if (prev.operations.some(op => op.monthKey === targetMonthKey)) return prev
      const prevMonthKey = getPreviousMonthKey(targetMonthKey, 1)
      const templates = prev.operations.filter(op => op.monthKey === prevMonthKey && op.isTemplate)
      if (templates.length === 0) return prev
      const base = Date.now()
      const newOps: Operation[] = templates.map((op, i) => ({
        ...op,
        id: `op_${base}_${i}`,
        monthKey: targetMonthKey,
        actual: 0,
        templateId: op.templateId || op.id,
      }))
      return { ...prev, operations: [...prev.operations, ...newOps] }
    })
  }, [update])

  // ─── Op Categories ───────────────────────────────────────────────────────────

  const addOpCategory = useCallback((c: OpCategory) => {
    update(prev => ({ ...prev, opCategories: [...prev.opCategories, c] }))
  }, [update])

  const updateOpCategory = useCallback((id: string, patch: Partial<OpCategory>) => {
    update(prev => ({ ...prev, opCategories: prev.opCategories.map(c => c.id === id ? { ...c, ...patch } : c) }))
  }, [update])

  const removeOpCategory = useCallback((id: string) => {
    update(prev => ({ ...prev, opCategories: prev.opCategories.filter(c => c.id !== id) }))
  }, [update])

  // ─── Op Subcategories ────────────────────────────────────────────────────────

  const addOpSubcategory = useCallback((s: OpSubcategory) => {
    update(prev => ({ ...prev, opSubcategories: [...prev.opSubcategories, s] }))
  }, [update])

  const removeOpSubcategory = useCallback((id: string) => {
    update(prev => ({ ...prev, opSubcategories: prev.opSubcategories.filter(s => s.id !== id) }))
  }, [update])

  const saveCheckIn = useCallback((c: MonthlyCheckIn) => {
    update(prev => ({
      ...prev,
      monthlyCheckIns: [...(prev.monthlyCheckIns || []).filter(x => x.monthKey !== c.monthKey), c],
    }))
  }, [update])

  // ─── Monthly Budgets ──────────────────────────────────────────────────────
  const updateBudget = useCallback((monthKey: string, categoryId: string, amount: number) => {
    update(prev => ({
      ...prev,
      monthlyBudgets: {
        ...prev.monthlyBudgets,
        [monthKey]: { ...(prev.monthlyBudgets[monthKey] || {}), [categoryId]: amount },
      },
    }))
  }, [update])

  // ─── Allocation Injections ────────────────────────────────────────────────
  const updateAllocationInjection = useCallback((monthKey: string, accountId: string, amount: number) => {
    update(prev => ({
      ...prev,
      allocationInjections: {
        ...prev.allocationInjections,
        [monthKey]: { ...(prev.allocationInjections?.[monthKey] || {}), [accountId]: amount },
      },
    }))
  }, [update])

  // ─────────────────────────────────────────────────────────────────────────────

  return {
    store, persist, update, updateSettings,
    addTransaction, updateTransaction, deleteTransaction,
    addAccount, updateAccount, removeAccount,
    addAsset, updateAsset, removeAsset,
    addDebt, removeDebt, updateDebt,
    saveSnapshot, updateQuest, addQuest, dismissAlert, updateJournal, addXp, updateProfileRegulation,
    addOperation, updateOperation, removeOperation, initMonthOperations,
    addOpCategory, updateOpCategory, removeOpCategory,
    addOpSubcategory, removeOpSubcategory,
    saveCheckIn, updateBudget, updateAllocationInjection,
  }
}
