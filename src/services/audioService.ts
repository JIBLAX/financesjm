// webkitAudioContext pour compatibilité iOS ancienne
const AudioCtx = typeof window !== 'undefined'
  ? (window.AudioContext || (window as any).webkitAudioContext)
  : null

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioCtx()
  }
  // Resume systématiquement si suspendu — pattern original qui fonctionnait
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// Unlock iOS : jouer un buffer silencieux DANS le handler du geste utilisateur
function unlockWithSilentBuffer(ctx: AudioContext): void {
  try {
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
    ctx.resume().catch(() => {})
  } catch { /* ignore */ }
}

// Auto-unlock dès le premier touch/click — avant même d'appuyer sur GO
if (typeof document !== 'undefined') {
  const handler = () => {
    try { unlockWithSilentBuffer(getCtx()) } catch { /* ignore */ }
    document.removeEventListener('touchstart', handler)
    document.removeEventListener('click', handler)
  }
  document.addEventListener('touchstart', handler, { passive: true })
  document.addEventListener('click', handler)
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainPeak = 0.4, startDelay = 0): void {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay)
    gain.gain.setValueAtTime(0, ctx.currentTime + startDelay)
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + startDelay + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration)
    osc.start(ctx.currentTime + startDelay)
    osc.stop(ctx.currentTime + startDelay + duration + 0.05)
  } catch { /* silently fail */ }
}

export const audioService = {
  unlock(): void {
    try { unlockWithSilentBuffer(getCtx()) } catch { /* noop */ }
  },

  // WORK : double impulsion montante — énergique
  playWork(): void {
    playTone(660, 0.08, 'square', 0.30)
    playTone(880, 0.14, 'square', 0.34, 0.10)
  },

  // PAUSE (récup) : ton doux descendant
  playRest(): void {
    playTone(660, 0.08, 'sine', 0.24)
    playTone(440, 0.22, 'sine', 0.22, 0.09)
  },

  // REPOS (inter-rounds) : triple descente chaude
  playRoundRest(): void {
    playTone(660, 0.10, 'triangle', 0.22)
    playTone(550, 0.10, 'triangle', 0.19, 0.13)
    playTone(440, 0.24, 'sine', 0.17, 0.26)
  },

  // Countdown : 1 seul bip court par appel (tick loop appelle 3× à t=3,2,1)
  playCountdown(): void { playTone(1100, 0.08, 'sine', 0.28) },

  // Fin : accord ascendant
  playFinish(): void { [660, 880, 1100].forEach((f, i) => playTone(f, 0.22, 'sine', 0.36, i * 0.22)) },

  // AMRAP round tap
  playAmrapRound(): void { playTone(740, 0.10, 'sine', 0.26) },

  // Préparation
  playPreparation(): void {
    playTone(440, 0.10, 'sine', 0.20)
    playTone(550, 0.18, 'sine', 0.22, 0.11)
  },
}
