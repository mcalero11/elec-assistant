import type { CitationKey } from '../index.js'
import type { GlossaryId } from '../glossary.js'
import type { PresetCatalogId } from './presets.js'

/* ------------------------------- catalog ------------------------------- */

/** How an item is purchased. 'tramo-3m' = 10-ft (3.05 m) stick, rounded up to whole sticks. */
export type CatalogUnit = 'm' | 'unidad' | 'tramo-3m'

export interface CatalogItem {
  id: string
  name: { es: string; en: string }
  unit: CatalogUnit
  category: 'material' | 'herramienta'
  synonyms?: string[]
}

export interface DevicePresetAc {
  id: string
  btu: number
  tons: number
  voltage: number
  /** Typical nameplate values — always verify against the actual unit's plate. */
  typicalMcaA: number
  typicalMocpA: number
  label: { es: string; en: string }
  synonyms: string[]
}

/**
 * How Article 220 treats a device in the residential load calculation:
 * range → Table 220.55 Column C · dryer → 220.54 (5 kVA floor) ·
 * fixed → fastened-in-place pool (75% at 4+, 220.53) · motor → 100% + feeds
 * the largest-motor 25% (220.50) · ac/heat → noncoincident pair (220.60) ·
 * covered → plug loads already inside the general lighting / small-appliance /
 * laundry circuits (no extra VA).
 */
export const APPLIANCE_CATEGORIES = [
  'range',
  'dryer',
  'fixed',
  'motor',
  'ac',
  'heat',
  'covered',
] as const
export type ApplianceCategory = (typeof APPLIANCE_CATEGORIES)[number]

export interface DevicePresetAppliance {
  id: string
  label: { es: string; en: string }
  /** es-SV regional names the search matches. */
  synonyms: string[]
  /** Typical nameplate VA — always surface «valores típicos; verifique la placa». */
  typicalVa: number
  voltage: 120 | 240
  category: ApplianceCategory
}

export const RETAILERS = ['vidri', 'freund', 'epa'] as const
export type Retailer = (typeof RETAILERS)[number]

export interface PriceEntry {
  itemId: string
  retailer: Retailer
  priceUsd: number
  /** ISO date of the research run that produced this price. */
  updatedAt: string
  sourceUrl?: string
  note?: string
}

/* --------------------------- job template schema --------------------------- */
/**
 * Templates are declarative data (PRD §4): questions + engine-call graph + BOM
 * assembly rules. v1 ships them as TypeScript literal modules checked with
 * `satisfies JobTemplate` — same declarative shape as JSON, but the compiler
 * validates discriminated unions, which plain resolveJsonModule cannot.
 * The qty/condition vocabulary is a fixed whitelist interpreted by
 * @elec-assistant/engine `runTemplate`; new needs grow the vocabulary there.
 */

/** Dot path into the run context: 'answers.<id>…', 'options.<id>', 'calls.<id>.<path>', 'derived.<id>.<path>'. */
export type RefPath = string

export type Condition =
  | { ref: RefPath; eq: string | number | boolean }
  | { ref: RefPath; neq: string | number | boolean }
  | { ref: RefPath; in: Array<string | number> }
  | { ref: RefPath; gte: number }
  | { ref: RefPath; lt: number }

/** Fixed arithmetic whitelist — deliberately not a string DSL; anything richer becomes an engine call. */
export type CalcOp = 'add' | 'sub' | 'mul' | 'div' | 'min' | 'max' | 'ceil' | 'floor' | 'round'

export type ValueSpec =
  | string
  | number
  | boolean
  | { $ref: RefPath }
  | { $cond: { if: Condition; then: ValueSpec; else: ValueSpec } }
  | { $calc: { op: CalcOp; args: ValueSpec[] } }

export interface TemplateLabel {
  es: string
  en: string
}

/** Same shape as the engine's Assumption (data cannot import the engine). */
export interface TemplateAssumption {
  key: string
  en: string
  es: string
  citations?: CitationKey[]
}

/** Manual-entry field of a preset question (nameplate entry when no preset fits). */
export interface PresetManualField {
  id: string
  label: TemplateLabel
  default: number
  min: number
  max: number
  step?: number
  unit?: string
  /** Short query-string key; defaults to the field id. */
  urlKey?: string
}

export type TemplateQuestion =
  | {
      id: string
      type: 'preset'
      catalog: PresetCatalogId
      default: string
      /** answers[field] ← preset.values[key] when a preset is chosen (generic runner contract). */
      sets: Record<string, string>
      /** Fields the user fills manually instead of picking a preset. */
      manualFields: PresetManualField[]
      /** «valores típicos de placa…» hint under the picker. */
      presetNote?: TemplateLabel
      label: TemplateLabel
      urlKey?: string
      termId?: GlossaryId
    }
  | {
      id: string
      type: 'number'
      unit: string
      min: number
      max: number
      step: number
      /** Plain number, or a ValueSpec referencing EARLIER questions (answers resolve in declaration order). */
      default: ValueSpec
      label: TemplateLabel
      urlKey?: string
      termId?: GlossaryId
      /** Widget hint. Default 'slider'. */
      ui?: 'slider' | 'field'
    }
  | {
      id: string
      type: 'choice'
      /** Plain value, or a ValueSpec referencing EARLIER questions. */
      default: string | ValueSpec
      choices: Array<{ value: string; label: TemplateLabel; termId?: GlossaryId }>
      label: TemplateLabel
      urlKey?: string
      termId?: GlossaryId
    }

export type TemplateOption =
  | {
      id: string
      type: 'choice'
      default: string
      choices: Array<{ value: string; label: TemplateLabel; termId?: GlossaryId }>
      disabledWhen?: Condition
      label: TemplateLabel
      urlKey?: string
      termId?: GlossaryId
    }
  | {
      id: string
      type: 'number'
      unit?: string
      min: number
      max: number
      step: number
      default: number
      disabledWhen?: Condition
      label: TemplateLabel
      urlKey?: string
      termId?: GlossaryId
      /** Widget hint. Default 'field' (options are secondary controls). */
      ui?: 'slider' | 'field'
    }

export interface TemplateEngineCall {
  id: string
  /** Whitelisted registry key in the engine interpreter (see CALL_REGISTRY there). */
  fn: string
  input: Record<string, unknown>
}

export type TemplateDerived =
  | {
      id: string
      kind: 'min-rating-at-least'
      ratings: number[]
      atLeast: ValueSpec
      citations: CitationKey[]
      assumption?: TemplateAssumption
      label: TemplateLabel
    }
  | {
      /** Materialize a computed value once so conditions/parameters can $ref it. */
      id: string
      kind: 'value'
      value: ValueSpec
      citations?: CitationKey[]
      assumption?: TemplateAssumption
      label: TemplateLabel
    }

export interface TemplateParameter {
  id: string
  label: TemplateLabel
  value: ValueSpec
  unit?: string
  /** Take citations from this call/derived result… */
  citationsFrom?: string
  /** …and/or list them explicitly. */
  citations?: CitationKey[]
  /** Display hint (e.g. voltage drop as a percentage). */
  format?: 'percent'
}

export type BomItemSelector =
  | { itemId: string }
  | { map: { keys: RefPath[]; table: Record<string, string> } }

export type BomQty =
  | { fixed: number }
  | { ref: RefPath }
  | {
      lengthWithWastage: {
        lengthM: RefPath
        wastagePercent: RefPath
        /** e.g. 2 for the two current-carrying runs pulled together. Default 1. */
        multiplier?: number
      }
    }
  | { perInterval: { lengthM: RefPath; intervalM: number; plus?: number } }
  | {
      /** qty = count × each + plus, clamped ≥ 0 (negative plus expresses «all but one»). */
      perCount: { count: RefPath; each?: number; plus?: number }
    }

export interface BomRule {
  id: string
  when?: Condition[]
  item: BomItemSelector
  qty: BomQty
  /** Optional one-time purchase (e.g. a tool) — rendered apart from consumables. */
  optional?: boolean
  citations?: CitationKey[]
  note?: TemplateLabel
}

export interface TemplateWarning {
  id: string
  /** A single condition, or an array (all must hold — AND, like BomRule.when). */
  when: Condition | Condition[]
  text: TemplateLabel
}

export interface JobTemplate {
  id: string
  version: 1
  name: TemplateLabel
  synonyms: string[]
  questions: TemplateQuestion[]
  options: TemplateOption[]
  calls: TemplateEngineCall[]
  derived: TemplateDerived[]
  parameters: TemplateParameter[]
  bom: BomRule[]
  warnings: TemplateWarning[]
  /** Template-level statics merged into every run result (v1 simplification notes). */
  assumptions?: TemplateAssumption[]
}
