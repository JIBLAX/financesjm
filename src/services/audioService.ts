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
  playWork(): void { playTone(880, 0.12, 'square', 0.35) },
  playRest(): void { playTone(440, 0.16, 'sine', 0.3) },
  playRoundRest(): void { playTone(660, 0.14, 'triangle', 0.28) },
  playCountdown(): void { for (let i = 0; i < 3; i++) playTone(1000, 0.1, 'sine', 0.32, i) },
  playFinish(): void { [660, 880, 1100].forEach((f, i) => playTone(f, 0.2, 'sine', 0.38, i * 0.22)) },
  playAmrapRound(): void { playTone(740, 0.1, 'sine', 0.28) },
  playPreparation(): void { playTone(600, 0.15, 'sine', 0.25) },
}
