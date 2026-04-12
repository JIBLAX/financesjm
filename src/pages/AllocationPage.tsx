import React, { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FinanceCard } from '@/components/FinanceCard'
import { formatCurrency } from '@/lib/constants'
import type { FinanceStore } from '@/types/finance'

interface Props {
  store: FinanceStore
}

// ── Taux de cotisations sociales micro-entrepreneur 2026 (URSSAF) ─────────────
const FISCAL_CONFIGS = {
  micro_bnc:          { label: 'Micro BNC',           emoji: '🧑‍💼', chargesPct: 25.6, abattement: 0.34, tva: true,  hasMixed: false },
  micro_bic_services: { label: 'Micro BIC services',  emoji: '🔧',  chargesPct: 21.2, abattement: 0.50, tva: true,  hasMixed: false },
  micro_bic_vente:    { label: 'Micro BIC vente',      emoji: '🛒',  chargesPct: 12.3, abattement: 0.71, tva: true,  hasMixed: false },
  salarie:            { label: 'Salarié',              emoji: '💼',  chargesPct: 0,    abattement: 0.10, tva: false, hasMixed: false },
  portage_salarial:   { label: 'Portage salarial',    emoji: '🏢',  chargesPct: 0,    abattement: 0.10, tva: false, hasMixed: false },
  salarie_micro_bnc:  { label: 'Salarié + Micro BNC', emoji: '⚡',  chargesPct: 25.6, abattement: 0.34, tva: true,  hasMixed: true  },
  salarie_micro_bic:  { label: 'Salarié + Micro BIC', emoji: '⚡',  chargesPct: 21.2, abattement: 0.50, tva: true,  hasMixed: true  },
  salarie_portage:    { label: 'Salarié + Portage',   emoji: '⚡',  chargesPct: 0,    abattement: 0.10, tva: false, hasMixed: false },
} as const

// Barème progressif IR 2026 (revenus 2025) — 1 part, célibataire — +0.9% inflation
function calcIR(annualRevenu: number): number {
  const tranches = [
    { min: 0,        max: 11_600,   rate: 0    },
    { min: 11_600,   max: 29_579,   rate: 0.11 },
    { min: 29_579,   max: 84_577,   rate: 0.30 },
    { min: 84_577,   max: 181_917,  rate: 0.41 },
    { min: 181_917,  max: Infinity, rate: 0.45 },
  ]
  let tax = 0
  for (const t of tranches) {
    if (annualRevenu <= t.min) break
    tax += (Math.min(annualRevenu, t.max) - t.min) * t.rate
  }
  return tax
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })

const Row = ({ label, value, color = 'text-foreground', sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="text-right">
      <span className={`text-xs font-bold ${color}`}>{value}</span>
      {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
    </div>
  </div>
)

export const AllocationPage: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate()

  const [simAmount, setSimAmount] = useState('')
  const [simTva, setSimTva] = useState<'none' | '20' | '10' | '5.5'>('none')
  const [simCharges, setSimCharges] = useState(() => {
    const cfg = FISCAL_CONFIGS[store.settings.fiscalStatus ?? 'micro_bnc']
    return cfg.chargesPct > 0 ? cfg.chargesPct.toString() : '0'
  })
  const [simType, setSimType] = useState<'bancaire' | 'cash'>('bancaire')
  const [simIncomeStream, setSimIncomeStream] = useState<'pro' | 'salarie'>('pro')

  // ── Fiscal config ─────────────────────────────────────────────────────────
  const fiscalStatus  = store.settings.fiscalStatus ?? 'micro_bnc'
  const baseConfig    = FISCAL_CONFIGS[fiscalStatus]
  const hasMixed      = baseConfig.hasMixed
  const isSalarieStream     = hasMixed && simIncomeStream === 'salarie'
  const effectiveChargesPct = isSalarieStream ? 0 : (parseFloat(simCharges) || baseConfig.chargesPct)
  const effectiveAbattement = isSalarieStream ? 0.10 : baseConfig.abattement
  const effectiveTva        = !isSalarieStream && baseConfig.tva

  // ── Montants ──────────────────────────────────────────────────────────────
  const raw        = parseFloat(simAmount) || 0
  const tvaRate    = simTva === 'none' ? 0 : parseFloat(simTva) / 100
  const tvaAmt     = effectiveTva && simTva !== 'none' ? raw * tvaRate / (1 + tvaRate) : 0
  const htAmt      = raw - tvaAmt
  const isBancaire = simType === 'bancaire'
  const chargesAmt = isBancaire && effectiveChargesPct > 0 ? htAmt * effectiveChargesPct / 100 : 0
  const baseIR     = htAmt * 12 * (1 - effectiveAbattement)
  const impotsAmt  = isBancaire ? calcIR(baseIR) / 12 : 0
  const impotsEffectivePct = htAmt > 0 ? (impotsAmt / htAmt) * 100 : 0
  const obligationsEtat    = chargesAmt + impotsAmt
  const netDispo           = htAmt - obligationsEtat

  // ── Allocation groups ─────────────────────────────────────────────────────
  const fiscalIds = isBancaire
    ? new Set(store.accounts.filter(a => a.name.toLowerCase().includes('fiscal')).map(a => a.id))
    : new Set<string>()

  const allocationGroups = store.settings.allocationRules?.groups ?? []

  const allNonFiscalPct = allocationGroups
    .filter(g => g.incomeType === simType)
    .reduce((sum, g) =>
      sum + g.slots.filter(sl => !fiscalIds.has(sl.accountId)).reduce((s, sl) => s + sl.percent, 0), 0)

  const simGroups = allocationGroups
    .filter(g => g.incomeType === simType)
    .map(group => {
      const nonFiscalSlots = group.slots.filter(sl => !fiscalIds.has(sl.accountId))
      const fiscalSlots    = group.slots.filter(sl =>  fiscalIds.has(sl.accountId))
      const slots = [
        ...fiscalSlots.map(slot => {
          const acc = store.accounts.find(a => a.id === slot.accountId)
          return { accountId: slot.accountId, name: acc?.name || slot.label, institution: acc?.institution || '', percent: slot.percent, amount: obligationsEtat, isFiscal: true, tag: `${effectiveChargesPct.toFixed(1)}% charges + ${impotsEffectivePct.toFixed(1)}% IR` }
        }),
        ...nonFiscalSlots.map(slot => {
          const acc    = store.accounts.find(a => a.id === slot.accountId)
          const amount = allNonFiscalPct > 0 ? netDispo * (slot.percent / allNonFiscalPct) : 0
          return { accountId: slot.accountId, name: acc?.name || slot.label, institution: acc?.institution || '', percent: slot.percent, amount, isFiscal: false, tag: null as string | null }
        }),
      ]
      return { id: group.id, label: group.label, groupAmount: slots.reduce((s, sl) => s + sl.amount, 0), slots }
    })

  const totalDistribue = simGroups.reduce((s, g) => s + g.groupAmount, 0)

  return (
    <div className="page-container pt-6 page-bottom-pad gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-foreground uppercase tracking-wider">Simulation</h1>
      </div>

      {/* ── SAISIE ── */}
      <FinanceCard>
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Montant à simuler</h3>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number" inputMode="decimal"
            className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-xl font-extrabold text-foreground outline-none border border-border/30 focus:border-primary/50"
            placeholder="0"
            value={simAmount}
            onFocus={e => e.target.select()}
            onChange={e => setSimAmount(e.target.value)}
          />
          <span className="text-base text-muted-foreground font-bold">€</span>
        </div>

        {/* Statut fiscal */}
        <div className="mb-3 flex items-center gap-2 bg-muted/20 rounded-xl px-3 py-2 border border-border/20">
          <span className="text-base">{baseConfig.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Statut fiscal</p>
            <p className="text-xs font-semibold text-foreground truncate">{baseConfig.label}</p>
          </div>
        </div>

        {/* Toggle Pro / Salarié — profils mixtes uniquement */}
        {hasMixed && (
          <div className="mb-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Flux à simuler</p>
            <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
              {([['pro', '💼 Revenu pro'], ['salarie', '🏦 Salaire net']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setSimIncomeStream(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${simIncomeStream === val ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TVA */}
        {effectiveTva && (
          <div className="mb-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Régime TVA</p>
            <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
              {([['none', 'Sans TVA'], ['20', '20%'], ['10', '10%'], ['5.5', '5,5%']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setSimTva(val)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${simTva === val ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Charges & Impôts — revenus bancaires avec charges */}
        {simType === 'bancaire' && effectiveChargesPct > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Charges soc. %</p>
              <input type="number" inputMode="decimal"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none border border-border/30 focus:border-primary/50 text-right"
                value={simCharges} onFocus={e => e.target.select()}
                onChange={e => setSimCharges(e.target.value)} />
              <p className="text-[9px] text-muted-foreground/50 text-right mt-0.5">Taux 2026 : {baseConfig.chargesPct}%</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Impôts (prévisionnel)</p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-right">
                {raw > 0 ? <>
                  <p className="text-sm font-bold text-amber-400">{fmt(impotsAmt)} €<span className="text-[10px] font-normal text-amber-400/70">/mois</span></p>
                  <p className="text-[10px] text-muted-foreground/60">Abattement {Math.round((1 - effectiveAbattement) * 100)}% · {fmt(baseIR)} €/an</p>
                </> : <p className="text-xs text-muted-foreground/50">Auto</p>}
              </div>
            </div>
          </div>
        )}

        {/* Salarié / portage : uniquement IR */}
        {simType === 'bancaire' && effectiveChargesPct === 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Impôts (prévisionnel)</p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-right">
              {raw > 0 ? <>
                <p className="text-sm font-bold text-amber-400">{fmt(impotsAmt)} €<span className="text-[10px] font-normal text-amber-400/70">/mois</span></p>
                <p className="text-[10px] text-muted-foreground/60">Abattement frais pro 10% · Base {fmt(baseIR)} €/an</p>
              </> : <p className="text-xs text-muted-foreground/50">Auto</p>}
            </div>
          </div>
        )}

        {/* Nature du revenu */}
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Nature du revenu</p>
          <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
            {([['bancaire', '💳 Bancaire'], ['cash', '💵 Cash']] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => setSimType(val)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${simType === val ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </FinanceCard>

      {/* ── DÉCOMPOSITION ── */}
      {raw > 0 && (
        <FinanceCard>
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Décomposition</h3>
          <div className="space-y-2">
            <Row label={simTva !== 'none' ? 'Montant TTC saisi' : 'Montant brut'} value={`${fmt(raw)} €`} />
            {simTva !== 'none' && <>
              <Row label={`TVA ${simTva}% → État`} value={`− ${fmt(tvaAmt)} €`} color="text-rose-400" />
              <div className="h-px bg-border/30" />
              <Row label="Montant HT" value={`${fmt(htAmt)} €`} />
            </>}
            {chargesAmt > 0 && <Row label={`Charges soc. (${simCharges}%) → Rés. Fiscale`} value={`− ${fmt(chargesAmt)} €`} color="text-amber-400" />}
            {impotsAmt > 0 && <Row
              label={`Impôts IR (≈${impotsEffectivePct.toFixed(1)}%) → Rés. Fiscale`}
              value={`− ${fmt(impotsAmt)} €`}
              color="text-amber-400"
              sub={`Abattement ${Math.round((1 - effectiveAbattement) * 100)}% · base ${fmt(baseIR)} €/an`}
            />}
            <div className="h-px bg-border/30" />
            <div className="flex items-center justify-between bg-primary/10 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-foreground">Net à distribuer</span>
              <span className="text-base font-extrabold text-primary">{fmt(netDispo)} €</span>
            </div>
          </div>
        </FinanceCard>
      )}

      {/* ── DISTRIBUTION PAR GROUPE ── */}
      {raw > 0 && simGroups.map(group => (
        <FinanceCard key={group.id}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{group.label}</h3>
            <p className="text-sm font-extrabold text-foreground">{formatCurrency(group.groupAmount)}</p>
          </div>
          <div className="space-y-2.5">
            {group.slots.map((slot, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${slot.isFiscal ? 'bg-amber-400/60' : 'bg-primary/40'}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">{slot.name}</p>
                    {slot.isFiscal && slot.tag
                      ? <p className="text-[10px] text-amber-400/70">{slot.tag}</p>
                      : slot.institution
                        ? <p className="text-[10px] text-muted-foreground/50">{slot.institution}</p>
                        : null
                    }
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-bold ${slot.isFiscal ? 'text-amber-400' : 'text-foreground'}`}>
                    {formatCurrency(slot.amount)}
                  </p>
                  {slot.isFiscal
                    ? <p className="text-[10px] text-amber-400/60">obligatoire</p>
                    : <p className="text-[10px] text-muted-foreground">{slot.percent}%</p>
                  }
                </div>
              </div>
            ))}
          </div>
        </FinanceCard>
      ))}

      {/* ── RÉCAP FINAL ── */}
      {raw > 0 && simGroups.length > 0 && (
        <FinanceCard>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Récapitulatif</h3>
          <div className="space-y-2">
            {simTva !== 'none' && <Row label="TVA reversée à l'État" value={`${fmt(tvaAmt)} €`} color="text-rose-400" />}
            {obligationsEtat > 0 && <Row label="Obligations provisionées (Rés. Fiscale)" value={`${fmt(obligationsEtat)} €`} color="text-amber-400" />}
            <Row label="Net distribué (opérationnel)" value={formatCurrency(totalDistribue - obligationsEtat)} color="text-emerald-400" />
            <div className="h-px bg-border/30" />
            <Row label="Total affecté" value={`${fmt(totalDistribue)} €`} />
            {Math.abs(htAmt - totalDistribue) > 0.5 && (
              <Row label="Non attribué" value={`${fmt(htAmt - totalDistribue)} €`} color="text-amber-400" />
            )}
          </div>
        </FinanceCard>
      )}

      {/* Empty state */}
      {allocationGroups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucune règle de répartition configurée.</p>
          <p className="text-xs mt-1">Rendez-vous dans Paramètres pour définir vos groupes.</p>
        </div>
      )}
    </div>
  )
}
