import table31016Json from './nec-2026/table-310-16.json'
import ambientCorrectionJson from './nec-2026/table-310-15-b-1.json'
import cccAdjustmentJson from './nec-2026/table-310-15-c-1.json'
import conductorResistanceJson from './nec-2026/chapter9-table8.json'
import standardBreakersJson from './nec-2026/standard-breakers.json'
import conduitFillPercentJson from './nec-2026/chapter9-table1.json'
import conduitDimensionsJson from './nec-2026/chapter9-table4.json'
import conductorAreasJson from './nec-2026/chapter9-table5.json'
import egcJson from './nec-2026/table-250-122.json'
import pvWireJson from './reference/pv-wire.json'
import pricesJson from './catalog/prices.json'
import citationsJson from './citations.json'
import { RETAILERS, type PriceEntry, type Retailer } from './catalog/types.js'

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
  /** Conductor area in circular mils (material-independent), Chapter 9 Table 8 area column. */
  areaCmil: Record<ConductorSize, number>
  copper: Partial<Record<ConductorSize, number>>
  aluminum: Partial<Record<ConductorSize, number>>
}

export interface StandardBreakerTable {
  source: string
  note: string
  ratings: number[]
}

/** Conduit/tubing trade sizes in ascending order (canonical iteration order, like CONDUCTOR_SIZES). */
export const TRADE_SIZES = [
  '3/8', '1/2', '3/4', '1', '1-1/4', '1-1/2', '2', '2-1/2', '3', '3-1/2', '4', '5', '6',
] as const

export type TradeSize = (typeof TRADE_SIZES)[number]

export const CONDUIT_TYPES = ['EMT', 'PVC-40', 'LFNC-B'] as const
export type ConduitType = (typeof CONDUIT_TYPES)[number]

export interface ConduitFillPercentTable {
  source: string
  note: string
  ranges: Array<{ minCount: number; maxCount: number | null; percent: number }>
  nipplePercent: number
}

export interface ConduitSizeEntry {
  metricDesignator: number
  internalDiameterMm: number
  totalAreaMm2: number
  fill1WireMm2: number
  fill2WiresMm2: number
  fillOver2WiresMm2: number
  fillNippleMm2: number
}

export interface ConduitDimensionsTable {
  source: string
  note: string
  unit: string
  types: Record<ConduitType, { article: string; sizes: Partial<Record<TradeSize, ConduitSizeEntry>> }>
}

/** Keys are insulation type names; data has no dependency on the engine's Insulation type, so plain string. */
export interface ConductorAreaTable {
  source: string
  note: string
  unit: string
  areas: Record<string, Partial<Record<ConductorSize, number>>>
}

export interface EgcTable {
  source: string
  note: string
  rows: Array<{ maxOcpdA: number; copper: ConductorSize; aluminum: ConductorSize }>
}

/**
 * NOT an NEC table: typical manufacturer dimensions for conductors the NEC sizes
 * by actual dimensions (Chapter 9, Notes to Tables — e.g. UL 4703 PV wire).
 * Consumers must surface the typical-dimensions assumption.
 */
export interface ManufacturerAreaTable {
  source: string
  note: string
  unit: string
  areas: Partial<Record<ConductorSize, number>>
}

export const table31016: AmpacityTable = table31016Json
export const ambientCorrection: AmbientCorrectionTable = ambientCorrectionJson
export const cccAdjustment: CccAdjustmentTable = cccAdjustmentJson
export const conductorResistance: ConductorResistanceTable = conductorResistanceJson
export const standardBreakers: StandardBreakerTable = standardBreakersJson
export const conduitFillPercent: ConduitFillPercentTable = conduitFillPercentJson
export const conduitDimensions: ConduitDimensionsTable = conduitDimensionsJson
export const conductorAreas: ConductorAreaTable = conductorAreasJson
export const pvWire: ManufacturerAreaTable = pvWireJson

/** JSON widens the size strings to `string`; validate them against CONDUCTOR_SIZES at load. */
function asConductorSize(value: string): ConductorSize {
  if ((CONDUCTOR_SIZES as readonly string[]).includes(value)) return value as ConductorSize
  throw new Error(`table-250-122.json contains an unknown conductor size: ${value}`)
}

export const egcTable: EgcTable = {
  source: egcJson.source,
  note: egcJson.note,
  rows: egcJson.rows.map((r) => ({
    maxOcpdA: r.maxOcpdA,
    copper: asConductorSize(r.copper),
    aluminum: asConductorSize(r.aluminum),
  })),
}

/* ------------------------- catalog / templates / prices ------------------------- */

export * from './catalog/types.js'
export { glossary, type GlossaryEntry, type GlossaryId } from './glossary.js'
export { catalogItems, type CatalogItemId } from './catalog/items.js'
export { acPresets, type AcPresetId } from './catalog/ac-presets.js'
export { acMinisplitTemplate } from './templates/ac-minisplit.js'

/** prices.json is written by the research procedure in PRICES.md — validate at load. */
function asPriceEntry(raw: Record<string, unknown>): PriceEntry {
  const { itemId, retailer, priceUsd, updatedAt, sourceUrl, note } = raw
  if (typeof itemId !== 'string' || itemId.length === 0)
    throw new Error(`prices.json: bad itemId in ${JSON.stringify(raw)}`)
  if (typeof retailer !== 'string' || !(RETAILERS as readonly string[]).includes(retailer))
    throw new Error(`prices.json: unknown retailer for ${itemId}: ${String(retailer)}`)
  if (typeof priceUsd !== 'number' || !(priceUsd > 0))
    throw new Error(`prices.json: bad priceUsd for ${itemId}`)
  if (typeof updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updatedAt))
    throw new Error(`prices.json: bad updatedAt for ${itemId}`)
  return {
    itemId,
    retailer: retailer as Retailer,
    priceUsd,
    updatedAt,
    ...(typeof sourceUrl === 'string' ? { sourceUrl } : {}),
    ...(typeof note === 'string' ? { note } : {}),
  }
}

export const priceEntries: PriceEntry[] = (
  (pricesJson as { entries: Array<Record<string, unknown>> }).entries ?? []
).map(asPriceEntry)

export const citations = citationsJson
export type CitationKey = keyof typeof citationsJson

export function citationLabel(key: CitationKey, locale: 'en' | 'es' = 'es'): string {
  return citations[key][locale]
}

/**
 * Short plain-language reason for a citation — what the rule DID to the result
 * («ajuste por agrupamiento»), for chip text aimed at beginners; the article
 * number stays in the full label shown on tap. Falls back to the compact
 * article reference while an entry has no reason fields yet.
 */
export function citationReason(key: CitationKey, locale: 'en' | 'es' = 'es'): string {
  const entry = citations[key] as {
    en: string
    es: string
    reasonEn?: string
    reasonEs?: string
  }
  const reason = locale === 'es' ? entry.reasonEs : entry.reasonEn
  if (reason) return reason
  const label = entry[locale]
  return label.replace(/^NEC \d+,\s*/, '').split('—')[0]?.trim() ?? label
}
