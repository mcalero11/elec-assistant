import { standardBreakers } from '@elec-assistant/data'
import { ASSUME_CONTINUOUS_125, EngineError, type Assumption, type WithProvenance } from './types.js'

export interface BreakerInput {
  /** Load current in amperes. */
  loadA: number
  /** Whether the whole load is continuous (3h+). Applies the 125% factor. Default false. */
  continuous?: boolean
  /** Conductor ampacity available for protection (already derated/capped). When provided, 240.4 is enforced. */
  conductorProtectionAmpacity?: number
  /**
   * Rating floor: pick the smallest standard rating ≥ max(required, this).
   * The caller supplies the reason and its citation (a nameplate minimum, or a
   * code minimum like the 40 A range circuit of 210.19(C)) — the 240.4 guard
   * still applies, so a floored breaker forces `sizeCircuit` to upsize the
   * conductor until it may be protected at the floor.
   */
  minBreakerA?: number
}

export interface BreakerResult extends WithProvenance {
  /** Selected standard rating in amperes. */
  rating: number
  /** Minimum required OCPD current (125% of continuous load). */
  requiredA: number
  /** True when 240.4(B) next-size-up rounding above the conductor ampacity was used. */
  nextSizeUpApplied: boolean
  /** True when the minBreakerA floor raised the rating above what the load alone required. */
  minBreakerApplied: boolean
}

function nextStandardAtOrAbove(amps: number): number | undefined {
  return standardBreakers.ratings.find((r) => r >= amps)
}

export function standardBreaker(input: BreakerInput): BreakerResult {
  const continuous = input.continuous ?? false
  const requiredA = continuous ? input.loadA * 1.25 : input.loadA

  const unfloored = nextStandardAtOrAbove(requiredA)
  const candidate = nextStandardAtOrAbove(Math.max(requiredA, input.minBreakerA ?? 0))
  if (candidate === undefined) {
    throw new EngineError(
      `Required OCPD ${Math.max(requiredA, input.minBreakerA ?? 0)} A exceeds the largest standard rating`,
      `La protección requerida de ${Math.max(requiredA, input.minBreakerA ?? 0)} A excede el valor estándar más grande`,
    )
  }
  const minBreakerApplied = candidate !== unfloored

  const citations: BreakerResult['citations'] = ['nec2026.s240_6_a']
  const assumptions: Assumption[] = []
  if (continuous) {
    citations.push('nec2026.s210_20')
    assumptions.push(ASSUME_CONTINUOUS_125)
  }

  let nextSizeUpApplied = false
  if (input.conductorProtectionAmpacity != null) {
    const ampacity = input.conductorProtectionAmpacity
    const isStandard = standardBreakers.ratings.includes(ampacity)
    // 240.4(B): rounding up to the next standard rating is allowed only when the
    // ampacity doesn't match a standard rating and the OCPD is 800 A or less.
    const maxAllowed =
      isStandard || ampacity > 800 ? ampacity : (nextStandardAtOrAbove(ampacity) ?? ampacity)
    if (candidate > maxAllowed) {
      throw new EngineError(
        `A ${candidate} A breaker would not protect a conductor with ${ampacity} A ampacity (240.4)`,
        `Un térmico de ${candidate} A no protegería un conductor con ampacidad de ${ampacity} A (240.4)`,
      )
    }
    nextSizeUpApplied = candidate > ampacity
    // Cite the next-size-up allowance only when the rounding was actually used.
    if (nextSizeUpApplied) citations.push('nec2026.s240_4_b')
  }

  return { rating: candidate, requiredA, nextSizeUpApplied, minBreakerApplied, citations, assumptions }
}
