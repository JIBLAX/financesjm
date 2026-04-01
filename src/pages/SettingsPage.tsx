import React, { useState } from 'react'
import { ArrowLeft, Lock, Percent, Users, Wifi, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import type { AppSettings, AllocationRules, ProfileRegulation, LifeSituation, RevenueStability } from '@/types/finance'
import { clearSession } from '@/lib/storage'

interface Props {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onUpdateRegulation: (patch: Partial<ProfileRegulation>) => void
  onLock: () => void
}

export const SettingsPage: React.FC<Props> = ({ settings, onUpdate, onUpdateRegulation, onLock }) => {
  const navigate = useNavigate()
  const [rules, setRules] = useState<AllocationRules>(settings.allocationRules)
  const [newPin, setNewPin] = useState('')
  const [showPinChange, setShowPinChange] = useState(false)

  const reg = settings.profileRegulation

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

  const beActivStatus = settings.beActivConnection

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
            <input type="password" maxLength={4} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground text-center tracking-[0.5em] placeholder:text-muted-foreground outline-none" placeholder="Nouveau PIN" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} />
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
                <input type="number" min="0" max="100" className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none" value={rules[f.key]} onChange={e => updateRule(f.key, e.target.value)} />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </FinanceCard>

      {/* Profile Regulation */}
      <FinanceCard>
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Régulation de profil</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Situation de vie</label>
            <div className="flex gap-2 mt-1">
              {(['solo', 'couple', 'famille'] as LifeSituation[]).map(s => (
                <button key={s} onClick={() => onUpdateRegulation({ lifeSituation: s })} className={`flex-1 py-2 rounded-xl text-xs font-medium ${reg.lifeSituation === s ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                  {s === 'solo' ? '👤 Solo' : s === 'couple' ? '👥 Couple' : '👨‍👩‍👧 Famille'}
                </button>
              ))}
            </div>
          </div>

          {reg.lifeSituation === 'famille' && (
            <div>
              <label className="text-xs text-muted-foreground">Nombre d'enfants</label>
              <input type="number" min="0" max="10" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" value={reg.childrenCount} onChange={e => onUpdateRegulation({ childrenCount: Number(e.target.value) || 0 })} />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">Charges familiales mensuelles estimées</label>
            <input type="number" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none mt-1" value={reg.monthlyFamilyCharges} onChange={e => onUpdateRegulation({ monthlyFamilyCharges: Number(e.target.value) || 0 })} placeholder="€" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Stabilité des revenus</label>
            <div className="flex gap-2 mt-1">
              {(['stable', 'variable', 'fragile'] as RevenueStability[]).map(s => (
                <button key={s} onClick={() => onUpdateRegulation({ revenueStability: s })} className={`flex-1 py-2 rounded-xl text-xs font-medium ${reg.revenueStability === s ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                  {s === 'stable' ? 'Stable' : s === 'variable' ? 'Variable' : 'Fragile'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Niveau de sécurité souhaité (1-5)</label>
            <input type="range" min="1" max="5" className="w-full mt-1" value={reg.desiredSecurityLevel} onChange={e => onUpdateRegulation({ desiredSecurityLevel: Number(e.target.value) })} />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Min</span><span>{reg.desiredSecurityLevel}/5</span><span>Max</span></div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Tolérance au stress financier (1-5)</label>
            <input type="range" min="1" max="5" className="w-full mt-1" value={reg.financialStressTolerance} onChange={e => onUpdateRegulation({ financialStressTolerance: Number(e.target.value) })} />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Faible</span><span>{reg.financialStressTolerance}/5</span><span>Élevée</span></div>
          </div>
        </div>
      </FinanceCard>

      {/* Be Activ Connection */}
      <FinanceCard>
        <div className="flex items-center gap-3 mb-2">
          {beActivStatus === 'connected' ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold text-foreground">Connexion Be Activ</h3>
        </div>
        <div className={`px-3 py-2 rounded-xl text-xs ${beActivStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : beActivStatus === 'coming_soon' ? 'bg-amber-500/10 text-amber-400' : 'bg-muted/30 text-muted-foreground'}`}>
          {beActivStatus === 'connected' && '✅ Connecté — synchronisation active'}
          {beActivStatus === 'coming_soon' && '🔜 Bientôt disponible'}
          {beActivStatus === 'not_connected' && 'Connexion Be Activ non activée. Les revenus sont actuellement manuels. Une synchronisation automatique pourra être ajoutée plus tard via API, webhook ou base commune.'}
        </div>
      </FinanceCard>
    </div>
  )
}
