import React, { useState, useCallback } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BottomNav } from '@/components/BottomNav'
import { PinLock } from '@/components/PinLock'
import { useFinanceStore } from '@/hooks/useFinanceStore'
import { isSessionValid, createSession, clearSession, loadStore } from '@/lib/storage'

import { DashboardPage } from '@/pages/DashboardPage'
import { OperationsPage } from '@/pages/OperationsPage'
import { MonthPage } from '@/pages/MonthPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { PatrimoinePage } from '@/pages/PatrimoinePage'
import { MorePage } from '@/pages/MorePage'
import { AllocationPage } from '@/pages/AllocationPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { ExportPage } from '@/pages/ExportPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AnalysisPage } from '@/pages/AnalysisPage'
import { PlanPage } from '@/pages/PlanPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { QuestionnairePage } from '@/pages/QuestionnairePage'
import { Liberte2Page } from '@/pages/Liberte2Page'
import { TrajectoryPage } from '@/pages/TrajectoryPage'
import { SnapshotModal } from '@/components/SnapshotModal'
import { MonthlyCheckinModal, shouldShowCheckin } from '@/components/MonthlyCheckinModal'
import { SideNav } from '@/components/SideNav'
import type { MonthlyCheckIn } from '@/types/finance'

const App: React.FC = () => {
  const finance = useFinanceStore()
  const { store } = finance
  const [unlocked, setUnlocked] = useState(() => isSessionValid())

  const handleUnlock = useCallback(() => { createSession(30); setUnlocked(true) }, [])
  const handleSetupPin = useCallback((pin: string) => { finance.updateSettings({ pin, pinConfigured: true }) }, [finance])
  const handleLock = useCallback(() => { clearSession(); setUnlocked(false) }, [])
  const handleImport = useCallback((imported: typeof store) => { finance.persist(imported) }, [finance])
  const handleReset = useCallback(() => { const fresh = loadStore(); finance.persist(fresh) }, [finance])

  const [showCheckin, setShowCheckin] = useState(false)
  const handleCheckinComplete = useCallback((c: MonthlyCheckIn) => {
    finance.saveCheckIn(c)
    setShowCheckin(false)
  }, [finance])

  if (!unlocked) {
    return <PinLock correctPin={store.settings.pin} pinConfigured={store.settings.pinConfigured} onUnlock={handleUnlock} onSetupPin={handleSetupPin} />
  }

  // Show check-in on mount if conditions met (done here to avoid calling shouldShowCheckin in useState which runs before store migration)
  React.useEffect(() => {
    if (unlocked && shouldShowCheckin(store)) setShowCheckin(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  return (
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <div className="flex h-full bg-background">
          <SideNav />
          <div className="flex flex-col flex-1 min-w-0 lg:ml-56">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {!showCheckin && <SnapshotModal store={store} onDismiss={(snapshot) => finance.saveSnapshot(snapshot)} />}
            {showCheckin && (
              <MonthlyCheckinModal
                store={store}
                onSaveCheckIn={handleCheckinComplete}
                onUpdateAccount={finance.updateAccount}
                onUpdateAsset={finance.updateAsset}
                onUpdateDebt={finance.updateDebt}
              />
            )}
            <Routes>
              <Route path="/" element={<DashboardPage store={store} onDismissAlert={finance.dismissAlert} />} />
              <Route path="/mois" element={<MonthPage store={store} journal={store.monthlyJournals} onUpdateJournal={finance.updateJournal} />} />
              <Route path="/comptes" element={<AccountsPage store={store} onAdd={finance.addAccount} onUpdate={finance.updateAccount} onRemove={finance.removeAccount} />} />
              <Route path="/analyse" element={<AnalysisPage store={store} />} />
              <Route path="/operations" element={<OperationsPage store={store} onAdd={finance.addOperation} onUpdate={finance.updateOperation} onRemove={finance.removeOperation} onInitMonth={finance.initMonthOperations} onAddOpCategory={finance.addOpCategory} onUpdateOpCategory={finance.updateOpCategory} onRemoveOpCategory={finance.removeOpCategory} onAddOpSubcategory={finance.addOpSubcategory} onRemoveOpSubcategory={finance.removeOpSubcategory} />} />
              <Route path="/plan" element={<PlanPage store={store} onUpdateQuest={finance.updateQuest} onAddQuest={finance.addQuest} onAddXp={finance.addXp} />} />
              <Route path="/patrimoine" element={<PatrimoinePage store={store} onAddAsset={finance.addAsset} onRemoveAsset={finance.removeAsset} onAddDebt={finance.addDebt} onRemoveDebt={finance.removeDebt} />} />
              <Route path="/plus" element={<MorePage />} />
              <Route path="/repartition" element={<AllocationPage rules={store.settings.allocationRules} />} />
              <Route path="/transactions" element={<TransactionsPage store={store} onAdd={finance.addTransaction} onDelete={finance.deleteTransaction} />} />
              <Route path="/transactions/new" element={<TransactionsPage store={store} onAdd={finance.addTransaction} onDelete={finance.deleteTransaction} />} />
              <Route path="/depenses" element={<ExpensesPage store={store} />} />
              <Route path="/export" element={<ExportPage onImport={handleImport} onReset={handleReset} />} />
              <Route path="/parametres" element={<SettingsPage settings={store.settings} onUpdate={finance.updateSettings} onUpdateRegulation={finance.updateProfileRegulation} onLock={handleLock} />} />
              <Route path="/profil" element={<ProfilePage store={store} />} />
              <Route path="/questionnaire" element={<QuestionnairePage questionnaire={store.settings.investorQuestionnaire} onUpdate={finance.updateSettings} />} />
              <Route path="/liberte2" element={<Liberte2Page store={store} />} />
              <Route path="/trajectoire" element={<TrajectoryPage store={store} />} />
            </Routes>
          </div>
          <BottomNav />
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
