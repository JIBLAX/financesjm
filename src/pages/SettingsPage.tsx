import React, { useState } from 'react'
import { ArrowLeft, Lock, Percent } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import type { AppSettings, AllocationRules, ProfileRegulation } from '@/types/finance'
import { clearSession } from '@/lib/storage'

interface Props {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onUpdateRegulation: (patch: Partial<ProfileRegulation>) => void
  onLock: () => void
}

export const SettingsPage: React.FC<Props> = ({ settings, onUpdate, onUpdateRegulation: _onUpdateRegulation, onLock }) => {
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
            <input type="password" maxLength={4} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground text-center tracking-[0.5em] placeholder:text-muted-foreground outline-none" placeholder="Nouveau PIN" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} />
            <div className="flex gap-2">
              <button onClick={() => setShowPinChange(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted/50 text-foreground">Annuler</button>
              <button onClick={handlePinChange} disabled={newPin.length !== 4} className="flex-1 py-2 rounded-xl text-sm bg-primary text-primary-foreground disabled:opacity-40">Valider</button>
            </div>
          </div>
        )}
      </FinanceCard>

      {/* Account Allocation */}
      <FinanceCard>
        <div className="flex items-center gap-3 mb-4">
          <Percent className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Répartition des revenus</h3>
        </div>

        {/* Level 1: Pro + Perso — must total 100% */}
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Répartition principale</p>
        <div className="flex gap-2 mb-1">
          <div className="flex-1 bg-muted/20 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Activité pro</p>
            <div className="flex items-center gap-1">
              <input type="number" min="0" max="100" className="w-full bg-muted/50 rounded-lg px-2 py-1.5 text-sm text-foreground outline-none text-center"
                value={rules.proPercent} onChange={e => updateRule('proPercent', e.target.value)} />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div className="flex items-center text-xs text-muted-foreground self-center">=</div>
          <div className="flex-1 bg-muted/20 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Base perso</p>
            <div className="flex items-center gap-1">
              <input type="number" min="0" max="100" className="w-full bg-muted/50 rounded-lg px-2 py-1.5 text-sm text-foreground outline-none text-center"
                value={rules.personalBasePercent} onChange={e => updateRule('personalBasePercent', e.target.value)} />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
        <div className="text-right text-[10px] mb-4">
          <span className={`font-semibold ${rules.proPercent + rules.personalBasePercent === 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Total : {rules.proPercent + rules.personalBasePercent}%
          </span>
        </div>

        {/* Level 2: Base perso split */}
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Sous-répartition de la base perso</p>
        <div className="space-y-2 mb-1">
          {[
            { key: 'boursoPercent' as keyof AllocationRules, label: 'Vie courante (Bourso)' },
            { key: 'livretAPercent' as keyof AllocationRules, label: 'Réserve (Livret A)' },
            { key: 'lepPercent' as keyof AllocationRules, label: 'Urgence (LEP)' },
          ].map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <span className="text-xs text-foreground flex-1">{f.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                <input type="number" min="0" max="100" className="w-16 bg-muted/50 rounded-lg px-2 py-1.5 text-sm text-foreground outline-none text-center"
                  value={rules[f.key]} onChange={e => updateRule(f.key, e.target.value)} />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-right text-[10px] mb-4">
          <span className={`font-semibold ${rules.boursoPercent + rules.livretAPercent + rules.lepPercent === 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Total : {rules.boursoPercent + rules.livretAPercent + rules.lepPercent}%
          </span>
        </div>

        {/* Level 3: Cash split */}
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Répartition du cash</p>
        <div className="space-y-2">
          {[
            { key: 'cashLibertePercent' as keyof AllocationRules, label: 'Cash Liberté' },
            { key: 'cashSecurityPercent' as keyof AllocationRules, label: 'Cash Sécurité' },
            { key: 'cashVoyagePercent' as keyof AllocationRules, label: 'Cash Voyage' },
          ].map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <span className="text-xs text-foreground flex-1">{f.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                <input type="number" min="0" max="100" className="w-16 bg-muted/50 rounded-lg px-2 py-1.5 text-sm text-foreground outline-none text-center"
                  value={rules[f.key]} onChange={e => updateRule(f.key, e.target.value)} />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </FinanceCard>
    </div>
  )
}
