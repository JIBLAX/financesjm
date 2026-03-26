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

// Transition simple : fade uniquement, sans y/scale
// Le y+scale causait une double animation visuelle sur la home (page + cards)
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
  const { sessions, addSession, clearHistory } = useHistory()
  const { settings } = useSettings()

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Ambient glow blobs — bordeaux/beige */}
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
