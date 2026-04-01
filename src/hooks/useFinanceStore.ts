import { useState, useCallback } from 'react'
import type { FinanceStore, Account, Transaction, Asset, Debt, AppSettings, MonthlySnapshot, Quest, ProfileRegulation } from '@/types/finance'
import { loadStore, saveStore } from '@/lib/storage'

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

  return {
    store, persist, update, updateSettings, addTransaction, updateTransaction, deleteTransaction,
    updateAccount, addAsset, updateAsset, removeAsset, addDebt, removeDebt, updateDebt, saveSnapshot,
    updateQuest, addQuest, dismissAlert, updateJournal, addXp, updateProfileRegulation,
  }
}
