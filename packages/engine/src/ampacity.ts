import {
  CONDUCTOR_SIZES,
  ambientCorrection,
  cccAdjustment,
  table31016,
  type ConductorMaterial,
  type ConductorSize,
  type TempRating,
  type TempRatingKey,
} from '@elec-assistant/data'
import {
  EngineError,
  INSULATION_TEMP_RATING,
  type Assumption,
  type Insulation,
  type WithProvenance,
} from './types.js'

const ASSUME_DRY: Assumption = {
  key: 'dry-location',
  en: 'Insulation temperature rating assumes a dry location (e.g. THHN at 90°C). For wet locations use a -2/W-rated insulation.',
  es: 'La temperatura nominal del aislamiento asume ubicación seca (p. ej. THHN a 90°C). Para ubicaciones húmedas use aislamiento tipo -2/W.',
}

/** Types whose listed temperature rating holds only in dry/damp locations — the caveat above applies to these alone. */
const DRY_ONLY_INSULATIONS: readonly Insulation[] = ['THHN']

const ASSUME_AMBIENT_DEFAULT: Assumption = {
  key: 'ambient-30c',
  en: 'Ambient temperature assumed 30°C (table basis).',
  es: 'Temperatura ambiente asumida de 30°C (base de la tabla).',
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
  if (input.ambientC == null) assumptions.push(ASSUME_AMBIENT_DEFAULT)

  return {
    size: input.size,
    tempRating: rating,
    baseAmpacity: base,
    ambientFactor: fAmbient,
    cccFactor: fCcc,
    ampacity: base * fAmbient * fCcc,
    citations: ['nec2026.t310_16', 'nec2026.t310_15_b_1', 'nec2026.t310_15_c_1'],
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
      en: `Terminal rating assumed ${terminalRatingC}°C per 110.14(C)(1) (${requiredTermination > 100 ? '>' : '≤'}100 A circuit); override if equipment is marked otherwise.`,
      es: `Temperatura de terminales asumida de ${terminalRatingC}°C según 110.14(C)(1) (circuito ${requiredTermination > 100 ? 'mayor a' : 'de hasta'} 100 A); ajuste si el equipo indica otro valor.`,
    })
  }
  if (continuous) {
    assumptions.push({
      key: 'continuous-125',
      en: 'Load treated as 100% continuous: 125% factor applied per 210.19(A)/210.20(A).',
      es: 'Carga tratada como 100% continua: se aplicó el factor de 125% según 210.19(A)/210.20(A).',
    })
  }

  const citations = [...derated.citations, 'nec2026.s110_14_c' as const]
  if (continuous) citations.push('nec2026.s210_19', 'nec2026.s210_20')
  if (cap !== undefined) citations.push('nec2026.s240_4_d')

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
