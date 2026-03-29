import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, Pause, Play, SkipForward, RotateCcw, Square, Plus, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TimerMode, TimerConfig, SessionResult, AppSettings, TimerPhase } from '../types'
import { useTimer } from '../hooks/useTimer'
import { GlassProgressRing } from '../components/GlassProgressRing'
import { GlassPhaseFlash } from '../components/GlassPhaseFlash'
import { GlassButton } from '../components/GlassButton'
import { audioService } from '../services/audioService'
import type { TabataConfig, CircuitConfig, AmrapConfig } from '../types'

interface Props {
  mode: TimerMode
  config: TimerConfig
  settings: AppSettings
  coachTag: string
  onFinish: (result: SessionResult) => void
  onBack: () => void
}

const phaseBigLabels: Record<TimerPhase, string> = {
  idle: '', preparation: 'PRÊT', work: 'WORK', rest: 'PAUSE', round_rest: 'REPOS', finished: 'TERMINÉ',
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

export const TimerPage: React.FC<Props> = ({ mode, config, settings, coachTag, onFinish, onBack }) => {
  const [confirmExit, setConfirmExit] = useState(false)

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

  const primeAudio = useCallback(() => {
    if (settings.soundEnabled) audioService.unlock()
  }, [settings.soundEnabled])

  const handleBack = () => {
    if (state.phase !== 'idle' && state.phase !== 'finished') {
      if (state.isRunning) pause()
      setConfirmExit(true)
    } else {
      onBack()
    }
  }

  const exitDialog = createPortal(
    <AnimatePresence>
      {confirmExit && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9998 }}
            onClick={() => setConfirmExit(false)}
          />
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
            zIndex: 9999,
            pointerEvents: 'none',
          }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            style={{
              width: '100%',
              maxWidth: 340,
              pointerEvents: 'auto',
              borderRadius: 24,
              padding: '28px 24px 24px',
              background: 'rgba(20,15,12,0.98)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,215,175,0.12)',
            }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertTriangle size={22} className="text-destructive" />
              </div>
              <div>
                <div className="text-base font-bold text-foreground mb-1">Quitter la séance ?</div>
                <div className="text-sm text-muted-foreground">Ta progression sera perdue.</div>
              </div>
              <div className="flex gap-3 w-full mt-1">
                <button
                  onClick={() => setConfirmExit(false)}
                  className="flex-1 h-11 rounded-xl glass-btn text-sm font-semibold text-foreground/70"
                >
                  Continuer
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'hsl(var(--destructive))', opacity: 0.9 }}
                >
                  Quitter
                </button>
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
      <GlassPhaseFlash phase={state.flash} />
      {exitDialog}

      <div className="flex items-center justify-between w-full mb-5">
        <button onClick={handleBack} className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/55">
          <ChevronLeft size={20} />
        </button>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/35">
          {coachTag ? `BE ACTIV | ${coachTag}` : 'BE ACTIV'}
        </span>
        <div className="w-10" />
      </div>

      <div className="min-h-[80px] flex items-center justify-center mb-2">
        <AnimatePresence mode="wait">
          {state.phase !== 'idle' && (
            <motion.div
              key={state.phase}
              initial={{ opacity: 0, y: -8, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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

      <div className="w-full mt-5 flex flex-col gap-2.5">
        {state.phase === 'idle' && (
          <GlassButton variant="primary" fullWidth onPointerDownCapture={primeAudio} onTouchStartCapture={primeAudio} onClick={start}>
            <Play size={18} /> GO
          </GlassButton>
        )}

        {state.phase !== 'idle' && state.phase !== 'finished' && (
          <>
            <div className="flex gap-2.5">
              <GlassButton variant="glass" fullWidth onPointerDownCapture={primeAudio} onTouchStartCapture={primeAudio} onClick={pause}>
                {state.isRunning ? <Pause size={18} /> : <Play size={18} />}
                {state.isRunning ? 'Pause' : 'Reprendre'}
              </GlassButton>
              {mode !== 'fortime' && mode !== 'amrap' && (
                <GlassButton variant="ghost" onPointerDownCapture={primeAudio} onTouchStartCapture={primeAudio} onClick={skip}>
                  <SkipForward size={18} />
                </GlassButton>
              )}
            </div>

            {mode === 'amrap' && state.phase === 'work' && (
              <GlassButton variant="primary" fullWidth onPointerDownCapture={primeAudio} onTouchStartCapture={primeAudio} onClick={addAmrapRound}>
                <Plus size={18} /> Round
              </GlassButton>
            )}

            {mode === 'fortime' && state.phase === 'work' && (
              <GlassButton variant="primary" fullWidth onPointerDownCapture={primeAudio} onTouchStartCapture={primeAudio} onClick={stopForTime}>
                <Square size={18} /> STOP
              </GlassButton>
            )}

            <GlassButton variant="ghost" fullWidth onPointerDownCapture={primeAudio} onTouchStartCapture={primeAudio} onClick={restart}>
              <RotateCcw size={15} /> Recommencer
            </GlassButton>
          </>
        )}

        {state.phase === 'finished' && (
          <GlassButton variant="ghost" fullWidth onPointerDownCapture={primeAudio} onTouchStartCapture={primeAudio} onClick={restart}>
            <RotateCcw size={15} /> Recommencer
          </GlassButton>
        )}
      </div>
    </div>
  )
}
