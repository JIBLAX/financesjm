let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

// Unlock iOS AudioContext : jouer un buffer silencieux + resume()
// Doit être appelé dans un handler de geste utilisateur
function unlockCtx(ctx: AudioContext): void {
  try {
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
    ctx.resume().catch(() => {})
  } catch { /* ignore */ }
}

// Auto-unlock au premier touch/click sur la page (avant même le GO)
// Cela garantit que l'AudioContext est running dès le premier son
let autoUnlocked = false
function setupAutoUnlock() {
  const handler = () => {
    if (autoUnlocked) return
    autoUnlocked = true
    try {
      const ctx = getCtx()
      unlockCtx(ctx)
    } catch { /* ignore */ }
    document.removeEventListener('touchstart', handler)
    document.removeEventListener('mousedown', handler)
  }
  document.addEventListener('touchstart', handler, { passive: true })
  document.addEventListener('mousedown', handler)
}
setupAutoUnlock()

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainPeak = 0.4, startDelay = 0): void {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    // Petit délai de sécurité (0.02s) pour laisser le temps au context de reprendre
    const safeDelay = ctx.state === 'running' ? startDelay : startDelay + 0.05
    osc.frequency.setValueAtTime(freq, ctx.currentTime + safeDelay)
    gain.gain.setValueAtTime(0, ctx.currentTime + safeDelay)
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + safeDelay + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + safeDelay + duration)
    osc.start(ctx.currentTime + safeDelay)
    osc.stop(ctx.currentTime + safeDelay + duration + 0.05)
  } catch { /* silently fail */ }
}

export const audioService = {
  unlock(): void {
    try {
      const ctx = getCtx()
      unlockCtx(ctx)
    } catch { /* noop */ }
  },

  // WORK : double impulsion montante — énergique
  playWork(): void {
    playTone(660, 0.07, 'square', 0.28)
    playTone(880, 0.13, 'square', 0.32, 0.09)
  },

  // PAUSE (récup active) : ton doux descendant
  playRest(): void {
    playTone(660, 0.07, 'sine', 0.22)
    playTone(440, 0.20, 'sine', 0.20, 0.08)
  },

  // REPOS (entre rounds) : triple descente chaude
  playRoundRest(): void {
    playTone(660, 0.09, 'triangle', 0.20)
    playTone(550, 0.09, 'triangle', 0.18, 0.12)
    playTone(440, 0.22, 'sine', 0.16, 0.24)
  },

  // Countdown : 1 seul bip court par appel (le tick loop appelle déjà 3× à t=3,2,1)
  playCountdown(): void { playTone(1100, 0.07, 'sine', 0.26) },

  // Fin : accord ascendant victorieux
  playFinish(): void { [660, 880, 1100].forEach((f, i) => playTone(f, 0.22, 'sine', 0.36, i * 0.22)) },

  // AMRAP : tap de round
  playAmrapRound(): void { playTone(740, 0.10, 'sine', 0.26) },

  // Préparation : montée douce
  playPreparation(): void {
    playTone(440, 0.09, 'sine', 0.18)
    playTone(550, 0.16, 'sine', 0.20, 0.10)
  },
}
