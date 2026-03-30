import React, { useState, useCallback } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BottomNav } from '@/components/BottomNav'
import { PinLock } from '@/components/PinLock'
import { useFinanceStore } from '@/hooks/useFinanceStore'
import { isSessionValid, createSession, clearSession, loadStore } from '@/lib/storage'

import { DashboardPage } from '@/pages/DashboardPage'
import { MonthPage } from '@/pages/MonthPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { PatrimoinePage } from '@/pages/PatrimoinePage'
import { MorePage } from '@/pages/MorePage'
import { AllocationPage } from '@/pages/AllocationPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { ExportPage } from '@/pages/ExportPage'
import { SettingsPage } from '@/pages/SettingsPage'

const App: React.FC = () => {
  const finance = useFinanceStore()
  const { store } = finance
  const [unlocked, setUnlocked] = useState(() => isSessionValid())

  const handleUnlock = useCallback(() => {
    createSession(30)
    setUnlocked(true)
  }, [])

  const handleSetupPin = useCallback((pin: string) => {
    finance.updateSettings({ pin, pinConfigured: true })
  }, [finance])

  const handleLock = useCallback(() => {
    clearSession()
    setUnlocked(false)
  }, [])

  const handleImport = useCallback((imported: typeof store) => {
    finance.persist(imported)
  }, [finance])

  const handleReset = useCallback(() => {
    const fresh = loadStore()
    finance.persist(fresh)
  }, [finance])

  if (!unlocked) {
    return (
      <PinLock
        correctPin={store.settings.pin}
        pinConfigured={store.settings.pinConfigured}
        onUnlock={handleUnlock}
        onSetupPin={handleSetupPin}
      />
    )
  }

  return (
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <div className="flex flex-col h-full bg-background">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <Routes>
              <Route path="/" element={<DashboardPage store={store} />} />
              <Route path="/mois" element={<MonthPage store={store} />} />
              <Route path="/comptes" element={<AccountsPage store={store} />} />
              <Route path="/patrimoine" element={
                <PatrimoinePage
                  store={store}
                  onAddAsset={finance.addAsset}
                  onRemoveAsset={finance.removeAsset}
                  onAddDebt={finance.addDebt}
                  onRemoveDebt={finance.removeDebt}
                />
              } />
              <Route path="/plus" element={<MorePage />} />
              <Route path="/repartition" element={<AllocationPage rules={store.settings.allocationRules} />} />
              <Route path="/transactions" element={
                <TransactionsPage store={store} onAdd={finance.addTransaction} onDelete={finance.deleteTransaction} />
              } />
              <Route path="/transactions/new" element={
                <TransactionsPage store={store} onAdd={finance.addTransaction} onDelete={finance.deleteTransaction} />
              } />
              <Route path="/depenses" element={<ExpensesPage store={store} />} />
              <Route path="/export" element={<ExportPage onImport={handleImport} onReset={handleReset} />} />
              <Route path="/parametres" element={
                <SettingsPage settings={store.settings} onUpdate={finance.updateSettings} onLock={handleLock} />
              } />
            </Routes>
          </div>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
