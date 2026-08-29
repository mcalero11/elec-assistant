import table31016Json from './nec-2026/table-310-16.json'
import ambientCorrectionJson from './nec-2026/table-310-15-b-1.json'
import cccAdjustmentJson from './nec-2026/table-310-15-c-1.json'
import conductorResistanceJson from './nec-2026/chapter9-table8.json'
import standardBreakersJson from './nec-2026/standard-breakers.json'
import conduitFillPercentJson from './nec-2026/chapter9-table1.json'
import conduitDimensionsJson from './nec-2026/chapter9-table4.json'
import conductorAreasJson from './nec-2026/chapter9-table5.json'
import egcJson from './nec-2026/table-250-122.json'
import gecJson from './nec-2026/table-250-66.json'
import standardBoxesJson from './nec-2026/table-314-16-a.json'
import boxAllowancesJson from './nec-2026/table-314-16-b.json'
import lightingDemandJson from './nec-2026/table-220-45.json'
import rangeDemandJson from './nec-2026/table-220-55.json'
import article220Json from './nec-2026/article-220-residential.json'
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

/** Table 250.66: 'not exceeding' rows on the largest ungrounded service conductor, per material column. */
export interface GecTable {
  source: string
  note: string
  rows: Array<{
    maxServiceCopper: ConductorSize
    maxServiceAluminum: ConductorSize
    gecCopper: ConductorSize
    gecAluminum: ConductorSize
  }>
}

export const gecTable: GecTable = {
  source: gecJson.source,
  note: gecJson.note,
  rows: gecJson.rows.map((r) => ({
    maxServiceCopper: asConductorSize(r.maxServiceCopper),
    maxServiceAluminum: asConductorSize(r.maxServiceAluminum),
    gecCopper: asConductorSize(r.gecCopper),
    gecAluminum: asConductorSize(r.gecAluminum),
  })),
}

/**
 * Conductor sizes covered by box fill (Table 314.16(B)(1)), in ascending
 * volume-allowance order. Distinct from CONDUCTOR_SIZES: box fill reaches down
 * to 18 AWG (fixture wires) and stops at 6 AWG — 4 AWG and larger fall under
 * the 314.28 pull-box rules instead.
 */
export const BOX_CONDUCTOR_SIZES = ['18', '16', '14', '12', '10', '8', '6'] as const
export type BoxConductorSize = (typeof BOX_CONDUCTOR_SIZES)[number]

/** Box shape groups of Table 314.16(A) (canonical filter order for size mode). */
export const BOX_SHAPES = ['round-octagonal', 'square', 'device', 'masonry', 'fs-fd'] as const
export type BoxShape = (typeof BOX_SHAPES)[number]

export interface StandardBox {
  /** Stable slug used in URL state and golden tests. */
  id: string
  shape: BoxShape
  tradeSizeMm: string
  tradeSizeIn: string
  label: { es: string; en: string }
  volumeCm3: number
  /** Informational — the NEC prints both columns; cm³ is canonical for the engine. */
  volumeIn3: number
}

export interface StandardBoxesTable {
  source: string
  note: string
  unit: string
  /** Ordered ascending by volumeCm3 (size mode iterates for the first fit). */
  boxes: StandardBox[]
}

export interface BoxAllowanceTable {
  source: string
  note: string
  unit: string
  allowances: Array<{ size: BoxConductorSize; cm3: number; in3: number }>
}

function asBoxConductorSize(value: string): BoxConductorSize {
  if ((BOX_CONDUCTOR_SIZES as readonly string[]).includes(value)) return value as BoxConductorSize
  throw new Error(`table-314-16-b.json contains an unknown conductor size: ${value}`)
}

function asBoxShape(value: string): BoxShape {
  if ((BOX_SHAPES as readonly string[]).includes(value)) return value as BoxShape
  throw new Error(`table-314-16-a.json contains an unknown box shape: ${value}`)
}

export const standardBoxes: StandardBoxesTable = {
  source: standardBoxesJson.source,
  note: standardBoxesJson.note,
  unit: standardBoxesJson.unit,
  boxes: standardBoxesJson.boxes.map((b) => ({ ...b, shape: asBoxShape(b.shape) })),
}
{
  const ids = new Set<string>()
  for (const box of standardBoxes.boxes) {
    if (ids.has(box.id)) throw new Error(`table-314-16-a.json has a duplicate box id: ${box.id}`)
    ids.add(box.id)
  }
}

export const boxAllowances: BoxAllowanceTable = {
  source: boxAllowancesJson.source,
  note: boxAllowancesJson.note,
  unit: boxAllowancesJson.unit,
  allowances: boxAllowancesJson.allowances.map((a) => ({
    ...a,
    size: asBoxConductorSize(a.size),
  })),
}

/** Marginal demand tiers for the pooled dwelling general-lighting load (Table 220.45). */
export interface LightingDemandTable {
  source: string
  note: string
  unit: string
  /** Applied marginally in order; upToVa null = remainder. */
  tiers: Array<{ upToVa: number | null; percent: number }>
}

/** Table 220.55 Column C (household ranges ≤ 12 kW) + Note 1 constants. */
export interface RangeDemandTable {
  source: string
  note: string
  unit: string
  columnC: Array<{ appliances: number; demandKw: number }>
  columnCMaxKw: number
  note1PercentPerKw: number
  note1MaxKw: number
}

/**
 * Article 120 (ex-220) scalar values used by the residential load calc.
 * The legacy "220" naming is kept in identifiers (files, keys, exports) —
 * NEC 2026 relocated load calculations to the new Article 120; labels and
 * source strings carry the current designations.
 */
export interface Article220Table {
  source: string
  note: string
  /** 120.41 feeder/service value (22 in 2026; branch-circuit counting keeps 33 via 120.13). */
  generalLightingVaPerM2: number
  generalLightingVaPerFt2: number
  branchCircuitVaPerM2: number
  smallApplianceCircuitVa: number
  minSmallApplianceCircuits: number
  laundryCircuitVa: number
  fixedApplianceDemand: { minCount: number; percent: number }
  dryerMinVa: number
  /** 2026-revised Table 120.54 count factors; counts beyond the last row are not transcribed. */
  dryerDemandFactors: Array<{ maxCount: number; percent: number }>
  optionalMethod: {
    firstTierVa: number
    firstTierPercent: number
    remainderPercent: number
    acPercent: number
    centralHeatPercent: number
  }
  minDwellingServiceA: number
}

export const lightingDemand: LightingDemandTable = lightingDemandJson
export const rangeDemand: RangeDemandTable = rangeDemandJson
export const article220: Article220Table = article220Json

/* ------------------------- catalog / templates / prices ------------------------- */

export * from './catalog/types.js'
export { glossary, type GlossaryEntry, type GlossaryId } from './glossary.js'
export { catalogItems, type CatalogItemId } from './catalog/items.js'
export { acPresets, type AcPresetId } from './catalog/ac-presets.js'
export { appliancePresets, type AppliancePresetId } from './catalog/appliance-presets.js'
export { presetCatalogs, type DevicePreset, type PresetCatalogId } from './catalog/presets.js'
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
