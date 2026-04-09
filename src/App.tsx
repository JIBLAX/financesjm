import React, { useState, useCallback, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BottomNav } from '@/components/BottomNav'
import { PinLock } from '@/components/PinLock'
import { useFinanceStore } from '@/hooks/useFinanceStore'
import { isSessionValid, createSession, clearSession, loadStore, setSupabaseUserId, syncToSupabase, loadFromSupabase, saveStore } from '@/lib/storage'
import { supabase } from '@/integrations/supabase/client'

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
import { AuthPage } from '@/pages/AuthPage'
import { SnapshotModal } from '@/components/SnapshotModal'
import { MonthlyCheckinModal, shouldShowCheckin } from '@/components/MonthlyCheckinModal'
import { SideNav } from '@/components/SideNav'
import type { MonthlyCheckIn } from '@/types/finance'

type AuthState = 'loading' | 'unauthenticated' | 'ready'

const App: React.FC = () => {
  const finance = useFinanceStore()
  const { store } = finance
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [unlocked, setUnlocked] = useState(() => isSessionValid())

  // ─── Supabase auth boot ────────────────────────────────────────────────────

  const bootWithUser = useCallback(async (userId: string) => {
    setSupabaseUserId(userId)
    const remote = await loadFromSupabase()
    if (remote) {
      // Supabase has data — use it as source of truth
      saveStore(remote)
      finance.persist(remote)
    } else {
      // First login on this account — push local data up
      await syncToSupabase(loadStore())
    }
    setAuthState('ready')
  }, [finance])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        bootWithUser(session.user.id)
      } else {
        setAuthState('unauthenticated')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setSupabaseUserId(null)
        setUnlocked(false)
        setAuthState('unauthenticated')
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAuthComplete = useCallback((userId: string) => {
    bootWithUser(userId)
  }, [bootWithUser])

  // ─── PIN handlers ──────────────────────────────────────────────────────────

  const handleUnlock = useCallback(() => { createSession(30); setUnlocked(true) }, [])
  const handleSetupPin = useCallback((pin: string) => { finance.updateSettings({ pin, pinConfigured: true }) }, [finance])
  const handleLock = useCallback(() => { clearSession(); setUnlocked(false) }, [])
  const handleImport = useCallback((imported: typeof store) => { finance.persist(imported) }, [finance])
  const handleReset = useCallback(() => { const fresh = loadStore(); finance.persist(fresh) }, [finance])

  // ─── Monthly check-in ──────────────────────────────────────────────────────

  const [showCheckin, setShowCheckin] = useState(false)
  const handleCheckinComplete = useCallback((c: MonthlyCheckIn) => {
    finance.saveCheckIn(c)
    setShowCheckin(false)
  }, [finance])

  // Must be before any conditional return — Rules of Hooks
  useEffect(() => {
    if (authState === 'ready' && unlocked && shouldShowCheckin(store)) setShowCheckin(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, unlocked])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">💰</div>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return (
      <TooltipProvider>
        <Toaster />
        <AuthPage onAuth={handleAuthComplete} />
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
              <Route path="/parametres" element={<SettingsPage settings={store.settings} accounts={store.accounts} onUpdate={finance.updateSettings} onUpdateRegulation={finance.updateProfileRegulation} onLock={handleLock} />} />
              <Route path="/profil" element={<ProfilePage store={store} onUpdateRegulation={finance.updateProfileRegulation} />} />
              <Route path="/questionnaire" element={<QuestionnairePage questionnaire={store.settings.investorQuestionnaire} onUpdate={finance.updateSettings} />} />
              <Route path="/liberte2" element={<Liberte2Page store={store} />} />
              <Route path="/trajectoire" element={<TrajectoryPage store={store} />} />
              <Route path="/objectifs" element={<ProjectsPage store={store} onAdd={finance.addProject} onUpdate={finance.updateProject} onRemove={finance.removeProject} onAddXp={finance.addXp} />} />
              <Route path="/historique" element={<HistoriquePage store={store} onSaveSnapshot={finance.saveSnapshot} />} />
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
