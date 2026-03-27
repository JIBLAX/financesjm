/**
 * Audio Service — Be Activ Timer
 *
 * Limitations connues iOS :
 * - Le commutateur silencieux peut MUTE le Web Audio API sur certains contextes iOS.
 * - navigator.vibrate() n'existe pas sur iOS Safari.
 * - iOS peut relocker/suspendre l'audio après un retour au premier plan ;
 *   on force donc un "unlock" très tôt dans le geste tactile.
 */

const AudioCtxClass =
  typeof window !== 'undefined'
    ? (window.AudioContext || (window as any).webkitAudioContext)
    : null

type ExtendedAudioState = AudioContextState | 'interrupted'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!AudioCtxClass) throw new Error('Web Audio API unavailable')
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioCtxClass()
  }
  return ctx
}

function isRunning(context: AudioContext): boolean {
  return (context.state as ExtendedAudioState) === 'running'
}

function primeAudioContext(context: AudioContext): void {
  try {
    const now = context.currentTime
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now)
    gain.gain.setValueAtTime(0.00001, now)
    osc.connect(gain)
    gain.connect(context.destination)
    osc.start(now)
    osc.stop(now + 0.03)
  } catch { /* ignore */ }
}

function resumeContext(context: AudioContext, withPrime = false): Promise<void> {
  if (isRunning(context)) {
    if (withPrime) primeAudioContext(context)
    return Promise.resolve()
  }

  return context
    .resume()
    .then(() => {
      if (withPrime) primeAudioContext(context)
    })
    .catch(() => {})
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.4,
  startDelay = 0,
): void {
  if (!AudioCtxClass) return

  const context = getCtx()

  const doPlay = () => {
    try {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.connect(gain)
      gain.connect(context.destination)
      osc.type = type
      const t = context.currentTime + startDelay
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.00001, t)
      gain.gain.linearRampToValueAtTime(gainPeak, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
      osc.start(t)
      osc.stop(t + duration + 0.05)
    } catch { /* ignore */ }
  }

  if (isRunning(context)) {
    doPlay()
  } else {
    void resumeContext(context).then(doPlay)
  }
}

function unlockAudio(): void {
  if (!AudioCtxClass) return

  const context = getCtx()

  try {
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * 0.03)), context.sampleRate)
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.value = 0.00001
    source.connect(gain)
    gain.connect(context.destination)
    source.start(0)
  } catch { /* ignore */ }

  void resumeContext(context, true)
}

if (typeof document !== 'undefined') {
  const resumeCtx = () => {
    if (!ctx) return
    void resumeContext(ctx, true)
  }

  document.addEventListener('touchstart', resumeCtx, { passive: true, capture: true })
  document.addEventListener('pointerdown', resumeCtx, { passive: true, capture: true })
  document.addEventListener('click', resumeCtx, { capture: true })

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return

    if (document.visibilityState === 'hidden' && isRunning(ctx)) {
      ctx.suspend().catch(() => {})
    }
  })

  window.addEventListener('pageshow', resumeCtx)
}

export const audioService = {
  unlock(): void { unlockAudio() },

  playWork(): void {
    playTone(660, 0.08, 'square', 0.35)
    playTone(880, 0.14, 'square', 0.38, 0.10)
  },

  playRest(): void {
    playTone(660, 0.08, 'sine', 0.28)
    playTone(440, 0.22, 'sine', 0.25, 0.09)
  },

  playRoundRest(): void {
    playTone(660, 0.10, 'triangle', 0.25)
    playTone(550, 0.10, 'triangle', 0.22, 0.13)
    playTone(440, 0.24, 'sine', 0.20, 0.26)
  },

  playCountdown(): void { playTone(1100, 0.08, 'sine', 0.32) },

  playFinish(): void {
    [660, 880, 1100].forEach((f, i) => playTone(f, 0.22, 'sine', 0.40, i * 0.22))
  },

  playAmrapRound(): void { playTone(740, 0.10, 'sine', 0.30) },

  playPreparation(): void {
    playTone(440, 0.10, 'sine', 0.24)
    playTone(550, 0.18, 'sine', 0.26, 0.11)
  },

  isAvailable(): boolean {
    return !!AudioCtxClass && !!ctx && isRunning(ctx)
  },
}
