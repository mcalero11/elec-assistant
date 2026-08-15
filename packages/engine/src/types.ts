import type { CitationKey, TempRating } from '@elec-assistant/data'

/** Common building-wire insulation types and their temperature rating (dry locations). */
export const INSULATION_TEMP_RATING = {
  TW: 60,
  UF: 60,
  THW: 75,
  THWN: 75,
  USE: 75,
  THHN: 90,
  'THWN-2': 90,
  'XHHW-2': 90,
} as const satisfies Record<string, TempRating>

export type Insulation = keyof typeof INSULATION_TEMP_RATING

/** A default or simplification the calculation relied on — surfaced as «supuestos» in the UI. */
export interface Assumption {
  key: string
  en: string
  es: string
}

export interface WithProvenance {
  citations: CitationKey[]
  assumptions: Assumption[]
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
