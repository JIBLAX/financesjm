import React from 'react'
import { ChevronLeft, Trash2, Clock, Zap, RefreshCw, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
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

const modeAccents: Record<TimerMode, string> = {
  tabata: 'hsl(var(--accent-tabata))', circuit: 'hsl(var(--accent-circuit))', fortime: 'hsl(var(--accent-fortime))', amrap: 'hsl(var(--accent-amrap))',
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}m ${sec}s`
}

export const HistoryPage: React.FC<Props> = ({ sessions, onBack, onClear }) => {
  return (
    <div className="page-container pt-6">
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
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
                    >
                      <Icon size={16} color={accent} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground uppercase">{s.mode}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-foreground/50">
                    <span>{formatTime(s.totalTime)}</span>
                    <span>{s.rounds}R · {s.exercises}Ex</span>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <GlassButton variant="danger" fullWidth onClick={onClear}>
            <Trash2 size={16} /> Effacer l'historique
          </GlassButton>
        </>
      )}
    </div>
  )
}
