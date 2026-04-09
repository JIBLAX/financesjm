import React, { useState } from 'react'
import { ArrowLeft, Lock, Percent, Plus, X, Check, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import type { AppSettings, AllocationGroup, AllocationSlot, ProfileRegulation, Account } from '@/types/finance'
import { clearSession } from '@/lib/storage'

interface Props {
  settings: AppSettings
  accounts: Account[]
  onUpdate: (patch: Partial<AppSettings>) => void
  onUpdateRegulation: (patch: Partial<ProfileRegulation>) => void
  onLock: () => void
  onSignOut?: () => void
}

export const SettingsPage: React.FC<Props> = ({ settings, accounts, onUpdate, onUpdateRegulation: _onUpdateRegulation, onLock, onSignOut }) => {
  const navigate = useNavigate()
  const [newPin, setNewPin] = useState('')
  const [showPinChange, setShowPinChange] = useState(false)

  // Allocation edit state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingSlots, setEditingSlots] = useState<AllocationSlot[]>([])

  const rules = settings.allocationRules

  const handlePinChange = () => {
    if (newPin.length === 4) {
      onUpdate({ pin: newPin, pinConfigured: true })
      setNewPin('')
      setShowPinChange(false)
    }
  }

  const handleLock = () => {
    clearSession()
    onLock()
  }

  const startEdit = (group: AllocationGroup) => {
    setEditingGroupId(group.id)
    setEditingSlots(group.slots.map(s => ({ ...s })))
  }

  const cancelEdit = () => {
    setEditingGroupId(null)
    setEditingSlots([])
  }

  const saveEdit = (groupId: string) => {
    const newGroups = rules.groups.map(g =>
      g.id === groupId ? { ...g, slots: editingSlots } : g
    )
    onUpdate({ allocationRules: { ...rules, groups: newGroups } })
    setEditingGroupId(null)
    setEditingSlots([])
  }

  const updateSlotPercent = (idx: number, value: string) => {
    setEditingSlots(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], percent: parseFloat(value) || 0 }
      return next
    })
  }

  const updateSlotAccount = (idx: number, accountId: string) => {
    const acc = accounts.find(a => a.id === accountId)
    setEditingSlots(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], accountId, label: acc?.name || next[idx].label }
      return next
    })
  }

  const removeSlot = (idx: number) => {
    setEditingSlots(prev => prev.filter((_, i) => i !== idx))
  }

  const addSlot = () => {
    setEditingSlots(prev => [...prev, { accountId: '', label: 'Nouveau compte', percent: 0 }])
  }

  const bancaireTotal = rules.groups
    .filter(g => g.incomeType === 'bancaire')
    .reduce((s, g) => s + g.slots.reduce((ss, sl) => ss + sl.percent, 0), 0)

  const inputCls = 'w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none'

  return (
    <div className="page-container pt-6 page-bottom-pad gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">Paramètres</h1>
      </div>

      {/* PIN */}
      <FinanceCard>
        <div className="flex items-center gap-3 mb-3">
          <Lock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Sécurité</h3>
        </div>
        <button onClick={handleLock} className="w-full py-2 rounded-xl text-sm font-medium bg-destructive/10 text-destructive mb-2">
          Verrouiller maintenant
        </button>
        {!showPinChange ? (
          <button onClick={() => setShowPinChange(true)} className="w-full py-2 rounded-xl text-sm font-medium bg-muted/50 text-foreground">
            Changer le PIN
          </button>
        ) : (
          <div className="space-y-2 mt-2">
            <input type="password" maxLength={4} className={`${inputCls} text-center tracking-[0.5em]`}
              placeholder="Nouveau PIN" value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} />
            <div className="flex gap-2">
              <button onClick={() => setShowPinChange(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted/50 text-foreground">Annuler</button>
              <button onClick={handlePinChange} disabled={newPin.length !== 4} className="flex-1 py-2 rounded-xl text-sm bg-primary text-primary-foreground disabled:opacity-40">Valider</button>
            </div>
          </div>
        )}
      </FinanceCard>

      {/* Allocation header */}
      <div className="flex items-center gap-3">
        <Percent className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Répartition des revenus</h3>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${Math.abs(bancaireTotal - 100) < 0.5 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
          Bancaire {Math.round(bancaireTotal * 10) / 10}% {Math.abs(bancaireTotal - 100) < 0.5 ? '✓' : '≠ 100%'}
        </span>
      </div>

      {/* Groups */}
      {rules.groups.map(group => {
        const groupTotal = group.slots.reduce((s, sl) => s + sl.percent, 0)
        const isEditing = editingGroupId === group.id
        const editTotal = editingSlots.reduce((s, sl) => s + sl.percent, 0)
        const isCashOk = group.incomeType === 'cash' && Math.abs(editTotal - 100) < 0.5
        const isViewOk = group.incomeType === 'cash' ? Math.abs(groupTotal - 100) < 0.5 : true

        return (
          <FinanceCard key={group.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{group.label}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {group.incomeType === 'bancaire' ? '% revenus bancaires' : '% revenus liquide'}
                  {' · '}
                  <span className={isViewOk ? 'text-foreground' : 'text-amber-400'}>{Math.round(groupTotal * 10) / 10}% alloué</span>
                </p>
              </div>
              {isEditing ? (
                <div className="flex gap-1.5">
                  <button onClick={() => saveEdit(group.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 active:bg-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-muted/40 text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(group)} className="p-1.5 rounded-lg bg-muted/30 text-muted-foreground active:bg-muted/50">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                {editingSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={slot.accountId}
                      onChange={e => updateSlotAccount(i, e.target.value)}
                      className="flex-1 bg-muted/50 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none min-w-0"
                    >
                      <option value="">— Compte —</option>
                      {accounts.filter(a => a.isActive).map(a => (
                        <option key={a.id} value={a.id}>{a.name} · {a.institution}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={slot.percent}
                        onChange={e => updateSlotPercent(i, e.target.value)}
                        className="w-14 bg-muted/50 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none text-center"
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                    </div>
                    <button onClick={() => removeSlot(i)} className="p-1 text-rose-400/60 active:text-rose-400 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                  <button onClick={addSlot} className="flex items-center gap-1 text-xs text-primary active:opacity-70">
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                  <span className={`text-xs font-bold ${group.incomeType === 'cash' ? (isCashOk ? 'text-emerald-400' : editTotal > 100 ? 'text-rose-400' : 'text-amber-400') : 'text-foreground'}`}>
                    Total : {Math.round(editTotal * 10) / 10}%{group.incomeType === 'cash' && !isCashOk ? ' ≠ 100%' : ''}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {group.slots.map((slot, i) => {
                  const acc = accounts.find(a => a.id === slot.accountId)
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                      <span className="text-xs text-foreground flex-1 truncate min-w-0">
                        {acc?.name || slot.label}
                      </span>
                      {acc && (
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">{acc.institution}</span>
                      )}
                      <span className="text-xs font-semibold text-foreground shrink-0 ml-2">{slot.percent}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </FinanceCard>
        )
      })}
    </div>
  )
}
