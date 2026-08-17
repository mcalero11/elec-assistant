import type { CitationKey, TempRating } from '@elec-assistant/data'

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

export interface WithProvenance {
  citations: CitationKey[]
  assumptions: Assumption[]
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

export class EngineError extends Error {
  constructor(
    message: string,
    readonly es: string,
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
