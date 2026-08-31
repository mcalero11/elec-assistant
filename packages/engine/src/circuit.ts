import { CONDUCTOR_SIZES, table31016, type ConductorSize } from '@nec-assistant/data'
import {
  evaluateConductor,
  minConductorForLoad,
  type MinConductorInput,
  type ConductorEvaluation,
} from './ampacity.js'
import { standardBreaker, type BreakerResult } from './breaker.js'
import { voltageDrop, type VoltageDropResult } from './voltage-drop.js'
import {
  EngineError,
  mergeAssumptions,
  mergeCitations,
  mergeDeviations,
  type WithProvenance,
} from './types.js'

export interface CircuitInput extends MinConductorInput {
  /** One-way circuit length in meters. */
  lengthM: number
  systemVoltage: number
  phase?: 1 | 3
  /** Maximum allowed voltage drop in percent. Default 3 (branch-circuit recommendation). */
  maxVoltageDropPercent?: number
  /** Breaker rating floor (see BreakerInput.minBreakerA) — upsizes the conductor if needed. */
  minBreakerA?: number
  /** Nameplate MOCP (see BreakerInput.mocpA) — puts the circuit under Article 440. */
  mocpA?: number
}

export interface CircuitResult extends WithProvenance {
  conductor: ConductorEvaluation
  voltageDrop: VoltageDropResult
  breaker: BreakerResult
  /** Which constraint forced the final conductor size. */
  governedBy: 'ampacity' | 'voltage-drop' | 'protection'
  /**
   * Smallest size with sufficient ampacity alone (incl. 310.15(B)/(C) derating and
   * terminal limits) — the 250.122(B) baseline: any increase beyond it (voltage drop,
   * protection) triggers proportional EGC upsizing.
   */
  ampacityMinimumSize: ConductorSize
}

/**
 * Size a complete circuit: conductor (ampacity ∧ voltage drop), then its
 * overcurrent protection.
 *
 * When no size satisfies every constraint, the largest candidate evaluated is
 * returned instead of throwing. Its own deviations — `ampacity-insufficient`,
 * `voltage-drop-over-limit`, `ocpd-exceeds-conductor` — already say exactly
 * which constraint could not be met, so there is no circuit-level deviation.
 */
export function sizeCircuit(input: CircuitInput): CircuitResult {
  const maxDropPercent = input.maxVoltageDropPercent ?? 3
  const base = minConductorForLoad(input)
  const startIndex = CONDUCTOR_SIZES.indexOf(base.size)

  const assemble = (
    conductor: ConductorEvaluation,
    vd: VoltageDropResult,
    breaker: BreakerResult,
    governedBy: CircuitResult['governedBy'],
  ): CircuitResult => ({
    conductor,
    voltageDrop: vd,
    breaker,
    governedBy,
    ampacityMinimumSize: base.size,
    citations: mergeCitations(conductor.citations, vd.citations, breaker.citations),
    assumptions: mergeAssumptions(conductor.assumptions, vd.assumptions, breaker.assumptions),
    deviations: mergeDeviations(conductor.deviations, vd.deviations, breaker.deviations),
  })

  let lastSkip: 'voltage-drop' | 'protection' | undefined
  let fallback: [ConductorEvaluation, VoltageDropResult, BreakerResult] | undefined

  for (const size of CONDUCTOR_SIZES.slice(startIndex)) {
    if (!table31016[input.material][size]) continue
    const conductor = evaluateConductor(size, input)

    const vd = voltageDrop({
      currentA: input.loadA,
      lengthM: input.lengthM,
      size,
      material: input.material,
      systemVoltage: input.systemVoltage,
      phase: input.phase,
      maxDropPercent,
    })

    // Evaluated before the voltage-drop skip so the fallback always carries a
    // breaker. Safe only because `standardBreaker` is total.
    const breaker = standardBreaker({
      loadA: input.loadA,
      continuous: input.continuous,
      conductorProtectionAmpacity: conductor.protectionAmpacity,
      ...(input.minBreakerA != null ? { minBreakerA: input.minBreakerA } : {}),
      ...(input.mocpA != null ? { mocpA: input.mocpA } : {}),
    })

    fallback = [conductor, vd, breaker]

    // Check order is load-bearing: it fixes which constraint `governedBy`
    // reports when more than one rejected a smaller candidate.
    if (vd.dropPercent > maxDropPercent) {
      lastSkip = 'voltage-drop'
      continue
    }
    if (!breaker.protectsConductor) {
      lastSkip = 'protection'
      continue
    }

    return assemble(conductor, vd, breaker, size === base.size ? 'ampacity' : (lastSkip ?? 'ampacity'))
  }

  if (!fallback) {
    throw new EngineError(
      `No Table 310.16 rows at or above ${base.size} for ${input.material}`,
      `No hay filas de la Tabla 310.16 desde ${base.size} para ${input.material === 'copper' ? 'cobre' : 'aluminio'}`,
      'coverage',
    )
  }
  return assemble(...fallback, lastSkip ?? 'ampacity')
}
