import type { CitationKey, DeviationSeverity, TempRating } from '@nec-assistant/data'

/**
 * Common building-wire insulation types and their temperature rating (dry locations).
 * PV = UL 4703 photovoltaic wire (XLPE, sunlight-resistant), rated 90°C wet AND dry in
 * the mainstream construction (the standard also permits 105–150°C dry variants);
 * ampacity in raceways from the 90°C column per 690.8(B)/310.16.
 */
export const INSULATION_TEMP_RATING = {
  TW: 60,
  UF: 60,
  THW: 75,
  THWN: 75,
  USE: 75,
  THHN: 90,
  'THWN-2': 90,
  'XHHW-2': 90,
  PV: 90,
} as const satisfies Record<string, TempRating>

export type Insulation = keyof typeof INSULATION_TEMP_RATING

/** A default or simplification the calculation relied on — surfaced as «supuestos» in the UI. */
export interface Assumption {
  key: string
  en: string
  es: string
  /** NEC references backing the assumption, rendered as chips instead of baked into the prose. */
  citations?: CitationKey[]
}

/**
 * A way the modeled install — or the answer computed from it — departs from the
 * NEC. Never a reason to stop: the engine computes the real number and marks it,
 * because the code is guidance the tool teaches, not a rule it enforces.
 *
 * Distinct from Assumption: an assumption is an input the engine chose FOR you,
 * a deviation is a statement about the ANSWER's code standing.
 */
export interface Deviation {
  key: string
  en: string
  es: string
  /** NEC references backing the deviation, rendered as chips instead of baked into the prose. */
  citations?: CitationKey[]
  severity: DeviationSeverity
}

export interface WithProvenance {
  citations: CitationKey[]
  assumptions: Assumption[]
  deviations: Deviation[]
}

/**
 * Shared between ampacity (conductor sizing) and breaker (OCPD sizing): both apply
 * the 125% continuous factor and must emit the SAME assumption text — `mergeAssumptions`
 * dedupes by key keeping the first, so differing texts would depend on merge order.
 */
export const ASSUME_CONTINUOUS_125: Assumption = {
  key: 'continuous-125',
  en: 'Because the equipment runs for hours at a time (continuous load), the wire and breaker are sized with an extra 25% margin.',
  es: 'Como el equipo trabaja horas seguidas (carga continua), el alambre y el térmico se calculan con 25% de margen extra.',
  citations: ['nec2026.s210_19', 'nec2026.s210_20'],
}

/**
 * Why the engine could not answer. 'input' — the caller gave something malformed;
 * 'coverage' — the NEC has an answer but this repo has not transcribed that table,
 * so the UI can say «fuera de los datos de la app» instead of implying a violation.
 * Neither means «off-code»: that is a Deviation on a real result, never a throw.
 */
export type EngineErrorKind = 'input' | 'coverage'

export class EngineError extends Error {
  constructor(
    message: string,
    readonly es: string,
    readonly kind: EngineErrorKind = 'input',
  ) {
    super(message)
    this.name = 'EngineError'
  }
}

export function mergeCitations(...lists: CitationKey[][]): CitationKey[] {
  return [...new Set(lists.flat())]
}

export function mergeAssumptions(...lists: Assumption[][]): Assumption[] {
  const seen = new Map<string, Assumption>()
  for (const a of lists.flat()) if (!seen.has(a.key)) seen.set(a.key, a)
  return [...seen.values()]
}

/**
 * Every deviation key the ENGINE can emit. A registry rather than a union on
 * `Deviation.key`, because the template interpreter also mints `warning:<id>`
 * keys from data it cannot see at compile time. Its job is to be lint-checkable:
 * the data package's El Salvador practice notes are keyed by these, and a note
 * keyed to something nothing emits would silently never render.
 */
export const DEVIATION_KEYS = [
  'ampacity-insufficient',
  'voltage-drop-over-limit',
  'ocpd-exceeds-conductor',
  'ocpd-above-standard-ratings',
  'box-fill-exceeds',
  'conduit-fill-exceeds',
  'small-appliance-below-minimum',
  'service-above-standard-ratings',
  'mocp-below-required',
] as const

export type EngineDeviationKey = (typeof DEVIATION_KEYS)[number]

export function mergeDeviations(...lists: Deviation[][]): Deviation[] {
  const seen = new Map<string, Deviation>()
  for (const d of lists.flat()) if (!seen.has(d.key)) seen.set(d.key, d)
  return [...seen.values()]
}

/**
 * The «no cumple NEC» predicate — the one place the badge rule lives. Only
 * mandatory rules count: exceeding the 3% voltage-drop recommendation is real
 * information, but calling a non-enforceable Informational Note a violation
 * would be the same overreach this whole channel exists to avoid.
 */
export function isNonCompliant(result: { deviations: Deviation[] }): boolean {
  return result.deviations.some((d) => d.severity === 'off-code')
}
