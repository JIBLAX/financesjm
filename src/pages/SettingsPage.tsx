import React, { useState } from 'react'
import { ArrowLeft, Lock, Palette, Percent } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import type { AppSettings, AllocationRules } from '@/types/finance'
import { clearSession } from '@/lib/storage'

interface Props {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onLock: () => void
}

export const SettingsPage: React.FC<Props> = ({ settings, onUpdate, onLock }) => {
  const navigate = useNavigate()
  const [rules, setRules] = useState<AllocationRules>(settings.allocationRules)
  const [newPin, setNewPin] = useState('')
  const [showPinChange, setShowPinChange] = useState(false)

  const updateRule = (key: keyof AllocationRules, value: string) => {
    const next = { ...rules, [key]: Number(value) || 0 }
    setRules(next)
    onUpdate({ allocationRules: next })
  }

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

  const ruleFields: { key: keyof AllocationRules; label: string }[] = [
    { key: 'proPercent', label: 'Part pro (% des revenus bancaires)' },
    { key: 'personalBasePercent', label: 'Base perso (% des revenus bancaires)' },
    { key: 'boursoPercent', label: 'BoursoBank (% de la base perso)' },
    { key: 'livretAPercent', label: 'Livret A (% de la base perso)' },
    { key: 'lepPercent', label: 'LEP (% de la base perso)' },
    { key: 'cashLibertePercent', label: 'Cash liberté (% du liquide)' },
    { key: 'cashSecurityPercent', label: 'Fonds sécurité (% du liquide)' },
    { key: 'cashVoyagePercent', label: 'Voyage (% du liquide)' },
  ]

  return (
    <div className="page-container pt-6 pb-24 gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Paramètres</h1>
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
            <input
              type="password"
              maxLength={4}
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground text-center tracking-[0.5em] placeholder:text-muted-foreground outline-none"
              placeholder="Nouveau PIN"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowPinChange(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted/50 text-foreground">Annuler</button>
              <button onClick={handlePinChange} disabled={newPin.length !== 4} className="flex-1 py-2 rounded-xl text-sm bg-primary text-primary-foreground disabled:opacity-40">Valider</button>
            </div>
          </div>
        )}
      </FinanceCard>

      {/* Allocation rules */}
      <FinanceCard>
        <div className="flex items-center gap-3 mb-3">
          <Percent className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Pourcentages de répartition</h3>
        </div>
        <div className="space-y-3">
          {ruleFields.map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground">{f.label}</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                  value={rules[f.key]}
                  onChange={e => updateRule(f.key, e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </FinanceCard>
    </div>
  )
}
