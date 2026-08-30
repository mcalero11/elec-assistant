import {
  TRADE_SIZES,
  conduitDimensions,
  conduitFillPercent,
  conductorAreas,
  pvWire,
  type ConductorSize,
  type ConduitType,
  type TradeSize,
} from '@nec-assistant/data'
import {
  EngineError,
  INSULATION_TEMP_RATING,
  type Assumption,
  type Insulation,
  type WithProvenance,
} from './types.js'

/**
 * Conduit fill per NEC Chapter 9 (Tables 1, 4, 5).
 *
 * Composition idiom with the circuit sizer: `sizeCircuit` knows nothing about raceways —
 * run it first, then build the full raceway complement (hots + neutral + EGC, per Ch. 9
 * Note 3 equipment grounding conductors count) and hand it here:
 *
 *   const circuit = sizeCircuit({...})
 *   const fill = sizeConduit({
 *     conduitType: 'EMT',
 *     conductors: [{ size: circuit.conductor.size, insulation: 'THHN', count: 3 }],
 *   })
 *
 * Bare (uninsulated) grounding conductors are not expressible yet: Chapter 9 Table 8 in
 * this data set has no area column. Enter an insulated EGC (the regional norm) instead.
 */

const ASSUME_JAM: Assumption = {
  key: 'jam-not-evaluated',
  en: 'The risk of wires jamming while being pulled through the conduit (happens with certain size combinations) is not evaluated.',
  es: 'No se evalúa el riesgo de que los alambres se atasquen al jalarlos por el tubo (pasa con ciertas combinaciones de medidas).',
}

const ASSUME_PVC_SCH40: Assumption = {
  key: 'conduit-pvc-sch40',
  en: 'PVC measurements are Schedule 40; Schedule 80 has less room inside.',
  es: 'Las medidas de PVC son de cédula 40; la cédula 80 tiene menos espacio interno.',
  citations: ['nec2026.ch9_t4'],
}

const ASSUME_LFNC_B: Assumption = {
  key: 'lfnc-b',
  en: 'Flexible conduit is calculated with LFNC-B («poliducto») measurements.',
  es: 'La manguera flexible se calcula con las medidas de LFNC-B («poliducto»).',
  citations: ['nec2026.ch9_t4'],
}

const ASSUME_PV_DIMS: Assumption = {
  key: 'pv-wire-typical-dims',
  en: 'PV wire is not in Chapter 9 Table 5, so fill uses typical manufacturer dimensions (UL 4703 2 kV, conservative across brands — real cables vary up to ~29% in area). Verify against YOUR cable’s spec sheet.',
  es: 'El cable fotovoltaico no está en la Tabla 5 del Capítulo 9, así que el relleno usa dimensiones típicas de fabricante (UL 4703 2 kV, conservadoras entre marcas — los cables reales varían hasta ~29% en área). Verifique la ficha técnica de SU cable.',
  citations: ['nec2026.ch9_note5'],
}

/**
 * Insulations the fill calculator can size: the Table 5 building-wire types plus
 * PV wire, which the NEC sizes by actual manufacturer dimensions (Ch. 9 Note 5).
 */
export const CONDUIT_FILL_INSULATIONS: readonly Insulation[] = [
  ...(Object.keys(INSULATION_TEMP_RATING) as Insulation[]).filter(
    (ins) => ins in conductorAreas.areas,
  ),
  'PV',
]

function minTradeSizeAssumption(size: TradeSize): Assumption {
  return {
    key: 'min-trade-size',
    en: `${size} in. was used as the practical minimum trade size (thinner conduits are not considered).`,
    es: `Se usó ${size} pulg como diámetro mínimo práctico (no se consideran tubos más delgados).`,
  }
}

export interface ConductorFillEntry {
  size: ConductorSize
  insulation: Insulation
  count: number
}

export interface ConduitFillInput {
  conduitType: ConduitType
  tradeSize: TradeSize
  conductors: ConductorFillEntry[]
  /** Raceway is a nipple ≤ 600 mm between enclosures — Chapter 9 Note 4 permits 60% fill. Default false. */
  nipple?: boolean
}

export interface ConduitFillResult extends WithProvenance {
  conduitType: ConduitType
  tradeSize: TradeSize
  metricDesignator: number
  conductorCount: number
  /** Sum of Chapter 9 Table 5 conductor areas. */
  conductorAreaMm2: number
  /** The applicable Table 4 fill column for this conductor count (or the 60% nipple column). */
  allowedFillAreaMm2: number
  /** 53 | 31 | 40 | 60 — the Table 1 / Note 4 percentage applied. */
  fillPercentLimit: number
  /** conductorAreaMm2 / totalAreaMm2 × 100. */
  fillPercentActual: number
  totalAreaMm2: number
  fits: boolean
  /** Chapter 9 Note 7: same-size conductor count rounded up because the decimal was ≥ 0.8. */
  note7Applied: boolean
}

function conductorAreaMm2(entry: ConductorFillEntry): number {
  if (entry.insulation === 'PV') {
    const area = pvWire.areas[entry.size]
    if (area == null || !(area > 0)) {
      throw new EngineError(
        `No typical PV-wire dimensions for size ${entry.size} — enter the actual area from the manufacturer sheet`,
        `No hay dimensiones típicas de cable fotovoltaico para el calibre ${entry.size} — use el área real de la ficha del fabricante`,
      )
    }
    return area
  }
  const area = conductorAreas.areas[entry.insulation]?.[entry.size]
  if (area == null) {
    throw new EngineError(
      `Type ${entry.insulation} size ${entry.size} has no Chapter 9 Table 5 dimensions (cable types are not sized by conduit-fill area)`,
      `El tipo ${entry.insulation} calibre ${entry.size} no tiene dimensiones en la Tabla 5 del Capítulo 9 (los tipos de cable no se dimensionan por área de relleno de tubería)`,
    )
  }
  return area
}

function typeAssumptions(conduitType: ConduitType): Assumption[] {
  const assumptions: Assumption[] = [ASSUME_JAM]
  if (conduitType === 'PVC-40') assumptions.push(ASSUME_PVC_SCH40)
  if (conduitType === 'LFNC-B') assumptions.push(ASSUME_LFNC_B)
  return assumptions
}

/** Check a specific conduit against a set of conductors (interactive-calculator direction). */
export function conduitFill(input: ConduitFillInput): ConduitFillResult {
  if (input.conductors.length === 0) {
    throw new EngineError(
      'Conduit fill requires at least one conductor',
      'El cálculo de relleno de tubería requiere al menos un conductor',
    )
  }
  for (const entry of input.conductors) {
    if (!Number.isInteger(entry.count) || entry.count < 1) {
      throw new EngineError(
        `Conductor count must be a whole number ≥ 1 (got ${entry.count})`,
        `La cantidad de conductores debe ser un número entero ≥ 1 (se recibió ${entry.count})`,
      )
    }
  }

  const dims = conduitDimensions.types[input.conduitType].sizes[input.tradeSize]
  if (!dims) {
    throw new EngineError(
      `${input.conduitType} is not made in trade size ${input.tradeSize} (Chapter 9 Table 4)`,
      `${input.conduitType} no se fabrica en diámetro comercial ${input.tradeSize} (Capítulo 9, Tabla 4)`,
    )
  }

  const unitAreas = input.conductors.map(conductorAreaMm2)
  const conductorCount = input.conductors.reduce((sum, entry) => sum + entry.count, 0)
  const totalConductorArea = input.conductors.reduce(
    (sum, entry, i) => sum + entry.count * (unitAreas[i] ?? 0),
    0,
  )

  const nipple = input.nipple ?? false
  let fillPercentLimit: number
  let allowedFillAreaMm2: number
  if (nipple) {
    fillPercentLimit = conduitFillPercent.nipplePercent
    allowedFillAreaMm2 = dims.fillNippleMm2
  } else {
    const range = conduitFillPercent.ranges.find(
      (r) => conductorCount >= r.minCount && (r.maxCount == null || conductorCount <= r.maxCount),
    )
    if (!range) {
      throw new EngineError(
        `No Chapter 9 Table 1 fill percentage for ${conductorCount} conductors`,
        `No hay porcentaje de relleno en la Tabla 1 del Capítulo 9 para ${conductorCount} conductores`,
      )
    }
    fillPercentLimit = range.percent
    allowedFillAreaMm2 =
      conductorCount === 1
        ? dims.fill1WireMm2
        : conductorCount === 2
          ? dims.fill2WiresMm2
          : dims.fillOver2WiresMm2
  }

  // Chapter 9 Note 7: when all conductors share one Table 5 area, the maximum count is
  // allowed area / unit area, rounded up to the next whole number when the decimal is ≥ 0.8.
  let fits = totalConductorArea <= allowedFillAreaMm2
  let note7Applied = false
  const firstUnit = unitAreas[0]
  if (!fits && firstUnit != null && unitAreas.every((a) => a === firstUnit)) {
    const exact = allowedFillAreaMm2 / firstUnit
    const maxCount = Math.floor(exact) + (exact - Math.floor(exact) >= 0.8 ? 1 : 0)
    if (conductorCount <= maxCount) {
      fits = true
      note7Applied = true
    }
  }

  const usesPv = input.conductors.some((c) => c.insulation === 'PV')
  const usesTable5 = input.conductors.some((c) => c.insulation !== 'PV')
  const citations: ConduitFillResult['citations'] = ['nec2026.ch9_t1', 'nec2026.ch9_t4']
  if (usesTable5) citations.push('nec2026.ch9_t5')
  if (usesPv) citations.push('nec2026.ch9_note5')
  if (nipple) citations.push('nec2026.ch9_note4')
  if (note7Applied) citations.push('nec2026.ch9_note7')

  return {
    conduitType: input.conduitType,
    tradeSize: input.tradeSize,
    metricDesignator: dims.metricDesignator,
    conductorCount,
    conductorAreaMm2: totalConductorArea,
    allowedFillAreaMm2,
    fillPercentLimit,
    fillPercentActual: (totalConductorArea / dims.totalAreaMm2) * 100,
    totalAreaMm2: dims.totalAreaMm2,
    fits,
    note7Applied,
    citations,
    assumptions: usesPv
      ? [...typeAssumptions(input.conduitType), ASSUME_PV_DIMS]
      : typeAssumptions(input.conduitType),
  }
}

export interface SizeConduitInput {
  conduitType: ConduitType
  conductors: ConductorFillEntry[]
  nipple?: boolean
  /** Skip trade sizes below this one (practical availability floor, e.g. '1/2'). */
  minTradeSize?: TradeSize
}

/** Smallest trade size of the given conduit type that accepts the conductors (job-flow direction). */
export function sizeConduit(input: SizeConduitInput): ConduitFillResult {
  const sizes = conduitDimensions.types[input.conduitType].sizes
  const minIndex = input.minTradeSize ? TRADE_SIZES.indexOf(input.minTradeSize) : 0

  for (const [index, tradeSize] of TRADE_SIZES.entries()) {
    if (index < minIndex) continue
    if (!sizes[tradeSize]) continue
    const result = conduitFill({
      conduitType: input.conduitType,
      tradeSize,
      conductors: input.conductors,
      nipple: input.nipple,
    })
    if (result.fits) {
      if (input.minTradeSize) {
        result.assumptions = [...result.assumptions, minTradeSizeAssumption(input.minTradeSize)]
      }
      return result
    }
  }

  const available = TRADE_SIZES.filter((s) => sizes[s])
  const largest = available[available.length - 1]
  throw new EngineError(
    `No ${input.conduitType} trade size up to ${largest} in. fits these conductors (Chapter 9 Table 1)`,
    `Ningún diámetro comercial de ${input.conduitType} hasta ${largest} pulg acepta estos conductores (Capítulo 9, Tabla 1)`,
  )
}
