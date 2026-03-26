import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AppScreen, TimerMode, TimerConfig, SessionResult } from '../types'
import { useHistory } from '../hooks/useHistory'
import { useSettings } from '../hooks/useSettings'
import { HomePage } from './HomePage'
import { SetupPage } from './SetupPage'
import { TimerPage } from './TimerPage'
import { SummaryPage } from './SummaryPage'
import { HistoryPage } from './HistoryPage'

const variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 1.01 },
}

const transition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

const BeActivApp: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [selectedMode, setSelectedMode] = useState<TimerMode>('tabata')
  const [timerConfig, setTimerConfig] = useState<TimerConfig>({} as TimerConfig)
  const [lastResult, setLastResult] = useState<SessionResult | null>(null)
  const { sessions, addSession, clearHistory } = useHistory()
  const { settings } = useSettings()

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Ambient glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.03] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.02] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--accent-circuit)), transparent)' }} />

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
              <HomePage onSelectMode={m => { setSelectedMode(m); setScreen('setup') }} onHistory={() => setScreen('history')} />
            )}
            {screen === 'setup' && (
              <SetupPage mode={selectedMode} onStart={c => { setTimerConfig(c); setScreen('timer') }} onBack={() => setScreen('home')} />
            )}
            {screen === 'timer' && (
              <TimerPage mode={selectedMode} config={timerConfig} settings={settings} onFinish={r => { addSession(r); setLastResult(r); setScreen('summary') }} onBack={() => setScreen('home')} />
            )}
            {screen === 'summary' && lastResult && (
              <SummaryPage result={lastResult} onRestart={() => setScreen('timer')} onHome={() => setScreen('home')} />
            )}
            {screen === 'history' && (
              <HistoryPage sessions={sessions} onBack={() => setScreen('home')} onClear={clearHistory} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default BeActivApp
