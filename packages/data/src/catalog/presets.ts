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

export const presetCatalogs = {
  'ac-presets': acDevicePresets,
} as const satisfies Record<string, readonly DevicePreset[]>

export type PresetCatalogId = keyof typeof presetCatalogs
