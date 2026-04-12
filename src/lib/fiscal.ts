import type { FiscalStatus } from '@/types/finance'

// ── Taux de cotisations sociales micro-entrepreneur 2026 (URSSAF) ─────────────
export const FISCAL_CONFIGS: Record<FiscalStatus, {
  label: string
  emoji: string
  chargesPct: number
  abattement: number
  tva: boolean
  hasMixed: boolean
}> = {
  micro_bnc:          { label: 'Micro BNC',           emoji: '🧑‍💼', chargesPct: 25.6, abattement: 0.34, tva: true,  hasMixed: false },
  micro_bic_services: { label: 'Micro BIC services',  emoji: '🔧',  chargesPct: 21.2, abattement: 0.50, tva: true,  hasMixed: false },
  micro_bic_vente:    { label: 'Micro BIC vente',     emoji: '🛒',  chargesPct: 12.3, abattement: 0.71, tva: true,  hasMixed: false },
  salarie:            { label: 'Salarié',             emoji: '💼',  chargesPct: 0,    abattement: 0.10, tva: false, hasMixed: false },
  portage_salarial:   { label: 'Portage salarial',   emoji: '🏢',  chargesPct: 0,    abattement: 0.10, tva: false, hasMixed: false },
  salarie_micro_bnc:  { label: 'Salarié + Micro BNC',emoji: '⚡',  chargesPct: 25.6, abattement: 0.34, tva: true,  hasMixed: true  },
  salarie_micro_bic:  { label: 'Salarié + Micro BIC',emoji: '⚡',  chargesPct: 21.2, abattement: 0.50, tva: true,  hasMixed: true  },
  salarie_portage:    { label: 'Salarié + Portage',  emoji: '⚡',  chargesPct: 0,    abattement: 0.10, tva: false, hasMixed: false },
}

// Barème progressif IR 2026 (revenus 2025) — 1 part, célibataire — +0.9% inflation
export function calcIR(annualRevenu: number): number {
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
