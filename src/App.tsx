import React, { useState, useCallback, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BottomNav } from '@/components/BottomNav'
import { PinLock } from '@/components/PinLock'
import { AuthPage } from '@/pages/AuthPage'
import { useFinanceStore } from '@/hooks/useFinanceStore'
import { useAuth } from '@/hooks/useAuth'
import { useCloudSync } from '@/hooks/useCloudSync'
import { isSessionValid, createSession, clearSession, loadStore, saveStore } from '@/lib/storage'

import { DashboardPage } from '@/pages/DashboardPage'
import { OperationsPage } from '@/pages/OperationsPage'
import { MonthPage } from '@/pages/MonthPage'
import { VuePage } from '@/pages/VuePage'
import { AccountsPage } from '@/pages/AccountsPage'
import { PatrimoinePage } from '@/pages/PatrimoinePage'
import { MorePage } from '@/pages/MorePage'
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
import { ProjectsPage } from '@/pages/ProjectsPage'
import { HistoriquePage } from '@/pages/HistoriquePage'
import { SnapshotModal } from '@/components/SnapshotModal'
import { MonthlyCheckinModal, shouldShowCheckin } from '@/components/MonthlyCheckinModal'
import { SideNav } from '@/components/SideNav'
import type { MonthlyCheckIn } from '@/types/finance'

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth()
  const finance = useFinanceStore()
  const { store } = finance
  const { debouncedPush, pullFromCloud } = useCloudSync()
  const [unlocked, setUnlocked] = useState(() => isSessionValid())
  const [cloudSynced, setCloudSynced] = useState(false)

  // Pull from cloud on first auth
  useEffect(() => {
    if (!user || cloudSynced) return
    let cancelled = false
    ;(async () => {
      const cloudData = await pullFromCloud()
      if (cancelled) return
      if (cloudData) {
        saveStore(cloudData as any)
        finance.persist(cloudData as any)
      } else {
        debouncedPush(store)
      }
      setCloudSynced(true)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cloudSynced])

  // Push to cloud on every store change (debounced)
  useEffect(() => {
    if (!user || !cloudSynced) return
    debouncedPush(store)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, user, cloudSynced])

  // ─── PIN handlers ──────────────────────────────────────────────────────────

  const handleUnlock = useCallback(() => { createSession(30); setUnlocked(true) }, [])
  const handleSetupPin = useCallback((pin: string) => { finance.updateSettings({ pin, pinConfigured: true }) }, [finance])
  const handleLock = useCallback(() => { clearSession(); setUnlocked(false) }, [])
  const handleImport = useCallback((imported: typeof store) => { finance.persist(imported) }, [finance])
  const handleReset = useCallback(() => { const fresh = loadStore(); finance.persist(fresh) }, [finance])

  const handleSignOut = useCallback(async () => {
    await signOut()
    clearSession()
    setUnlocked(false)
    setCloudSynced(false)
  }, [signOut])

  // ─── Monthly check-in ──────────────────────────────────────────────────────

  const [showCheckin, setShowCheckin] = useState(false)
  const [checkinTargetMonth, setCheckinTargetMonth] = useState<string | null>(null)
  const handleCheckinComplete = useCallback((c: MonthlyCheckIn) => {
    finance.saveCheckIn(c)
    setShowCheckin(false)
    setCheckinTargetMonth(null)
  }, [finance])
  const handleRequestCheckin = useCallback((monthKey: string) => {
    setCheckinTargetMonth(monthKey)
    setShowCheckin(true)
  }, [])

  // Must be before any conditional return — Rules of Hooks
  useEffect(() => {
    if (unlocked && shouldShowCheckin(store)) setShowCheckin(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <TooltipProvider>
        <Toaster />
        <AuthPage onAuthenticated={() => {}} />
      </TooltipProvider>
    )
  }

  if (!unlocked) {
    return <PinLock correctPin={store.settings.pin} pinConfigured={store.settings.pinConfigured} onUnlock={handleUnlock} onSetupPin={handleSetupPin} />
  }

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
                targetMonthKey={checkinTargetMonth ?? undefined}
                onClose={checkinTargetMonth ? () => { setShowCheckin(false); setCheckinTargetMonth(null) } : undefined}
              />
            )}
            <Routes>
              <Route path="/" element={<DashboardPage store={store} onDismissAlert={finance.dismissAlert} />} />
              <Route path="/vue" element={<VuePage store={store} journal={store.monthlyJournals} onUpdateJournal={finance.updateJournal} onUpdateBudget={finance.updateBudget} onUpdateInjection={finance.updateAllocationInjection} />} />
              <Route path="/mois" element={<MonthPage store={store} journal={store.monthlyJournals} onUpdateJournal={finance.updateJournal} />} />
              <Route path="/comptes" element={<AccountsPage store={store} onAdd={finance.addAccount} onUpdate={finance.updateAccount} onRemove={finance.removeAccount} />} />
              <Route path="/analyse" element={<AnalysisPage store={store} />} />
              <Route path="/operations" element={<OperationsPage store={store} onAdd={finance.addOperation} onUpdate={finance.updateOperation} onRemove={finance.removeOperation} onInitMonth={finance.initMonthOperations} onAddOpCategory={finance.addOpCategory} onUpdateOpCategory={finance.updateOpCategory} onRemoveOpCategory={finance.removeOpCategory} onAddOpSubcategory={finance.addOpSubcategory} onRemoveOpSubcategory={finance.removeOpSubcategory} />} />
              <Route path="/plan" element={<PlanPage store={store} />} />
              <Route path="/patrimoine" element={<PatrimoinePage store={store} onAddAsset={finance.addAsset} onUpdateAsset={finance.updateAsset} onRemoveAsset={finance.removeAsset} onAddDebt={finance.addDebt} onUpdateDebt={finance.updateDebt} onRemoveDebt={finance.removeDebt} />} />
              <Route path="/plus" element={<MorePage />} />
              <Route path="/transactions" element={<TransactionsPage store={store} onAdd={finance.addTransaction} onDelete={finance.deleteTransaction} onUpdateAsset={finance.updateAsset} />} />
              <Route path="/transactions/new" element={<TransactionsPage store={store} onAdd={finance.addTransaction} onDelete={finance.deleteTransaction} onUpdateAsset={finance.updateAsset} />} />
              <Route path="/depenses" element={<ExpensesPage store={store} />} />
              <Route path="/export" element={<ExportPage onImport={handleImport} onReset={handleReset} />} />
              <Route path="/parametres" element={<SettingsPage settings={store.settings} accounts={store.accounts} onUpdate={finance.updateSettings} onUpdateRegulation={finance.updateProfileRegulation} onLock={handleLock} onSignOut={handleSignOut} />} />
              <Route path="/profil" element={<ProfilePage store={store} onUpdateRegulation={finance.updateProfileRegulation} />} />
              <Route path="/questionnaire" element={<QuestionnairePage questionnaire={store.settings.investorQuestionnaire} onUpdate={finance.updateSettings} />} />
              <Route path="/liberte2" element={<Liberte2Page store={store} />} />
              <Route path="/trajectoire" element={<TrajectoryPage store={store} />} />
              <Route path="/objectifs" element={<ProjectsPage store={store} onAdd={finance.addProject} onUpdate={finance.updateProject} onRemove={finance.removeProject} onAddXp={finance.addXp} />} />
              <Route path="/historique" element={<HistoriquePage store={store} onSaveSnapshot={finance.saveSnapshot} onRequestCheckin={handleRequestCheckin} />} />
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
