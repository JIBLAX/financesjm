import React, { useState } from 'react'
import { ChevronLeft, Play } from 'lucide-react'
import { motion } from 'framer-motion'
import type { TimerMode, TimerConfig, TabataConfig, CircuitConfig, AmrapConfig } from '../types'
import { GlassStepper } from '../components/GlassStepper'
import { GlassButton } from '../components/GlassButton'

interface Props {
  mode: TimerMode
  onStart: (config: TimerConfig) => void
  onBack: () => void
}

const modeLabels: Record<TimerMode, string> = { tabata: 'TABATA', circuit: 'CIRCUIT', fortime: 'FOR TIME', amrap: 'AMRAP' }
const modeDescriptions: Record<TimerMode, string> = {
  tabata: 'Alternez travail et repos sur plusieurs rounds.',
  circuit: 'Enchaînez les exercices avec repos configurables.',
  fortime: 'Chronomètre ascendant · Stop manuel.',
  amrap: 'Max rounds dans le temps imparti.',
}
const modeAccents: Record<TimerMode, string> = { tabata: 'hsl(var(--accent-tabata))', circuit: 'hsl(var(--accent-circuit))', fortime: 'hsl(var(--accent-fortime))', amrap: 'hsl(var(--accent-amrap))' }

function formatDuration(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}m${sec > 0 ? ` ${sec}s` : ''}`
}

export const SetupPage: React.FC<Props> = ({ mode, onStart, onBack }) => {
  const accent = modeAccents[mode]

  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)
  const [exercises, setExercises] = useState(8)
  const [rounds, setRounds] = useState(8)
  const [prepTime, setPrepTime] = useState(5)
  const [cWorkTime, setCWorkTime] = useState(30)
  const [cRestTime, setCRestTime] = useState(15)
  const [cExercises, setCExercises] = useState(5)
  const [cRounds, setCRounds] = useState(3)
  const [cRoundRest, setCRoundRest] = useState(60)
  const [cPrepTime, setCPrepTime] = useState(10)
  const [amrapDuration, setAmrapDuration] = useState(600)
  const [amrapPrep, setAmrapPrep] = useState(10)
  const [ftPrep, setFtPrep] = useState(5)

  const handleStart = () => {
    if (mode === 'tabata') onStart({ workTime, restTime, exercises, rounds, prepTime } as TabataConfig)
    else if (mode === 'circuit') onStart({ workTime: cWorkTime, restTime: cRestTime, exercises: cExercises, rounds: cRounds, roundRestTime: cRoundRest, prepTime: cPrepTime } as CircuitConfig)
    else if (mode === 'amrap') onStart({ duration: amrapDuration, prepTime: amrapPrep } as AmrapConfig)
    else onStart({ prepTime: ftPrep })
  }

  const totalTabata = (workTime + restTime) * rounds * exercises + prepTime
  const totalCircuit = (cWorkTime + cRestTime) * cExercises * cRounds + cRoundRest * (cRounds - 1) + cPrepTime

  return (
    <div className="page-container pt-6">
      {/* Top */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground">
          <ChevronLeft size={20} />
        </button>
        <span
          className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg"
          style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          {modeLabels[mode]}
        </span>
        <div className="w-10" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-2xl font-extrabold text-foreground mb-1">Configurez</h2>
        <p className="text-sm text-muted-foreground">{modeDescriptions[mode]}</p>
      </motion.div>

      <div className="setup-fields-grid mb-6">
        {mode === 'tabata' && (
          <>
            <GlassStepper value={workTime} min={5} max={120} step={5} onChange={setWorkTime} label="Travail" unit="s" />
            <GlassStepper value={restTime} min={5} max={120} step={5} onChange={setRestTime} label="Repos" unit="s" />
            <GlassStepper value={exercises} min={1} max={20} onChange={setExercises} label="Exercices" />
            <GlassStepper value={rounds} min={1} max={30} onChange={setRounds} label="Rounds" />
            <GlassStepper value={prepTime} min={0} max={30} step={5} onChange={setPrepTime} label="Préparation" unit="s" />
          </>
        )}
        {mode === 'circuit' && (
          <>
            <GlassStepper value={cWorkTime} min={5} max={180} step={5} onChange={setCWorkTime} label="Travail" unit="s" />
            <GlassStepper value={cRestTime} min={5} max={120} step={5} onChange={setCRestTime} label="Repos" unit="s" />
            <GlassStepper value={cExercises} min={1} max={20} onChange={setCExercises} label="Exercices" />
            <GlassStepper value={cRounds} min={1} max={20} onChange={setCRounds} label="Rounds" />
            <GlassStepper value={cRoundRest} min={0} max={180} step={10} onChange={setCRoundRest} label="Repos round" unit="s" />
            <GlassStepper value={cPrepTime} min={0} max={30} step={5} onChange={setCPrepTime} label="Préparation" unit="s" />
          </>
        )}
        {mode === 'amrap' && (
          <>
            <GlassStepper value={Math.floor(amrapDuration / 60)} min={1} max={60} onChange={v => setAmrapDuration(v * 60)} label="Durée" unit="min" />
            <GlassStepper value={amrapPrep} min={0} max={30} step={5} onChange={setAmrapPrep} label="Préparation" unit="s" />
          </>
        )}
        {mode === 'fortime' && (
          <GlassStepper value={ftPrep} min={0} max={30} step={5} onChange={setFtPrep} label="Préparation" unit="s" />
        )}
      </div>

      {/* Estimated time */}
      {(mode === 'tabata' || mode === 'circuit') && (
        <div className="glass-card p-4 mb-6 text-center">
          <span className="text-xs text-muted-foreground font-medium">Durée estimée · </span>
          <span className="text-sm font-bold text-foreground">{formatDuration(mode === 'tabata' ? totalTabata : totalCircuit)}</span>
        </div>
      )}

      <div className="mt-auto">
        <GlassButton variant="primary" fullWidth onClick={handleStart}>
          <Play size={18} />
          Démarrer
        </GlassButton>
      </div>
    </div>
  )
}
