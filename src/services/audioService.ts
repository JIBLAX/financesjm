/**
 * Audio Service — Be Activ Timer
 *
 * Limitations connues iOS :
 * - Le commutateur silencieux MUTE le Web Audio API. Si l'iPhone est en mode silence/vibreur,
 *   aucun son ne sortira — c'est une contrainte hardware iOS impossible à contourner via le web.
 * - navigator.vibrate() n'existe pas sur iOS Safari (Apple n'a jamais implémenté l'API Vibration).
 *   Sur Android Chrome, la vibration fonctionne normalement.
 * - Sur iOS, l'AudioContext peut être suspendu automatiquement. On le reprend à chaque interaction.
 */

const AudioCtxClass =
  typeof window !== 'undefined'
    ? (window.AudioContext || (window as any).webkitAudioContext)
    : null

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioCtxClass()
  }
  return ctx
}

// Joue un son. Si le contexte est suspendu, attend resume() PUIS joue.
// Pattern .then() pour ne jamais bloquer la stack synchrone.
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
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(gainPeak, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
      osc.start(t)
      osc.stop(t + duration + 0.05)
    } catch { /* ignore */ }
  }

  if (context.state === 'running') {
    doPlay()
  } else {
    // Contexte suspendu → résoudre d'abord, puis jouer
    context.resume().then(doPlay).catch(() => {})
  }
}

// Unlock/resume : appeler DIRECTEMENT dans un handler de geste utilisateur (click, touchstart)
// La séquence : buffer silencieux + resume() = débloque l'audio session iOS
function unlockAudio(): void {
  if (!AudioCtxClass) return
  const context = getCtx()
  try {
    const buf = context.createBuffer(1, 1, 22050)
    const src = context.createBufferSource()
    src.buffer = buf
    src.connect(context.destination)
    src.start(0)
  } catch { /* ignore */ }
  context.resume().catch(() => {})
}

// Listener PERSISTANT (pas removeEventListener) : reprend le contexte à chaque interaction.
// iOS peut suspendre l'AudioContext entre les navigations / backgrounding.
if (typeof document !== 'undefined') {
  const resumeCtx = () => {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  }
  // capture:true pour attraper l'event avant les composants React
  document.addEventListener('touchstart', resumeCtx, { passive: true, capture: true })
  document.addEventListener('click', resumeCtx, { capture: true })

  // Reprend quand l'app revient au premier plan (après backgrounding)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      resumeCtx()
    }
  })
}

export const audioService = {
  /**
   * À appeler dans le handler direct du geste "GO" (onClick synchrone).
   * Crée et débloque l'AudioContext dans le contexte utilisateur iOS.
   */
  unlock(): void { unlockAudio() },

  // WORK : double impulsion montante
  playWork(): void {
    playTone(660, 0.08, 'square', 0.35)
    playTone(880, 0.14, 'square', 0.38, 0.10)
  },

  // PAUSE : descente douce
  playRest(): void {
    playTone(660, 0.08, 'sine', 0.28)
    playTone(440, 0.22, 'sine', 0.25, 0.09)
  },

  // REPOS inter-rounds : triple descente
  playRoundRest(): void {
    playTone(660, 0.10, 'triangle', 0.25)
    playTone(550, 0.10, 'triangle', 0.22, 0.13)
    playTone(440, 0.24, 'sine', 0.20, 0.26)
  },

  // Countdown : 1 bip par appel (appelé 3× pour t=3,2,1)
  playCountdown(): void { playTone(1100, 0.08, 'sine', 0.32) },

  // Fin de séance
  playFinish(): void {
    [660, 880, 1100].forEach((f, i) => playTone(f, 0.22, 'sine', 0.40, i * 0.22))
  },

  // AMRAP : round comptabilisé
  playAmrapRound(): void { playTone(740, 0.10, 'sine', 0.30) },

  // Préparation
  playPreparation(): void {
    playTone(440, 0.10, 'sine', 0.24)
    playTone(550, 0.18, 'sine', 0.26, 0.11)
  },

  /** Retourne true si l'API est disponible et le contexte actif */
  isAvailable(): boolean {
    return !!AudioCtxClass && !!ctx && ctx.state === 'running'
  },
}
