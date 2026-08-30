import { CONDUCTOR_SIZES, table31016, type ConductorSize } from '@nec-assistant/data'
import {
  evaluateConductor,
  minConductorForLoad,
  type MinConductorInput,
  type ConductorEvaluation,
} from './ampacity.js'
import { standardBreaker, type BreakerResult } from './breaker.js'
import { voltageDrop, type VoltageDropResult } from './voltage-drop.js'
import { EngineError, mergeAssumptions, mergeCitations, type WithProvenance } from './types.js'

export interface CircuitInput extends MinConductorInput {
  /** One-way circuit length in meters. */
  lengthM: number
  systemVoltage: number
  phase?: 1 | 3
  /** Maximum allowed voltage drop in percent. Default 3 (branch-circuit recommendation). */
  maxVoltageDropPercent?: number
  /** Breaker rating floor (see BreakerInput.minBreakerA) — upsizes the conductor if needed. */
  minBreakerA?: number
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

/** Size a complete circuit: conductor (ampacity ∧ voltage drop), then its overcurrent protection. */
export function sizeCircuit(input: CircuitInput): CircuitResult {
  const maxDropPercent = input.maxVoltageDropPercent ?? 3
  const base = minConductorForLoad(input)
  const startIndex = CONDUCTOR_SIZES.indexOf(base.size)

  let lastSkip: 'voltage-drop' | 'protection' | undefined
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
    })
    if (vd.dropPercent > maxDropPercent) {
      lastSkip = 'voltage-drop'
      continue
    }

    let breaker
    try {
      breaker = standardBreaker({
        loadA: input.loadA,
        continuous: input.continuous,
        conductorProtectionAmpacity: conductor.protectionAmpacity,
        ...(input.minBreakerA != null ? { minBreakerA: input.minBreakerA } : {}),
      })
    } catch (e) {
      if (e instanceof EngineError) {
        lastSkip = 'protection'
        continue
      }
      throw e
    }

    return {
      conductor,
      voltageDrop: vd,
      breaker,
      governedBy: size === base.size ? 'ampacity' : (lastSkip ?? 'ampacity'),
      ampacityMinimumSize: base.size,
      citations: mergeCitations(conductor.citations, vd.citations, breaker.citations),
      assumptions: mergeAssumptions(conductor.assumptions, vd.assumptions, breaker.assumptions),
    }
  }

  throw new EngineError(
    `No conductor size up to 600 kcmil satisfies this circuit (load, voltage drop, and protection)`,
    `Ningún calibre hasta 600 kcmil satisface este circuito (carga, caída de tensión y protección)`,
  )
}
