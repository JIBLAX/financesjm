import React, { useState } from 'react'
import { ChevronLeft, Trash2, User, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SessionRecord, Client, TimerMode } from '../types'
import { GlassButton } from '../components/GlassButton'

interface Props {
  records: SessionRecord[]
  clients: Client[]
  onBack: () => void
  onRemove: (id: string) => void
}

const modeLabels: Record<TimerMode, string> = {
  tabata: 'TABATA', circuit: 'CIRCUIT', fortime: 'FOR TIME', amrap: 'AMRAP',
}

const modeColors: Record<TimerMode, string> = {
  tabata: 'hsl(var(--accent-tabata))', circuit: 'hsl(var(--accent-circuit))',
  fortime: 'hsl(var(--accent-fortime))', amrap: 'hsl(var(--accent-amrap))',
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}m ${sec}s`
}

export const RecordsPage: React.FC<Props> = ({ records, clients, onBack, onRemove }) => {
  const [expanded, setExpanded] = useState<string | null>(null)

  const clientName = (id: string) => {
    const c = clients.find(c => c.id === id)
    return c ? `${c.firstName} ${c.lastName}`.trim() : 'Client supprimé'
  }

  return (
    <div className="page-container pt-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/55">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-foreground">Fiches coaching</h2>
        <div className="w-10" />
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <FileText size={36} className="text-foreground/15" />
          <p className="text-muted-foreground text-sm">Aucune fiche enregistrée</p>
          <p className="text-xs text-foreground/25 max-w-[220px]">
            Termine une séance et appuie sur "Enregistrer les résultats" pour créer une fiche.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {records.map(record => {
              const isOpen = expanded === record.id
              const color = modeColors[record.mode as TimerMode] ?? 'hsl(var(--primary))'
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card overflow-hidden"
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : record.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black"
                      style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
                      {modeLabels[record.mode as TimerMode] ?? record.mode}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {new Date(record.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {record.participants.length} participant{record.participants.length !== 1 ? 's' : ''}
                        {record.notes ? ' · notes' : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-foreground/30">
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-foreground/[0.06] pt-3 flex flex-col gap-3">
                          {/* Stats */}
                          <div className="flex gap-4 text-xs text-foreground/50">
                            <span>{formatTime(record.totalTime)}</span>
                            {record.mode !== 'fortime' && <span>{record.rounds} rounds</span>}
                          </div>

                          {/* Participants + scores */}
                          {record.participants.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {record.participants.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <User size={12} className="text-foreground/30 shrink-0" />
                                  <span className="flex-1 text-sm text-foreground/80 truncate">{clientName(p.clientId)}</span>
                                  {p.score && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: `${color}15`, color }}>
                                      {p.score}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Notes */}
                          {record.notes && (
                            <div className="rounded-xl p-3 text-xs text-foreground/60 leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              {record.notes}
                            </div>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => onRemove(record.id)}
                            className="flex items-center gap-1.5 text-xs text-destructive/50 hover:text-destructive self-end mt-1"
                          >
                            <Trash2 size={12} /> Supprimer
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
