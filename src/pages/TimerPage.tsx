import React, { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, Pause, Play, SkipForward, RotateCcw, Square, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

// Labels courts affichés dans le petit header
const phaseHeaderLabels: Record<TimerPhase, string> = {
  idle: 'PRÊT', preparation: 'PRÉPARATION', work: 'WORK', rest: 'PAUSE', round_rest: 'REPOS', finished: 'TERMINÉ',
}

// Grands labels au-dessus du cercle
const phaseBigLabels: Record<TimerPhase, string> = {
  idle: '', preparation: 'PRÉPAREZ-VOUS', work: 'WORK', rest: 'PAUSE', round_rest: 'REPOS', finished: 'TERMINÉ',
}

const phaseAccents: Record<TimerPhase, string> = {
  idle: 'rgba(255,255,255,0.25)',
  preparation: '#818CF8',
  work: '#4ADE80',
  rest: '#FB923C',
  round_rest: '#C9A96E',
  finished: '#4ADE80',
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

function useRingSize() {
  const [size, setSize] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 375
    if (w >= 1024) return 336
    if (w >= 768) return 320
    if (w >= 640) return 300
    if (w >= 480) return 280
    return 258
  })

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1024) setSize(336)
      else if (w >= 768) setSize(320)
      else if (w >= 640) setSize(300)
      else if (w >= 480) setSize(280)
      else setSize(258)
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return size
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
  const ringSize = useRingSize()

  const showBigLabel = state.phase !== 'idle'

  return (
    <div className="page-container pt-6">
      <GlassPhaseFlash phase={state.flash} />

      {/* Header */}
      <div className="flex items-center justify-between w-full mb-5">
        <button onClick={onBack} className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/55">
          <ChevronLeft size={20} />
        </button>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/35">
          {phaseHeaderLabels[state.phase]}
        </span>
        <div className="w-10" />
      </div>

      {/* Grand label de phase au-dessus du ring */}
      <div className="min-h-[60px] flex items-center justify-center mb-2">
        <AnimatePresence mode="wait">
          {showBigLabel && (
            <motion.div
              key={state.phase}
              initial={{ opacity: 0, y: -8, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="text-center"
            >
              <span
                className="phase-label"
                style={{
                  color: accent,
                  textShadow: `0 0 24px ${accent}55, 0 0 48px ${accent}22`,
                }}
              >
                {phaseBigLabels[state.phase]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ring — occupe l'espace restant, centré */}
      <div className="flex-1 flex items-center justify-center py-2">
        <GlassProgressRing size={ringSize} progress={progress} phase={state.phase} strokeWidth={7}>
          <div className="flex flex-col items-center gap-2">
            <motion.div
              key={state.timeLeft}
              initial={{ scale: 1.04, opacity: 0.75 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-5xl font-black text-foreground tracking-tight tabular-nums"
              style={{ textShadow: `0 0 22px ${accent}45` }}
            >
              {mode === 'fortime' ? formatTime(state.elapsed) : formatTime(state.timeLeft)}
            </motion.div>

            {(mode === 'tabata' || mode === 'circuit') && state.phase !== 'idle' && state.phase !== 'finished' && (
              <div className="flex items-center gap-3 text-xs text-foreground/38 font-semibold tracking-wide">
                <span>Ex {state.currentExercise}/{state.totalExercises}</span>
                <span className="w-px h-3 bg-foreground/12" />
                <span>Rd {state.currentRound}/{state.totalRounds}</span>
              </div>
            )}

            {mode === 'amrap' && state.phase === 'work' && (
              <div className="text-sm font-bold tabular-nums" style={{ color: accent }}>
                {state.amrapRounds} round{state.amrapRounds !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </GlassProgressRing>
      </div>

      {/* Controls */}
      <div className="w-full mt-5 flex flex-col gap-2.5">
        {state.phase === 'idle' && (
          <GlassButton variant="primary" fullWidth onClick={start}>
            <Play size={18} /> GO
          </GlassButton>
        )}

        {state.phase !== 'idle' && state.phase !== 'finished' && (
          <>
            <div className="flex gap-2.5">
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
              <RotateCcw size={15} /> Recommencer
            </GlassButton>
          </>
        )}

        {state.phase === 'finished' && (
          <GlassButton variant="ghost" fullWidth onClick={restart}>
            <RotateCcw size={15} /> Recommencer
          </GlassButton>
        )}
      </div>
    </div>
  )
}
