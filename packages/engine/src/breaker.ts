import { standardBreakers } from '@elec-assistant/data'
import { EngineError, type Assumption, type WithProvenance } from './types.js'

export interface BreakerInput {
  /** Load current in amperes. */
  loadA: number
  /** Whether the whole load is continuous (3h+). Applies the 125% factor. Default false. */
  continuous?: boolean
  /** Conductor ampacity available for protection (already derated/capped). When provided, 240.4 is enforced. */
  conductorProtectionAmpacity?: number
}

export interface BreakerResult extends WithProvenance {
  /** Selected standard rating in amperes. */
  rating: number
  /** Minimum required OCPD current (125% of continuous load). */
  requiredA: number
  /** True when 240.4(B) next-size-up rounding above the conductor ampacity was used. */
  nextSizeUpApplied: boolean
}

function nextStandardAtOrAbove(amps: number): number | undefined {
  return standardBreakers.ratings.find((r) => r >= amps)
}

export function standardBreaker(input: BreakerInput): BreakerResult {
  const continuous = input.continuous ?? false
  const requiredA = continuous ? input.loadA * 1.25 : input.loadA

  const candidate = nextStandardAtOrAbove(requiredA)
  if (candidate === undefined) {
    throw new EngineError(
      `Required OCPD ${requiredA} A exceeds the largest standard rating`,
      `La protección requerida de ${requiredA} A excede el valor estándar más grande`,
    )
  }

  const citations: BreakerResult['citations'] = ['nec2026.s240_6_a']
  const assumptions: Assumption[] = []
  if (continuous) {
    citations.push('nec2026.s210_20')
    assumptions.push({
      key: 'continuous-125',
      en: 'Load treated as 100% continuous: 125% factor applied per 210.20(A).',
      es: 'Carga tratada como 100% continua: se aplicó el factor de 125% según 210.20(A).',
    })
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
    citations.push('nec2026.s240_4_b')
  }

  return { rating: candidate, requiredA, nextSizeUpApplied, citations, assumptions }
}
