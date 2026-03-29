import React, { useState } from 'react'
import { ChevronLeft, Trash2, Clock, Zap, RefreshCw, Trophy, AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { SessionResult, TimerMode } from '../types'
import { GlassButton } from '../components/GlassButton'

interface Props {
  sessions: SessionResult[]
  onBack: () => void
  onClear: () => void
}

const modeIcons: Record<TimerMode, any> = {
  tabata: Zap, circuit: RefreshCw, fortime: Clock, amrap: Trophy,
}

const modeLabels: Record<TimerMode, string> = {
  tabata: 'TABATA', circuit: 'CIRCUIT', fortime: 'FOR TIME', amrap: 'AMRAP',
}

const modeAccents: Record<TimerMode, string> = {
  tabata: 'hsl(var(--accent-tabata))', circuit: 'hsl(var(--accent-circuit))',
  fortime: 'hsl(var(--accent-fortime))', amrap: 'hsl(var(--accent-amrap))',
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}m ${sec}s`
}

export const HistoryPage: React.FC<Props> = ({ sessions, onBack, onClear }) => {
  const [confirmClear, setConfirmClear] = useState(false)

  const clearDialog = createPortal(
    <AnimatePresence>
      {confirmClear && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9998 }}
            onClick={() => setConfirmClear(false)}
          />
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', zIndex: 9999, pointerEvents: 'none' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              style={{ width: '100%', maxWidth: 340, pointerEvents: 'auto', borderRadius: 24, padding: '28px 24px 24px', background: 'rgba(20,15,12,0.98)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,215,175,0.12)' }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertTriangle size={22} className="text-destructive" />
                </div>
                <div>
                  <div className="text-base font-bold text-foreground mb-1">Effacer l'historique ?</div>
                  <div className="text-sm text-muted-foreground">Toutes les séances seront supprimées définitivement.</div>
                </div>
                <div className="flex gap-3 w-full mt-1">
                  <button onClick={() => setConfirmClear(false)} className="flex-1 h-11 rounded-xl glass-btn text-sm font-semibold text-foreground/70">Annuler</button>
                  <button onClick={() => { onClear(); setConfirmClear(false) }} className="flex-1 h-11 rounded-xl text-sm font-semibold text-white" style={{ background: 'hsl(var(--destructive))', opacity: 0.9 }}>Effacer</button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )

  return (
    <div className="page-container pt-6">
      {clearDialog}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/55">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-foreground">Historique</h2>
        <div className="w-10" />
      </div>

      {sessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Aucune séance enregistrée</p>
        </div>
      ) : (
        <>
          <div className="history-grid mb-6">
            {sessions.map((s, i) => {
              const Icon = modeIcons[s.mode]
              const accent = modeAccents[s.mode]
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
                      <Icon size={16} color={accent} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{modeLabels[s.mode]}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-foreground/50">
                    <span>{formatTime(s.totalTime)}</span>
                    {s.mode !== 'fortime' && <span>{s.rounds}R · {s.exercises}Ex</span>}
                  </div>
                </motion.div>
              )
            })}
          </div>

          <GlassButton variant="danger" fullWidth onClick={() => setConfirmClear(true)}>
            <Trash2 size={16} /> Effacer l'historique
          </GlassButton>
        </>
      )}
    </div>
  )
}
