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

export const presetCatalogs = {
  'ac-presets': acDevicePresets,
  'heater-presets': heaterPresets,
} as const satisfies Record<string, readonly DevicePreset[]>

export type PresetCatalogId = keyof typeof presetCatalogs
