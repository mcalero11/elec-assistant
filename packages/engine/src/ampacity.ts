import {
  CONDUCTOR_SIZES,
  ambientCorrection,
  cccAdjustment,
  table31016,
  type ConductorMaterial,
  type ConductorSize,
  type TempRating,
  type TempRatingKey,
} from '@nec-assistant/data'
import {
  ASSUME_CONTINUOUS_125,
  EngineError,
  INSULATION_TEMP_RATING,
  type Assumption,
  type Insulation,
  type WithProvenance,
} from './types.js'

const ASSUME_DRY: Assumption = {
  key: 'dry-location',
  en: 'THHN jacket withstands 90°C only in dry locations; if the run is outdoors or can get wet, use a THWN-2 or equivalent type.',
  es: 'El forro THHN aguanta 90 °C solo en lugares secos; si el recorrido va a la intemperie o se puede mojar, use tipo THWN-2 o equivalente.',
}

/** Types whose listed temperature rating holds only in dry/damp locations — the caveat above applies to these alone. */
const DRY_ONLY_INSULATIONS: readonly Insulation[] = ['THHN']

/**
 * The ambient temperature the calculation ran at is ALWAYS surfaced (a silent 30°C
 * default undersizes hot-climate installs — the whole point of asking for it).
 */
function ambientAssumption(ambientC: number, provided: boolean, factor: number): Assumption {
  if (!provided) {
    return {
      key: 'ambient-30c',
      en: 'Calculated at 30°C ambient (the table basis); if the run gets hotter, the wire carries less current.',
      es: 'Se calculó con 30 °C de temperatura ambiente (la base de la tabla); si donde pasa el cable hace más calor, el alambre soporta menos corriente.',
      citations: ['nec2026.t310_15_b_1'],
    }
  }
  if (factor < 1) {
    return {
      key: 'ambient-used',
      en: `Calculated for ${ambientC}°C ambient; heat reduces the wire's capacity to ${Math.round(factor * 100)}% of the table value.`,
      es: `Se calculó para ${ambientC} °C de temperatura ambiente; el calor reduce la capacidad del alambre a ${Math.round(factor * 100)}% de la tabla.`,
      citations: ['nec2026.t310_15_b_1'],
    }
  }
  return {
    key: 'ambient-used',
    en: `Calculated for ${ambientC}°C ambient (no reduction at that temperature).`,
    es: `Se calculó para ${ambientC} °C de temperatura ambiente (a esa temperatura no hay reducción).`,
    citations: ['nec2026.t310_15_b_1'],
  }
}

export function ambientFactor(ambientC: number, rating: TempRating): number {
  const row = ambientCorrection.ranges.find((r) => ambientC >= r.minC && ambientC <= r.maxC)
  const factor = row?.factors[String(rating) as TempRatingKey]
  if (factor == null) {
    throw new EngineError(
      `Ambient ${ambientC}°C is not permitted for a ${rating}°C-rated conductor (Table 310.15(B)(1)(1))`,
      `Una temperatura ambiente de ${ambientC}°C no está permitida para un conductor de ${rating}°C (Tabla 310.15(B)(1)(1))`,
    )
  }
  return factor
}

export function cccFactor(cccCount: number): number {
  if (cccCount <= 3) return 1
  const row = cccAdjustment.ranges.find((r) => cccCount >= r.minCcc && cccCount <= r.maxCcc)
  if (!row) {
    throw new EngineError(
      `No adjustment factor for ${cccCount} current-carrying conductors`,
      `No hay factor de ajuste para ${cccCount} conductores portadores de corriente`,
    )
  }
  return row.factor
}

export function baseAmpacity(
  size: ConductorSize,
  material: ConductorMaterial,
  rating: TempRating,
): number {
  const cell = table31016[material][size]
  if (!cell) {
    throw new EngineError(
      `No ${material} entry for size ${size} in Table 310.16`,
      `No existe entrada de ${material === 'copper' ? 'cobre' : 'aluminio'} para el calibre ${size} en la Tabla 310.16`,
    )
  }
  return cell[String(rating) as TempRatingKey]
}

export interface DeratedAmpacityInput {
  size: ConductorSize
  material: ConductorMaterial
  insulation: Insulation
  /** Ambient temperature in °C. Default 30 (table basis). */
  ambientC?: number
  /** Current-carrying conductors sharing the raceway/cable. Default 3 (no adjustment). */
  cccCount?: number
}

export interface DeratedAmpacityResult extends WithProvenance {
  size: ConductorSize
  tempRating: TempRating
  baseAmpacity: number
  ambientFactor: number
  cccFactor: number
  /** Base ampacity × ambient correction × CCC adjustment. */
  ampacity: number
}

export function deratedAmpacity(input: DeratedAmpacityInput): DeratedAmpacityResult {
  const rating = INSULATION_TEMP_RATING[input.insulation]
  const ambientC = input.ambientC ?? 30
  const cccCount = input.cccCount ?? 3

  const base = baseAmpacity(input.size, input.material, rating)
  const fAmbient = ambientFactor(ambientC, rating)
  const fCcc = cccFactor(cccCount)

  const assumptions: Assumption[] = []
  if (DRY_ONLY_INSULATIONS.includes(input.insulation)) assumptions.push(ASSUME_DRY)
  assumptions.push(ambientAssumption(ambientC, input.ambientC != null, fAmbient))

  // Cite the correction/adjustment tables only when their factor actually
  // changed the result — an unconditional chip is noise (user feedback).
  const citations: DeratedAmpacityResult['citations'] = ['nec2026.t310_16']
  if (fAmbient !== 1) citations.push('nec2026.t310_15_b_1')
  if (fCcc !== 1) citations.push('nec2026.t310_15_c_1')

  return {
    size: input.size,
    tempRating: rating,
    baseAmpacity: base,
    ambientFactor: fAmbient,
    cccFactor: fCcc,
    ampacity: base * fAmbient * fCcc,
    citations,
    assumptions,
  }
}

/** 240.4(D) small-conductor overcurrent limits (amperes). */
const SMALL_CONDUCTOR_CAP: Partial<Record<ConductorMaterial, Partial<Record<ConductorSize, number>>>> = {
  copper: { '14': 15, '12': 20, '10': 30 },
  aluminum: { '12': 15, '10': 25 },
}

export function smallConductorCap(
  size: ConductorSize,
  material: ConductorMaterial,
): number | undefined {
  return SMALL_CONDUCTOR_CAP[material]?.[size]
}

export interface MinConductorInput {
  /** Load current in amperes. */
  loadA: number
  /** Whether the whole load is continuous (3h+). Applies the 125% factor. Default false. */
  continuous?: boolean
  material: ConductorMaterial
  insulation: Insulation
  ambientC?: number
  cccCount?: number
  /** Terminal temperature rating. Default per 110.14(C)(1): 60°C for circuits ≤100 A, else 75°C. */
  terminalRatingC?: 60 | 75
}

export interface ConductorEvaluation extends WithProvenance {
  size: ConductorSize
  /** Derated ampacity under the installation conditions (insulation column). */
  deratedAmpacity: number
  /** Ampacity at the terminal-temperature column (no derating), per 110.14(C). */
  terminationAmpacity: number
  /** Ampacity usable for overcurrent protection: min(derated, termination, 240.4(D) cap). */
  protectionAmpacity: number
  /** 125% of continuous load (plus non-continuous), the termination-side requirement. */
  requiredTermination: number
  terminalRatingC: 60 | 75
  satisfiesLoad: boolean
}

export function evaluateConductor(
  size: ConductorSize,
  input: MinConductorInput,
): ConductorEvaluation {
  const continuous = input.continuous ?? false
  const requiredTermination = continuous ? input.loadA * 1.25 : input.loadA
  const terminalRatingC =
    input.terminalRatingC ?? (requiredTermination > 100 ? 75 : 60)

  const insulationRating = INSULATION_TEMP_RATING[input.insulation]
  const terminationColumn = Math.min(terminalRatingC, insulationRating) as TempRating

  const derated = deratedAmpacity({
    size,
    material: input.material,
    insulation: input.insulation,
    ambientC: input.ambientC,
    cccCount: input.cccCount,
  })
  const terminationAmpacity = baseAmpacity(size, input.material, terminationColumn)
  const cap = smallConductorCap(size, input.material)
  const protectionAmpacity = Math.min(
    derated.ampacity,
    terminationAmpacity,
    cap ?? Number.POSITIVE_INFINITY,
  )

  const assumptions: Assumption[] = [...derated.assumptions]
  if (input.terminalRatingC == null) {
    assumptions.push({
      key: 'terminal-rating-default',
      en: `Equipment terminals assumed rated ${terminalRatingC}°C (typical for circuits ${requiredTermination > 100 ? 'over' : 'up to'} 100 A); adjust if the nameplate says otherwise.`,
      es: `Los bornes del equipo se asumen para ${terminalRatingC} °C (lo típico en circuitos ${requiredTermination > 100 ? 'mayores a' : 'de hasta'} 100 A); si la placa de datos indica otra cosa, ajústelo.`,
      citations: ['nec2026.s110_14_c'],
    })
  }
  if (continuous) assumptions.push(ASSUME_CONTINUOUS_125)

  const citations = [...derated.citations, 'nec2026.s110_14_c' as const]
  if (continuous) citations.push('nec2026.s210_19', 'nec2026.s210_20')
  // Cite the small-conductor limit only when it actually constrains the
  // protection ampacity below the other limits (conditional-citation rule).
  if (cap !== undefined && cap < Math.min(derated.ampacity, terminationAmpacity)) {
    citations.push('nec2026.s240_4_d')
  }

  return {
    size,
    deratedAmpacity: derated.ampacity,
    terminationAmpacity,
    protectionAmpacity,
    requiredTermination,
    terminalRatingC,
    satisfiesLoad:
      terminationAmpacity >= requiredTermination && derated.ampacity >= input.loadA,
    citations,
    assumptions,
  }
}

/** Smallest conductor whose termination ampacity covers 125% of continuous load and whose derated ampacity covers the load. */
export function minConductorForLoad(input: MinConductorInput): ConductorEvaluation {
  for (const size of CONDUCTOR_SIZES) {
    if (!table31016[input.material][size]) continue
    let evaluation: ConductorEvaluation
    try {
      evaluation = evaluateConductor(size, input)
    } catch (e) {
      if (e instanceof EngineError) continue
      throw e
    }
    if (evaluation.satisfiesLoad) return evaluation
  }
  throw new EngineError(
    `No conductor size up to 600 kcmil satisfies a ${input.loadA} A load under these conditions`,
    `Ningún calibre hasta 600 kcmil satisface una carga de ${input.loadA} A en estas condiciones`,
  )
}
