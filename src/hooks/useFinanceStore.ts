import { useState, useCallback } from 'react'
import type { FinanceStore, Account, Transaction, Asset, Debt, AppSettings, MonthlySnapshot } from '@/types/finance'
import { loadStore, saveStore } from '@/lib/storage'

export function useFinanceStore() {
  const [store, setStore] = useState<FinanceStore>(loadStore)

  const persist = useCallback((next: FinanceStore) => {
    setStore(next)
    saveStore(next)
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setStore(prev => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } }
      saveStore(next)
      return next
    })
  }, [])

  const addTransaction = useCallback((t: Transaction) => {
    setStore(prev => {
      // Update account balance
      const accounts = prev.accounts.map(a => {
        if (a.id === t.accountId) {
          const delta = t.direction === 'income' ? t.amount : t.direction === 'expense' ? -t.amount : 0
          return { ...a, currentBalance: a.currentBalance + delta }
        }
        return a
      })
      const next = { ...prev, transactions: [t, ...prev.transactions], accounts }
      saveStore(next)
      return next
    })
  }, [])

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setStore(prev => {
      const next = { ...prev, transactions: prev.transactions.map(t => t.id === id ? { ...t, ...patch } : t) }
      saveStore(next)
      return next
    })
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setStore(prev => {
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
      const next = { ...prev, transactions: prev.transactions.filter(t => t.id !== id), accounts }
      saveStore(next)
      return next
    })
  }, [])

  const updateAccount = useCallback((id: string, patch: Partial<Account>) => {
    setStore(prev => {
      const next = { ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, ...patch } : a) }
      saveStore(next)
      return next
    })
  }, [])

  const addAsset = useCallback((a: Asset) => {
    setStore(prev => {
      const next = { ...prev, assets: [...prev.assets, a] }
      saveStore(next)
      return next
    })
  }, [])

  const removeAsset = useCallback((id: string) => {
    setStore(prev => {
      const next = { ...prev, assets: prev.assets.filter(a => a.id !== id) }
      saveStore(next)
      return next
    })
  }, [])

  const addDebt = useCallback((d: Debt) => {
    setStore(prev => {
      const next = { ...prev, debts: [...prev.debts, d] }
      saveStore(next)
      return next
    })
  }, [])

  const removeDebt = useCallback((id: string) => {
    setStore(prev => {
      const next = { ...prev, debts: prev.debts.filter(d => d.id !== id) }
      saveStore(next)
      return next
    })
  }, [])

  const updateDebt = useCallback((id: string, patch: Partial<Debt>) => {
    setStore(prev => {
      const next = { ...prev, debts: prev.debts.map(d => d.id === id ? { ...d, ...patch } : d) }
      saveStore(next)
      return next
    })
  }, [])

  const saveSnapshot = useCallback((s: MonthlySnapshot) => {
    setStore(prev => {
      const existing = prev.monthlySnapshots.findIndex(x => x.monthKey === s.monthKey)
      const snapshots = existing >= 0
        ? prev.monthlySnapshots.map((x, i) => i === existing ? s : x)
        : [...prev.monthlySnapshots, s]
      const next = { ...prev, monthlySnapshots: snapshots }
      saveStore(next)
      return next
    })
  }, [])

  return {
    store,
    persist,
    updateSettings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateAccount,
    addAsset,
    removeAsset,
    addDebt,
    removeDebt,
    updateDebt,
    saveSnapshot,
  }
}
