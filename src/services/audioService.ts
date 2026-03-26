let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
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
    try { const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume() } catch { /* noop */ }
  },

  // WORK: Double impulsion montante, énergique — "go !"
  playWork(): void {
    playTone(660, 0.07, 'square', 0.28)
    playTone(880, 0.13, 'square', 0.32, 0.09)
  },

  // PAUSE (récupération active): Ton doux descendant — "souffle"
  playRest(): void {
    playTone(660, 0.07, 'sine', 0.22)
    playTone(440, 0.20, 'sine', 0.20, 0.08)
  },

  // REPOS (repos complet entre rounds): Triple descente chaude — "repos total"
  playRoundRest(): void {
    playTone(660, 0.09, 'triangle', 0.20)
    playTone(550, 0.09, 'triangle', 0.18, 0.12)
    playTone(440, 0.22, 'sine', 0.16, 0.24)
  },

  // Countdown: 1 seul bip court par appel (le tick loop appelle déjà 3 fois à t=3,2,1)
  playCountdown(): void { playTone(1100, 0.07, 'sine', 0.26) },

  // Fin de séance: accord ascendant victorieux
  playFinish(): void { [660, 880, 1100].forEach((f, i) => playTone(f, 0.22, 'sine', 0.36, i * 0.22)) },

  // AMRAP: tap de round
  playAmrapRound(): void { playTone(740, 0.10, 'sine', 0.26) },

  // Préparation: ton chaud montant — "attention"
  playPreparation(): void {
    playTone(440, 0.09, 'sine', 0.18)
    playTone(550, 0.16, 'sine', 0.20, 0.10)
  },
}
