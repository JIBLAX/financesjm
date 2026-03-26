import React from 'react'
import { CheckCircle, Clock, Dumbbell, RotateCcw, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import type { SessionResult } from '../types'
import { GlassButton } from '../components/GlassButton'

interface Props {
  result: SessionResult
  onRestart: () => void
  onHome: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}m ${sec}s`
}

const modeLabels: Record<string, string> = { tabata: 'TABATA', circuit: 'CIRCUIT', fortime: 'FOR TIME', amrap: 'AMRAP' }

export const SummaryPage: React.FC<Props> = ({ result, onRestart, onHome }) => {
  return (
    <div className="page-container pt-6 items-center">
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="mb-6"
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(74,222,128,0.1)',
            border: '2px solid rgba(74,222,128,0.3)',
            boxShadow: '0 0 40px rgba(74,222,128,0.2)',
          }}
        >
          <CheckCircle size={40} className="text-primary" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-black text-gradient-primary mb-2"
      >
        Bravo !
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-sm mb-8"
      >
        Séance {modeLabels[result.mode]} terminée
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card w-full p-5 mb-6"
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Clock size={16} className="mx-auto mb-2 text-foreground/40" />
            <div className="text-xl font-bold text-foreground">{formatTime(result.totalTime)}</div>
            <div className="text-xs text-muted-foreground mt-1">Durée</div>
          </div>
          <div>
            <RotateCcw size={16} className="mx-auto mb-2 text-foreground/40" />
            <div className="text-xl font-bold text-foreground">{result.rounds}</div>
            <div className="text-xs text-muted-foreground mt-1">Rounds</div>
          </div>
          <div>
            <Dumbbell size={16} className="mx-auto mb-2 text-foreground/40" />
            <div className="text-xl font-bold text-foreground">{result.exercises}</div>
            <div className="text-xs text-muted-foreground mt-1">Exercices</div>
          </div>
        </div>
      </motion.div>

      <div className="w-full mt-auto flex flex-col gap-3">
        <GlassButton variant="primary" fullWidth onClick={onRestart}>
          <RotateCcw size={16} /> Recommencer
        </GlassButton>
        <GlassButton variant="ghost" fullWidth onClick={onHome}>
          <Home size={16} /> Accueil
        </GlassButton>
      </div>
    </div>
  )
}
