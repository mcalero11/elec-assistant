import { acPresets } from './ac-presets.js'
import type { TemplateLabel } from './types.js'

/**
 * Generic device-preset shape consumed by preset questions: `values` holds the
 * fields a template's `sets` mapping injects into the answer object. Each
 * template-specific catalog lives here so the web runner can resolve any
 * preset question without hardcoding (the old runner special-cased MCA/MOCP).
 */
export interface DevicePreset {
  id: string
  label: TemplateLabel
  /** Optional spec line for the picker («4,400 W · 120 V»). */
  detail?: TemplateLabel
  synonyms: string[]
  values: Record<string, number | string>
}

/** Adapter over the typed A/C presets (which keep their richer shape for the dashboard). */
const acDevicePresets: readonly DevicePreset[] = acPresets.map((p) => ({
  id: p.id,
  label: p.label,
  detail: {
    es: `MCA ${p.typicalMcaA} A · MOCP ${p.typicalMocpA} A`,
    en: `MCA ${p.typicalMcaA} A · MOCP ${p.typicalMocpA} A`,
  },
  synonyms: p.synonyms,
  values: { mcaA: p.typicalMcaA, mocpA: p.typicalMocpA, voltage: p.voltage },
}))

/**
 * Electric showers / tankless heaters sold in El Salvador (Lorenzetti-class
 * duchas, whole-house tankless units). Typical nameplate values pending user
 * verification, like the A/C presets; `minBreakerA` is the manufacturer's
 * marked minimum breaker — it keeps picks on ratings ferreterías actually sell
 * (the engine's minBreakerA floor, 422.11).
 */
const heaterPresets: readonly DevicePreset[] = [
  {
    id: 'ducha-3500',
    label: { es: 'Ducha eléctrica 3,500 W (básica)', en: 'Electric shower 3,500 W (basic)' },
    detail: { es: '3,500 W · 120 V', en: '3,500 W · 120 V' },
    synonyms: ['ducha básica', 'ducha 3500'],
    values: { watts: 3500, voltage: 120, minBreakerA: 30 },
  },
  {
    id: 'ducha-4400',
    label: { es: 'Ducha eléctrica 4,400 W (potente)', en: 'Electric shower 4,400 W (high-power)' },
    detail: { es: '4,400 W · 120 V', en: '4,400 W · 120 V' },
    synonyms: ['ducha potente', 'ducha 4400', 'maxi ducha'],
    values: { watts: 4400, voltage: 120, minBreakerA: 40 },
  },
  {
    id: 'calentador-8k',
    label: { es: 'Calentador de paso 8 kW', en: 'Tankless heater 8 kW' },
    detail: { es: '8,000 W · 240 V', en: '8,000 W · 240 V' },
    synonyms: ['calentador instantáneo 8kw', 'tankless 8'],
    values: { watts: 8000, voltage: 240, minBreakerA: 40 },
  },
  {
    id: 'calentador-11k',
    label: { es: 'Calentador de paso 11 kW', en: 'Tankless heater 11 kW' },
    detail: { es: '11,000 W · 240 V', en: '11,000 W · 240 V' },
    synonyms: ['calentador instantáneo 11kw', 'tankless 11'],
    values: { watts: 11000, voltage: 240, minBreakerA: 50 },
  },
]

/**
 * Household ranges and dryers for the 240 V receptacle template. `demandA` is
 * HAND-DERIVED branch-circuit demand, documented per preset (the load calc's
 * Article 120 engine handles feeders; a single appliance branch circuit uses
 * the demand directly): estufa ≤ 12 kW → Table 120.55 Column C row 1 = 8 kW →
 * 8000/240 = 33.33 A, with the 40 A minimum branch circuit for ranges ≥ 8¾ kW
 * (210.19(C)); secadora típica 5.5 kW → 5500/240 = 22.92 ≈ 22.9 A, 30 A
 * breaker per nameplate. Typical values pending user verification.
 */
const rangeDryerPresets: readonly DevicePreset[] = [
  {
    id: 'estufa',
    label: { es: 'Estufa eléctrica (hasta 12 kW)', en: 'Electric range (up to 12 kW)' },
    detail: { es: 'demanda 33.33 A · térmico mín. 40 A', en: 'demand 33.33 A · min breaker 40 A' },
    synonyms: ['estufa', 'cocina eléctrica', 'rango'],
    values: { demandA: 33.33, minBreakerA: 40 },
  },
  {
    id: 'secadora',
    label: { es: 'Secadora de ropa (5–6 kW)', en: 'Clothes dryer (5–6 kW)' },
    detail: { es: 'demanda 22.9 A · térmico 30 A', en: 'demand 22.9 A · 30 A breaker' },
    synonyms: ['secadora', 'secadora de ropa', 'dryer'],
    values: { demandA: 22.9, minBreakerA: 30 },
  },
]

export const presetCatalogs = {
  'ac-presets': acDevicePresets,
  'heater-presets': heaterPresets,
  'range-dryer-presets': rangeDryerPresets,
} as const satisfies Record<string, readonly DevicePreset[]>

export type PresetCatalogId = keyof typeof presetCatalogs
