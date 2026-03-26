import React, { useState } from 'react'
import { Zap, RefreshCw, Clock, Trophy, Settings, ClipboardList, Volume2, Vibrate } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TimerMode } from '../types'
import { GlassToggle } from '../components/GlassToggle'
import { useSettings } from '../hooks/useSettings'
import logoBeactiv from '../assets/logo-beactiv.png'

interface Props {
  onSelectMode: (mode: TimerMode) => void
  onHistory: () => void
}

interface ModeCard {
  mode: TimerMode
  title: string
  desc: string
  accent: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
}

const modes: ModeCard[] = [
  { mode: 'tabata', title: 'TABATA', desc: '20s / 10s · Rounds', accent: 'hsl(var(--accent-tabata))', Icon: Zap },
  { mode: 'circuit', title: 'CIRCUIT', desc: 'Exercices · Rounds', accent: 'hsl(var(--accent-circuit))', Icon: RefreshCw },
  { mode: 'fortime', title: 'FOR TIME', desc: 'Chrono ascendant', accent: 'hsl(var(--accent-fortime))', Icon: Clock },
  { mode: 'amrap', title: 'AMRAP', desc: 'Max rounds · Durée', accent: 'hsl(var(--accent-amrap))', Icon: Trophy },
]

export const HomePage: React.FC<Props> = ({ onSelectMode, onHistory }) => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { settings, update } = useSettings()

  return (
    <div className="page-container pt-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="w-10" />
        <img src={logoBeactiv} alt="BeActiv" className="h-10 object-contain opacity-90" />
        <button
          onClick={() => setSettingsOpen(true)}
          className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/60"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-extrabold text-foreground leading-tight mb-2">
          Votre séance,<br />
          <span className="text-gradient-primary">votre rythme.</span>
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Choisissez un mode pour commencer
        </p>
      </motion.div>

      {/* Mode cards */}
      <div className="mode-cards-grid mb-5">
        {modes.map((card, i) => (
          <motion.button
            key={card.mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelectMode(card.mode)}
            className="glass-card relative overflow-hidden flex flex-col justify-between min-h-[170px] w-full p-5 text-left"
          >
            {/* Accent glow */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
              style={{ background: card.accent }}
            />

            {/* Top border accent */}
            <div
              className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
              style={{ background: `linear-gradient(90deg, ${card.accent}, transparent)` }}
            />

            <div className="relative z-10">
              <card.Icon size={28} style={{ color: card.accent }} />
            </div>
            <div className="relative z-10">
              <div className="text-lg font-extrabold text-foreground mb-1">{card.title}</div>
              <div className="text-xs text-foreground/40 font-medium">{card.desc}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* History button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onHistory}
        className="glass-btn w-full flex items-center justify-center gap-3 h-[52px] rounded-2xl text-foreground/60 text-sm font-semibold"
      >
        <ClipboardList size={16} />
        Historique des séances
      </motion.button>

      {/* Settings sheet */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-[101] rounded-t-3xl p-6 pb-10"
              style={{
                background: 'rgba(22, 22, 26, 0.95)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
              }}
            >
              <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-6" />
              <h2 className="text-lg font-bold text-foreground mb-6">Paramètres</h2>
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <Volume2 size={16} className="text-foreground/40" />
                  <div className="flex-1">
                    <GlassToggle checked={settings.soundEnabled} onChange={val => update({ soundEnabled: val })} label="Sons activés" />
                  </div>
                </div>
                <div className="h-px bg-foreground/5" />
                <div className="flex items-center gap-3">
                  <Vibrate size={16} className="text-foreground/40" />
                  <div className="flex-1">
                    <GlassToggle checked={settings.vibrationEnabled} onChange={val => update({ vibrationEnabled: val })} label="Vibrations" />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="glass-btn w-full mt-8 h-[52px] rounded-2xl text-foreground/60 font-semibold"
              >
                Fermer
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
