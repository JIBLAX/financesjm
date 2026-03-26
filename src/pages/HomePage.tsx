import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Zap, RefreshCw, Clock, Trophy, Settings, ClipboardList, Volume2, Vibrate, ChevronRight, Bell } from 'lucide-react'
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
  Icon: React.ComponentType<{ size?: number; color?: string }>
}

const modes: ModeCard[] = [
  { mode: 'tabata', title: 'TABATA', desc: '20s / 10s · Rounds', accent: 'hsl(var(--accent-tabata))', Icon: Zap },
  { mode: 'circuit', title: 'CIRCUIT', desc: 'Exercices · Rounds', accent: 'hsl(var(--accent-circuit))', Icon: RefreshCw },
  { mode: 'fortime', title: 'FOR TIME', desc: 'Chrono ascendant', accent: 'hsl(var(--accent-fortime))', Icon: Clock },
  { mode: 'amrap', title: 'AMRAP', desc: 'Max rounds · Durée', accent: 'hsl(var(--accent-amrap))', Icon: Trophy },
]

function notifStatus(): string {
  if (typeof Notification === 'undefined') return 'Non supportées sur ce navigateur'
  if (Notification.permission === 'granted') return 'Activées ✓'
  if (Notification.permission === 'denied') return 'Refusées par le navigateur'
  return 'Appuyer pour activer'
}

export const HomePage: React.FC<Props> = ({ onSelectMode, onHistory }) => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, forceUpdate] = useState(0)
  const { settings, update } = useSettings()

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
      forceUpdate(n => n + 1)
    }
  }

  // Settings panel rendu en portal pour éviter le bug fixed/transform de Framer Motion
  const settingsPanel = createPortal(
    <AnimatePresence>
      {settingsOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSettingsOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(8,6,5,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 9998 }}
          />
          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 420 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '520px',
              zIndex: 9999,
              borderRadius: '24px 24px 0 0',
              padding: '24px 24px 40px',
              background: 'rgba(16, 12, 10, 0.98)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 215, 175, 0.10)',
              borderBottom: 'none',
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 20 }}>Paramètres</h2>

            <div className="flex flex-col gap-0 divide-y divide-foreground/[0.06]">
              <div className="flex items-center gap-3 py-4">
                <Volume2 size={16} className="text-foreground/40 shrink-0" />
                <div className="flex-1">
                  <GlassToggle checked={settings.soundEnabled} onChange={val => update({ soundEnabled: val })} label="Sons activés" />
                </div>
              </div>

              <div className="flex items-center gap-3 py-4">
                <Vibrate size={16} className="text-foreground/40 shrink-0" />
                <div className="flex-1">
                  <GlassToggle checked={settings.vibrationEnabled} onChange={val => update({ vibrationEnabled: val })} label="Vibrations" />
                </div>
              </div>

              <button onClick={requestNotifications} className="flex items-center gap-3 py-4 text-left w-full">
                <Bell size={16} className="text-foreground/40 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Notifications de phase</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{notifStatus()}</div>
                </div>
              </button>

              <button
                onClick={() => { setSettingsOpen(false); onHistory() }}
                className="flex items-center gap-3 py-4 text-left w-full"
              >
                <ClipboardList size={16} className="text-foreground/40 shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">Historique des séances</span>
                <ChevronRight size={15} className="text-foreground/30" />
              </button>
            </div>

            <button
              onClick={() => setSettingsOpen(false)}
              className="glass-btn w-full mt-6 h-[50px] rounded-2xl text-foreground/55 font-semibold text-sm"
            >
              Fermer
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )

  return (
    <div className="page-container">
      {/* Header : logo centré + bouton settings */}
      <div className="flex items-center justify-between pt-6 mb-5">
        <div className="w-10" />
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo nettement plus grand */}
          <img src={logoBeactiv} alt="Be Activ" className="h-16 object-contain" />
        </motion.div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/50"
          aria-label="Paramètres"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Hero — centré, "!" sur la même ligne que "ton rythme" */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="text-center mb-7"
      >
        <h1 className="text-[2rem] font-extrabold text-foreground leading-tight mb-2 tracking-tight">
          Ta séance,<br />
          <span className="text-gradient-primary">ton rythme&nbsp;!</span>
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Choisissez un mode pour commencer
        </p>
      </motion.div>

      {/* Mode cards — 2×2, contenu centré */}
      <div className="mode-cards-grid flex-1">
        {modes.map((card, i) => (
          <motion.button
            key={card.mode}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.38 }}
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelectMode(card.mode)}
            className="glass-card relative overflow-hidden flex flex-col items-center justify-center min-h-[148px] w-full py-5 px-3 gap-3"
          >
            <div
              className="absolute inset-0 opacity-[0.09] pointer-events-none"
              style={{ background: `radial-gradient(circle at 50% 40%, ${card.accent}, transparent 68%)` }}
            />
            <div
              className="absolute top-0 left-6 right-6 h-[2px] rounded-full opacity-80"
              style={{ background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)` }}
            />
            <div className="relative z-10 flex items-center justify-center">
              <card.Icon size={24} color={card.accent} />
            </div>
            <div className="relative z-10 text-center">
              <div className="text-sm font-extrabold text-foreground tracking-widest mb-0.5">{card.title}</div>
              <div className="text-[11px] text-foreground/38 font-medium leading-tight">{card.desc}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {settingsPanel}
    </div>
  )
}
