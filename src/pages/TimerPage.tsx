import React, { useCallback } from 'react'
import { ChevronLeft, Pause, Play, SkipForward, RotateCcw, Square, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import type { TimerMode, TimerConfig, SessionResult, AppSettings, TimerPhase } from '../types'
import { useTimer } from '../hooks/useTimer'
import { GlassProgressRing } from '../components/GlassProgressRing'
import { GlassPhaseFlash } from '../components/GlassPhaseFlash'
import { GlassButton } from '../components/GlassButton'
import type { TabataConfig, CircuitConfig, AmrapConfig } from '../types'

interface Props {
  mode: TimerMode
  config: TimerConfig
  settings: AppSettings
  onFinish: (result: SessionResult) => void
  onBack: () => void
}

const phaseLabels: Record<TimerPhase, string> = {
  idle: 'PRÊT', preparation: 'PRÉPAREZ-VOUS', work: 'TRAVAIL', rest: 'REPOS', round_rest: 'REPOS ROUND', finished: 'TERMINÉ'
}

const phaseAccents: Record<TimerPhase, string> = {
  idle: 'rgba(255,255,255,0.3)', preparation: '#818CF8', work: '#4ADE80', rest: '#FB923C', round_rest: '#D4B896', finished: '#4ADE80'
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function getProgress(state: ReturnType<typeof useTimer>['state']): number {
  const { mode, phase, timeLeft, config } = state
  if (phase === 'idle' || phase === 'finished') return phase === 'finished' ? 1 : 0
  if (mode === 'fortime') return 0
  const c = config as any
  let total = 0
  if (phase === 'preparation') total = c.prepTime || 0
  else if (phase === 'work') total = c.workTime || c.duration || 0
  else if (phase === 'rest') total = c.restTime || 0
  else if (phase === 'round_rest') total = c.roundRestTime || 0
  return total > 0 ? 1 - timeLeft / total : 0
}

export const TimerPage: React.FC<Props> = ({ mode, config, settings, onFinish, onBack }) => {
  const handleFinish = useCallback((elapsed: number, rounds: number) => {
    const c = config as any
    onFinish({
      id: crypto.randomUUID(),
      mode,
      date: new Date().toISOString(),
      totalTime: elapsed,
      rounds,
      exercises: c.exercises ?? 1,
      config,
    })
  }, [mode, config, onFinish])

  const { state, start, pause, skip, restart, addAmrapRound, stopForTime } = useTimer(mode, config, settings, handleFinish)
  const progress = getProgress(state)
  const accent = phaseAccents[state.phase]

  return (
    <div className="page-container pt-6 items-center">
      <GlassPhaseFlash phase={state.flash} />

      {/* Top */}
      <div className="flex items-center justify-between w-full mb-8">
        <button onClick={onBack} className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/60">
          <ChevronLeft size={20} />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">
          {phaseLabels[state.phase]}
        </span>
        <div className="w-10" />
      </div>

      {/* Ring */}
      <div className="flex-1 flex items-center justify-center">
        <GlassProgressRing size={280} progress={progress} phase={state.phase} strokeWidth={6}>
          <div className="flex flex-col items-center">
            <motion.div
              key={state.timeLeft}
              initial={{ scale: 1.05, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-foreground tracking-tight tabular-nums"
              style={{ textShadow: `0 0 20px ${accent}40` }}
            >
              {formatTime(state.timeLeft)}
            </motion.div>

            {(mode === 'tabata' || mode === 'circuit') && state.phase !== 'idle' && state.phase !== 'finished' && (
              <div className="mt-3 flex items-center gap-3 text-xs text-foreground/40 font-medium">
                <span>Ex {state.currentExercise}/{state.totalExercises}</span>
                <span className="w-px h-3 bg-foreground/10" />
                <span>Rd {state.currentRound}/{state.totalRounds}</span>
              </div>
            )}

            {mode === 'amrap' && state.phase === 'work' && (
              <div className="mt-3 text-sm font-bold" style={{ color: accent }}>
                {state.amrapRounds} rounds
              </div>
            )}
          </div>
        </GlassProgressRing>
      </div>

      {/* Controls */}
      <div className="w-full mt-8 flex flex-col gap-3">
        {state.phase === 'idle' && (
          <GlassButton variant="primary" fullWidth onClick={start}>
            <Play size={18} /> GO
          </GlassButton>
        )}

        {state.phase !== 'idle' && state.phase !== 'finished' && (
          <>
            <div className="flex gap-3">
              <GlassButton variant="glass" fullWidth onClick={pause}>
                {state.isRunning ? <Pause size={18} /> : <Play size={18} />}
                {state.isRunning ? 'Pause' : 'Reprendre'}
              </GlassButton>

              {mode !== 'fortime' && mode !== 'amrap' && (
                <GlassButton variant="ghost" onClick={skip}>
                  <SkipForward size={18} />
                </GlassButton>
              )}
            </div>

            {mode === 'amrap' && state.phase === 'work' && (
              <GlassButton variant="primary" fullWidth onClick={addAmrapRound}>
                <Plus size={18} /> Round
              </GlassButton>
            )}

            {mode === 'fortime' && state.phase === 'work' && (
              <GlassButton variant="primary" fullWidth onClick={stopForTime}>
                <Square size={18} /> STOP
              </GlassButton>
            )}

            <GlassButton variant="ghost" fullWidth onClick={restart}>
              <RotateCcw size={16} /> Recommencer
            </GlassButton>
          </>
        )}
      </div>
    </div>
  )
}
