import table31016Json from './nec-2026/table-310-16.json'
import ambientCorrectionJson from './nec-2026/table-310-15-b-1.json'
import cccAdjustmentJson from './nec-2026/table-310-15-c-1.json'
import conductorResistanceJson from './nec-2026/chapter9-table8.json'
import standardBreakersJson from './nec-2026/standard-breakers.json'
import citationsJson from './citations.json'

export const NEC_EDITION = 'nec-2026'

/** AWG/kcmil sizes in ascending ampacity order. */
export const CONDUCTOR_SIZES = [
  '14', '12', '10', '8', '6', '4', '3', '2', '1',
  '1/0', '2/0', '3/0', '4/0',
  '250', '300', '350', '400', '500', '600',
] as const

export type ConductorSize = (typeof CONDUCTOR_SIZES)[number]
export type ConductorMaterial = 'copper' | 'aluminum'
export type TempRating = 60 | 75 | 90
export type TempRatingKey = '60' | '75' | '90'

export type AmpacityCell = Record<TempRatingKey, number>

export interface AmpacityTable {
  source: string
  note: string
  basisAmbientC: number
  copper: Partial<Record<ConductorSize, AmpacityCell>>
  aluminum: Partial<Record<ConductorSize, AmpacityCell>>
}

export interface AmbientCorrectionTable {
  source: string
  note: string
  basisAmbientC: number
  ranges: Array<{
    minC: number
    maxC: number
    factors: Record<TempRatingKey, number | null>
  }>
}

export interface CccAdjustmentTable {
  source: string
  note: string
  ranges: Array<{ minCcc: number; maxCcc: number; factor: number }>
}

export interface ConductorResistanceTable {
  source: string
  note: string
  unit: string
  temperatureC: number
  copper: Partial<Record<ConductorSize, number>>
  aluminum: Partial<Record<ConductorSize, number>>
}

export interface StandardBreakerTable {
  source: string
  note: string
  ratings: number[]
}

export const table31016: AmpacityTable = table31016Json
export const ambientCorrection: AmbientCorrectionTable = ambientCorrectionJson
export const cccAdjustment: CccAdjustmentTable = cccAdjustmentJson
export const conductorResistance: ConductorResistanceTable = conductorResistanceJson
export const standardBreakers: StandardBreakerTable = standardBreakersJson

export const citations = citationsJson
export type CitationKey = keyof typeof citationsJson

export function citationLabel(key: CitationKey, locale: 'en' | 'es' = 'es'): string {
  return citations[key][locale]
}
