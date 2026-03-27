import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimerMode, TimerPhase, TimerState, TimerConfig, TabataConfig, CircuitConfig, AmrapConfig } from '../types'
import { audioService } from '../services/audioService'
import type { AppSettings } from '../types'

let wakeLockSentinel: WakeLockSentinel | null = null

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen')
    }
  } catch { /* ignore */ }
}

function releaseWakeLock() {
  wakeLockSentinel?.release().catch(() => {})
  wakeLockSentinel = null
}

function makeInitialState(mode: TimerMode, config: TimerConfig): TimerState {
  if (mode === 'tabata') {
    const c = config as TabataConfig
    return { mode, config, phase: 'idle', flash: null, timeLeft: c.workTime, elapsed: 0, currentExercise: 1, currentRound: 1, totalExercises: c.exercises, totalRounds: c.rounds, isRunning: false, amrapRounds: 0 }
  }
  if (mode === 'circuit') {
    const c = config as CircuitConfig
    return { mode, config, phase: 'idle', flash: null, timeLeft: c.workTime, elapsed: 0, currentExercise: 1, currentRound: 1, totalExercises: c.exercises, totalRounds: c.rounds, isRunning: false, amrapRounds: 0 }
  }
  if (mode === 'fortime') {
    return { mode, config, phase: 'idle', flash: null, timeLeft: 0, elapsed: 0, currentExercise: 1, currentRound: 1, totalExercises: 1, totalRounds: 1, isRunning: false, amrapRounds: 0 }
  }
  const c = config as AmrapConfig
  return { mode, config, phase: 'idle', flash: null, timeLeft: c.duration, elapsed: 0, currentExercise: 1, currentRound: 1, totalExercises: 1, totalRounds: 1, isRunning: false, amrapRounds: 0 }
}

// Labels pour notifications et MediaSession
const phaseNotifMessages: Partial<Record<TimerPhase, string>> = {
  work: '💪 WORK — C\'est parti !',
  rest: '⏸ PAUSE — Récupère !',
  round_rest: '🛑 REPOS — Round terminé',
  preparation: '🎯 Préparez-vous !',
  finished: '🏁 Séance terminée !',
}

const phaseMediaTitles: Partial<Record<TimerPhase, string>> = {
  preparation: 'PRÉPARATION',
  work: 'WORK',
  rest: 'PAUSE',
  round_rest: 'REPOS',
  finished: 'TERMINÉ',
}

function sendPhaseNotification(phase: TimerPhase) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (!document.hidden) return // pas de notif si l'app est au premier plan
    const body = phaseNotifMessages[phase]
    if (!body) return
    new Notification('Be Activ Timer', { body, icon: '/favicon.ico', silent: false })
  } catch { /* ignore */ }
}

function updateMediaSession(phase: TimerPhase, isRunning: boolean) {
  try {
    if (!('mediaSession' in navigator)) return
    const title = phaseMediaTitles[phase]
    if (title) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Be Activ — ${title}`,
        artist: 'Be Activ Timer',
        album: 'Séance en cours',
      })
    }
    navigator.mediaSession.playbackState = isRunning ? 'playing' : 'paused'
  } catch { /* ignore */ }
}

export function useTimer(mode: TimerMode, config: TimerConfig, settings: AppSettings, onFinish: (elapsed: number, rounds: number) => void) {
  const [state, setState] = useState<TimerState>(() => makeInitialState(mode, config))
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateRef = useRef(state)
  const settingsRef = useRef(settings)

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { settingsRef.current = settings }, [settings])

  // MediaSession sync
  useEffect(() => {
    updateMediaSession(state.phase, state.isRunning)
  }, [state.phase, state.isRunning])

  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'visible' && stateRef.current.isRunning) requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVis)
    return () => { document.removeEventListener('visibilitychange', handleVis); releaseWakeLock() }
  }, [])

  const vibrate = useCallback((pattern: number | number[]) => {
    if (settingsRef.current.vibrationEnabled && navigator.vibrate) navigator.vibrate(pattern)
  }, [])

  const playSound = useCallback((phase: TimerPhase) => {
    if (!settingsRef.current.soundEnabled) return
    if (phase === 'preparation') audioService.playPreparation()
    else if (phase === 'work') audioService.playWork()
    else if (phase === 'rest') audioService.playRest()
    else if (phase === 'round_rest') audioService.playRoundRest()
    else if (phase === 'finished') audioService.playFinish()
  }, [])

  const triggerFlash = useCallback((phase: TimerPhase) => {
    setState(s => ({ ...s, flash: phase }))
    setTimeout(() => setState(s => ({ ...s, flash: null })), 350)
  }, [])

  const transitionTo = useCallback((newPhase: TimerPhase, newTime: number, updates: Partial<TimerState> = {}) => {
    playSound(newPhase)
    vibrate(newPhase === 'finished' ? [100, 50, 100, 50, 200] : [80])
    triggerFlash(newPhase)
    sendPhaseNotification(newPhase)
    setState(s => ({ ...s, phase: newPhase, timeLeft: newTime, ...updates }))
  }, [playSound, vibrate, triggerFlash])

  const advance = useCallback(() => {
    const s = stateRef.current
    const c = s.config as TabataConfig & CircuitConfig & AmrapConfig

    if (s.phase === 'preparation') {
      if (s.mode === 'tabata') transitionTo('work', (s.config as TabataConfig).workTime, {})
      else if (s.mode === 'circuit') transitionTo('work', (s.config as CircuitConfig).workTime, {})
      else if (s.mode === 'amrap') transitionTo('work', c.duration, {})
      else if (s.mode === 'fortime') transitionTo('work', 0, {})
      return
    }

    if (s.mode === 'tabata') {
      const t = s.config as TabataConfig
      if (s.phase === 'work') { transitionTo('rest', t.restTime, {}); return }
      if (s.phase === 'rest') {
        const nextR = s.currentRound + 1
        if (nextR <= s.totalRounds) { transitionTo('work', t.workTime, { currentRound: nextR }); return }
        const nextE = s.currentExercise + 1
        if (nextE <= s.totalExercises) { transitionTo('work', t.workTime, { currentExercise: nextE, currentRound: 1 }); return }
        transitionTo('finished', 0, {}); onFinish(s.elapsed, s.currentRound)
      }
    } else if (s.mode === 'circuit') {
      const ci = s.config as CircuitConfig
      if (s.phase === 'work') { transitionTo('rest', ci.restTime, {}); return }
      if (s.phase === 'rest') {
        const nextE = s.currentExercise + 1
        if (nextE <= s.totalExercises) { transitionTo('work', ci.workTime, { currentExercise: nextE }); return }
        const nextR = s.currentRound + 1
        if (nextR <= s.totalRounds) {
          if (ci.roundRestTime > 0) transitionTo('round_rest', ci.roundRestTime, { currentRound: nextR, currentExercise: 1 })
          else transitionTo('work', ci.workTime, { currentRound: nextR, currentExercise: 1 })
          return
        }
        transitionTo('finished', 0, {}); onFinish(s.elapsed, s.currentRound)
      }
      if (s.phase === 'round_rest') transitionTo('work', ci.workTime, {})
    } else if (s.mode === 'amrap') {
      transitionTo('finished', 0, {}); onFinish(c.duration, s.amrapRounds)
    }
  }, [transitionTo, onFinish])

  const tick = useCallback(() => {
    const s = stateRef.current
    if (!s.isRunning || s.phase === 'finished' || s.phase === 'idle') return

    if (s.mode === 'fortime' && s.phase === 'work') {
      setState(prev => ({ ...prev, elapsed: prev.elapsed + 1, timeLeft: prev.elapsed + 1 }))
      return
    }

    const newTimeLeft = s.timeLeft - 1
    const newElapsed = s.elapsed + 1

    // Countdown : 1 seul bip par seconde (le bug était que playCountdown jouait 3 bips à la fois)
    if (settingsRef.current.soundEnabled && s.phase !== 'finished' && s.phase !== 'idle' && s.phase !== 'preparation' && newTimeLeft <= 3 && newTimeLeft > 0) {
      audioService.playCountdown()
    }

    if (newTimeLeft <= 0) {
      setState(prev => ({ ...prev, elapsed: newElapsed, timeLeft: 0 }))
      advance()
    } else {
      setState(prev => ({ ...prev, timeLeft: newTimeLeft, elapsed: newElapsed }))
    }
  }, [advance])

  const start = useCallback(() => {
    // 1. Unlock SYNCHRONE dans le geste utilisateur — critique pour iOS
    audioService.unlock()
    requestWakeLock()

    // Demande de permission notifications (geste utilisateur = bon moment)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }

    // 2. Lire l'état courant via ref (synchrone, pas de setState ici)
    const s = stateRef.current
    const prepTime = (s.config as any).prepTime ?? 0

    // 3. Sons + vibration AVANT setState — on est encore dans le stack synchrone du geste
    //    Ne JAMAIS appeler playSound() à l'intérieur d'un setState updater :
    //    React peut invoquer les updaters deux fois (StrictMode) et en dehors du contexte utilisateur
    if (prepTime > 0) {
      playSound('preparation')
      vibrate(80)
      triggerFlash('preparation')
    } else {
      playSound('work')
      vibrate(80)
      triggerFlash('work')
    }

    // 4. Mise à jour d'état (pur, sans effets de bord audio)
    setState(prev => {
      const pt = (prev.config as any).prepTime ?? 0
      if (pt > 0) {
        return { ...prev, phase: 'preparation' as TimerPhase, timeLeft: pt, isRunning: true }
      }
      return { ...prev, phase: 'work' as TimerPhase, isRunning: true }
    })
  }, [playSound, triggerFlash, vibrate])

  const pause = useCallback(() => {
    setState(s => {
      const newRunning = !s.isRunning
      if (!newRunning) {
        releaseWakeLock()
        updateMediaSession(s.phase, false)
      } else {
        requestWakeLock()
        updateMediaSession(s.phase, true)
      }
      return { ...s, isRunning: newRunning }
    })
  }, [])

  const skip = useCallback(() => { advance() }, [advance])

  const restart = useCallback(() => {
    releaseWakeLock()
    if (tickRef.current) clearInterval(tickRef.current)
    setState(makeInitialState(mode, config))
  }, [mode, config])

  const addAmrapRound = useCallback(() => {
    if (settingsRef.current.soundEnabled) audioService.playAmrapRound()
    setState(s => ({ ...s, amrapRounds: s.amrapRounds + 1 }))
    vibrate(60)
  }, [vibrate])

  const stopForTime = useCallback(() => {
    const s = stateRef.current
    releaseWakeLock()
    transitionTo('finished', 0, {})
    onFinish(s.elapsed, 1)
  }, [transitionTo, onFinish])

  useEffect(() => {
    if (state.isRunning && state.phase !== 'finished' && state.phase !== 'idle') {
      tickRef.current = setInterval(tick, 1000)
    } else {
      if (tickRef.current) clearInterval(tickRef.current)
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [state.isRunning, state.phase, tick])

  useEffect(() => { if (state.phase === 'finished') releaseWakeLock() }, [state.phase])

  return { state, start, pause, skip, restart, addAmrapRound, stopForTime }
}
