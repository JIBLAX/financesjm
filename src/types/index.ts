export type TimerMode = 'tabata' | 'circuit' | 'fortime' | 'amrap'
export type TimerPhase = 'idle' | 'preparation' | 'work' | 'rest' | 'round_rest' | 'finished'
export type AppScreen = 'home' | 'setup' | 'timer' | 'summary' | 'history' | 'clients' | 'session-log'

export interface TabataConfig {
  workTime: number
  restTime: number
  exercises: number
  rounds: number
  prepTime: number
}

export interface CircuitConfig {
  workTime: number
  restTime: number
  exercises: number
  rounds: number
  roundRestTime: number
  prepTime: number
}

export interface ForTimeConfig {
  prepTime: number
}

export interface AmrapConfig {
  duration: number
  prepTime: number
}

export type TimerConfig = TabataConfig | CircuitConfig | ForTimeConfig | AmrapConfig

export interface TimerState {
  mode: TimerMode
  phase: TimerPhase
  timeLeft: number
  elapsed: number
  currentExercise: number
  currentRound: number
  totalExercises: number
  totalRounds: number
  isRunning: boolean
  amrapRounds: number
  config: TimerConfig
  flash: TimerPhase | null
}

export interface SessionResult {
  id: string
  mode: TimerMode
  date: string
  totalTime: number
  rounds: number
  exercises: number
  config: TimerConfig
}

export interface AppSettings {
  soundEnabled: boolean
  vibrationEnabled: boolean
  coachTag: string
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  createdAt: string
}

export interface ParticipantScore {
  clientId: string
  score: string
}

export interface SessionRecord {
  id: string
  date: string
  mode: TimerMode
  totalTime: number
  rounds: number
  notes: string
  participants: ParticipantScore[]
}
