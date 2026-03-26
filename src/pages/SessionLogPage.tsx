import React, { useState } from 'react'
import { ChevronLeft, Save, User, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import type { SessionResult, Client, ParticipantScore, SessionRecord } from '../types'
import { GlassButton } from '../components/GlassButton'

interface Props {
  result: SessionResult
  clients: Client[]
  onSave: (record: Omit<SessionRecord, 'id'>) => void
  onBack: () => void
}

const modeLabels: Record<string, string> = { tabata: 'TABATA', circuit: 'CIRCUIT', fortime: 'FOR TIME', amrap: 'AMRAP' }

function formatTime(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}m ${sec}s`
}

export const SessionLogPage: React.FC<Props> = ({ result, clients, onSave, onBack }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scores, setScores] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const toggleClient = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleSave = () => {
    const participants: ParticipantScore[] = Array.from(selectedIds).map(clientId => ({
      clientId,
      score: scores[clientId] ?? '',
    }))
    onSave({
      date: result.date,
      mode: result.mode,
      totalTime: result.totalTime,
      rounds: result.rounds,
      notes,
      participants,
    })
    onBack()
  }

  return (
    <div className="page-container pt-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/55">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-foreground">Enregistrer</h2>
        <div className="w-10" />
      </div>

      {/* Session info */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 mb-5"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-foreground uppercase tracking-widest text-xs" style={{ color: 'hsl(345 62% 55%)' }}>
            {modeLabels[result.mode]}
          </span>
          <span className="text-muted-foreground text-xs">
            {new Date(result.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-foreground/50">
          <span>{formatTime(result.totalTime)}</span>
          <span>{result.rounds} rounds</span>
          <span>{result.exercises} exercices</span>
        </div>
      </motion.div>

      {/* Participants */}
      {clients.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Participants ({selectedIds.size})
          </div>
          <div className="flex flex-col gap-2">
            {clients.map(client => {
              const selected = selectedIds.has(client.id)
              return (
                <div key={client.id}>
                  <button
                    onClick={() => toggleClient(client.id)}
                    className="glass-card w-full px-4 py-3 flex items-center gap-3 text-left"
                    style={selected ? { borderColor: 'hsl(345 62% 40% / 0.4)' } : {}}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={selected
                        ? { background: 'hsl(345 62% 40%)', border: '1px solid hsl(345 62% 40%)' }
                        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      {selected ? <Check size={13} color="white" /> : <User size={13} className="text-foreground/30" />}
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {client.firstName} {client.lastName}
                    </span>
                  </button>

                  {selected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-1 px-1"
                    >
                      <input
                        type="text"
                        placeholder="Score (temps, rounds…)"
                        value={scores[client.id] ?? ''}
                        onChange={e => setScores(prev => ({ ...prev, [client.id]: e.target.value }))}
                        className="w-full h-9 rounded-xl px-3 text-sm text-foreground font-medium bg-white/[0.05] border border-white/[0.09] outline-none focus:border-white/20 placeholder:text-foreground/25"
                      />
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {clients.length === 0 && (
        <div className="glass-card p-4 mb-5 text-center">
          <p className="text-sm text-muted-foreground">Aucun client — ajoutez des clients dans les paramètres.</p>
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Notes</div>
        <textarea
          placeholder="Exercices, charges, observations…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-2xl px-4 py-3 text-sm text-foreground font-medium bg-white/[0.05] border border-white/[0.09] outline-none focus:border-white/20 placeholder:text-foreground/25 resize-none"
        />
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <GlassButton variant="primary" fullWidth onClick={handleSave}>
          <Save size={16} /> Sauvegarder
        </GlassButton>
        <GlassButton variant="ghost" fullWidth onClick={onBack}>
          Annuler
        </GlassButton>
      </div>
    </div>
  )
}
