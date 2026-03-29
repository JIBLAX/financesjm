import React, { useState } from 'react'
import { ChevronLeft, Plus, Trash2, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Client } from '../types'
import { GlassButton } from '../components/GlassButton'

interface Props {
  clients: Client[]
  onBack: () => void
  onAdd: (firstName: string, lastName: string) => void
  onRemove: (id: string) => void
}

export const ClientsPage: React.FC<Props> = ({ clients, onBack, onAdd, onRemove }) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const handleAdd = () => {
    if (!firstName.trim() && !lastName.trim()) return
    onAdd(firstName, lastName)
    setFirstName('')
    setLastName('')
  }

  return (
    <div className="page-container pt-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-foreground/55">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-foreground">Clients</h2>
        <div className="w-10" />
      </div>

      {/* Formulaire ajout */}
      <div className="glass-card p-4 mb-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Nouveau client</div>
        <div className="flex flex-col gap-2 mb-3">
          <input
            type="text"
            placeholder="Prénom"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="h-10 rounded-xl px-3 text-sm text-foreground font-medium bg-white/[0.05] border border-white/[0.09] outline-none focus:border-white/20 placeholder:text-foreground/25"
          />
          <input
            type="text"
            placeholder="Nom"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="h-10 rounded-xl px-3 text-sm text-foreground font-medium bg-white/[0.05] border border-white/[0.09] outline-none focus:border-white/20 placeholder:text-foreground/25"
          />
        </div>
        <GlassButton variant="primary" fullWidth onClick={handleAdd}>
          <Plus size={16} /> Ajouter
        </GlassButton>
      </div>

      {/* Liste clients */}
      {clients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Aucun client enregistré</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {clients.map(client => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card px-4 py-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(345 62% 40% / 0.15)', border: '1px solid hsl(345 62% 40% / 0.25)' }}>
                  <User size={14} className="text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    {client.firstName} {client.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(client.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(client.id)}
                  className="glass-btn w-8 h-8 rounded-lg flex items-center justify-center text-destructive/60 hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
