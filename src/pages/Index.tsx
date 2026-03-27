import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AppScreen, TimerMode, TimerConfig, SessionResult } from '../types'
import { useHistory } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { useClients } from '../hooks/useClients'
import { useSessionRecords } from '../hooks/useSessionRecords'
import { useAuth } from '../hooks/useAuth'
import { supabaseConfigured } from '../lib/supabase'
import { HomePage } from './HomePage'
import { SetupPage } from './SetupPage'
import { TimerPage } from './TimerPage'
import { SummaryPage } from './SummaryPage'
import { HistoryPage } from './HistoryPage'
import { ClientsPage } from './ClientsPage'
import { SessionLogPage } from './SessionLogPage'
import { LoginPage } from './LoginPage'

const variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}
const transition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

const BeActivApp: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [selectedMode, setSelectedMode] = useState<TimerMode>('tabata')
  const [timerConfig, setTimerConfig] = useState<TimerConfig>({} as TimerConfig)
  const [lastResult, setLastResult] = useState<SessionResult | null>(null)

  const { user, status, signIn, signUp, signOut } = useAuth()
  const { sessions, addSession, clearHistory } = useHistory(user)
  const { settings, update: updateSettings } = useSettings(user)
  const { clients, addClient, removeClient } = useClients(user)
  const { records, addRecord } = useSessionRecords(user)

  // Pendant le chargement de la session auth
  if (supabaseConfigured && status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Chargement…</div>
      </div>
    )
  }

  // Supabase configuré mais pas connecté → page de login
  if (supabaseConfigured && status === 'unauthenticated') {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden relative">
        <div className="fixed top-[-25%] left-[-15%] w-[65%] h-[65%] rounded-full opacity-[0.055] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(345 62% 40%), transparent)' }} />
        <div className="flex-1 overflow-y-auto">
          <LoginPage onSignIn={signIn} onSignUp={signUp} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Ambient glow blobs */}
      <div className="fixed top-[-25%] left-[-15%] w-[65%] h-[65%] rounded-full opacity-[0.055] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(345 62% 40%), transparent)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[55%] h-[55%] rounded-full opacity-[0.035] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(35 28% 70%), transparent)' }} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            className="flex-1 flex flex-col min-h-full"
          >
            {screen === 'home' && (
              <HomePage
                onSelectMode={m => { setSelectedMode(m); setScreen('setup') }}
                onHistory={() => setScreen('history')}
                onClients={() => setScreen('clients')}
                settings={settings}
                onUpdateSettings={updateSettings}
                user={user}
                onSignOut={signOut}
              />
            )}
            {screen === 'setup' && (
              <SetupPage mode={selectedMode} onStart={c => { setTimerConfig(c); setScreen('timer') }} onBack={() => setScreen('home')} />
            )}
            {screen === 'timer' && (
              <TimerPage
                mode={selectedMode}
                config={timerConfig}
                settings={settings}
                coachTag={settings.coachTag}
                onFinish={r => { addSession(r); setLastResult(r); setScreen('summary') }}
                onBack={() => setScreen('home')}
              />
            )}
            {screen === 'summary' && lastResult && (
              <SummaryPage
                result={lastResult}
                onRestart={() => setScreen('timer')}
                onHome={() => setScreen('home')}
                onLogSession={() => setScreen('session-log')}
              />
            )}
            {screen === 'history' && (
              <HistoryPage sessions={sessions} onBack={() => setScreen('home')} onClear={clearHistory} />
            )}
            {screen === 'clients' && (
              <ClientsPage
                clients={clients}
                onBack={() => setScreen('home')}
                onAdd={addClient}
                onRemove={removeClient}
              />
            )}
            {screen === 'session-log' && lastResult && (
              <SessionLogPage
                result={lastResult}
                clients={clients}
                onSave={addRecord}
                onBack={() => setScreen('summary')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default BeActivApp
