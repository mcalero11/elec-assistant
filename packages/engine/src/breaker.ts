import { standardBreakers } from '@nec-assistant/data'
import {
  ASSUME_CONTINUOUS_125,
  type Assumption,
  type Deviation,
  type WithProvenance,
} from './types.js'

export interface BreakerInput {
  /** Load current in amperes. */
  loadA: number
  /** Whether the whole load is continuous (3h+). Applies the 125% factor. Default false. */
  continuous?: boolean
  /** Conductor ampacity available for protection (already derated/capped). When provided, 240.4 is evaluated. */
  conductorProtectionAmpacity?: number
  /**
   * Rating floor: pick the smallest standard rating ≥ max(required, this).
   * The caller supplies the reason and its citation (a nameplate minimum, or a
   * code minimum like the 40 A range circuit of 210.19(C)) — 240.4 is still
   * evaluated, so a floored breaker makes `sizeCircuit` upsize the conductor
   * until it may be protected at the floor.
   */
  minBreakerA?: number
  /**
   * Nameplate MOCP (maximum overcurrent protection). Present ⇒ Article 440
   * governs this circuit, which changes two things:
   *
   *  - 240.4(G) routes A/C and refrigeration conductors out of the general
   *    240.4(B)/(D) rules, so the device may exceed the conductor's ampacity
   *    and the protection check below does not apply.
   *  - 440.22 sizes the device from the nameplate maximum rather than from the
   *    load, because it must ride through locked-rotor inrush at start. Picking
   *    the smallest rating that merely covers the MCA is what makes a
   *    compressor trip its breaker on a hot afternoon.
   */
  mocpA?: number
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
  /**
   * 240.4: does this rating actually protect the conductor? Always true when
   * `conductorProtectionAmpacity` was not supplied (nothing to evaluate) or
   * when `mocpA` puts the circuit under Article 440, where 240.4(G) means the
   * check does not apply. `sizeCircuit` reads this to skip a candidate — it
   * used to be a thrown EngineError caught as a search signal.
   */
  protectsConductor: boolean
  /** True when the rating came from the nameplate MOCP under 440.22. */
  fromMocp: boolean
}

function deviationMocpBelowLoad(mocpA: number, requiredA: number): Deviation {
  return {
    key: 'mocp-below-required',
    en: `The nameplate MOCP of ${mocpA} A is below the ${requiredA.toFixed(1)} A this circuit needs. Check the plate: MCA and MOCP disagree, or the wrong unit was selected.`,
    es: `El MOCP de placa de ${mocpA} A queda por debajo de los ${requiredA.toFixed(1)} A que necesita este circuito. Revise la placa: el MCA y el MOCP no concuerdan, o se eligió otro equipo.`,
    citations: ['nec2026.s440_22', 'nec2026.s440_4_b'],
    severity: 'off-code',
  }
}

function deviationOcpdExceedsConductor(rating: number, ampacity: number): Deviation {
  return {
    key: 'ocpd-exceeds-conductor',
    en: `A ${rating} A breaker does not protect a conductor with ${ampacity} A of ampacity. The wire can overheat before the breaker trips — outside the code.`,
    es: `Un térmico de ${rating} A no protege un conductor con ampacidad de ${ampacity} A. El alambre puede recalentarse antes de que el térmico dispare — fuera de norma.`,
    citations: ['nec2026.s240_4', 'nec2026.s240_6_a'],
    severity: 'off-code',
  }
}

function deviationOcpdAboveLadder(requiredA: number, largest: number): Deviation {
  const required = requiredA.toFixed(1)
  return {
    key: 'ocpd-above-standard-ratings',
    en: `The required ${required} A of protection is above the largest standard rating (${largest} A). ${largest} A is shown; at that scale the job needs engineering design.`,
    es: `La protección requerida de ${required} A supera el valor estándar más grande (${largest} A). Se muestra ${largest} A; a esa escala el trabajo requiere diseño de ingeniería.`,
    citations: ['nec2026.s240_6_a'],
    severity: 'off-code',
  }
}

function nextStandardAtOrAbove(amps: number): number | undefined {
  return standardBreakers.ratings.find((r) => r >= amps)
}

/**
 * Total by construction — it never throws. Both former throw sites (a required
 * rating above the 240.6(A) ladder, and a 240.4 protection mismatch) now return
 * the best available rating plus a deviation, which is what lets `sizeCircuit`
 * read a flag instead of catching an error as a search signal.
 */
export function standardBreaker(input: BreakerInput): BreakerResult {
  const continuous = input.continuous ?? false
  const requiredA = continuous ? input.loadA * 1.25 : input.loadA
  const floored = Math.max(requiredA, input.minBreakerA ?? 0)
  const ratings = standardBreakers.ratings
  const largest = ratings[ratings.length - 1]!

  const unfloored = nextStandardAtOrAbove(requiredA) ?? largest
  const atOrAboveFloor = nextStandardAtOrAbove(floored)

  const citations: BreakerResult['citations'] = ['nec2026.s240_6_a']
  const assumptions: Assumption[] = []
  const deviations: Deviation[] = []
  if (continuous) {
    citations.push('nec2026.s210_20')
    assumptions.push(ASSUME_CONTINUOUS_125)
  }

  // Article 440 path: the device comes from the nameplate maximum so it can ride
  // through starting inrush, and 240.4(G) exempts the conductor from the general
  // 240.4 protection rule.
  if (input.mocpA != null) {
    const mocpA = input.mocpA
    const largestAtOrBelowMocp = [...ratings].reverse().find((r) => r <= mocpA)
    const rating = largestAtOrBelowMocp ?? ratings[0]!
    citations.push('nec2026.s440_22', 'nec2026.s240_4_g')
    if (rating < floored) deviations.push(deviationMocpBelowLoad(mocpA, floored))
    return {
      rating,
      requiredA,
      nextSizeUpApplied: false,
      minBreakerApplied: false,
      protectsConductor: true,
      fromMocp: true,
      citations,
      assumptions,
      deviations,
    }
  }

  const candidate = atOrAboveFloor ?? largest
  const minBreakerApplied = candidate !== unfloored
  if (atOrAboveFloor === undefined) deviations.push(deviationOcpdAboveLadder(floored, largest))

  let nextSizeUpApplied = false
  let protectsConductor = true
  if (input.conductorProtectionAmpacity != null) {
    const ampacity = input.conductorProtectionAmpacity
    const isStandard = ratings.includes(ampacity)
    // 240.4(B): rounding up to the next standard rating is allowed only when the
    // ampacity doesn't match a standard rating and the OCPD is 800 A or less.
    const maxAllowed =
      isStandard || ampacity > 800 ? ampacity : (nextStandardAtOrAbove(ampacity) ?? ampacity)
    protectsConductor = candidate <= maxAllowed
    // Only a protecting breaker may claim the 240.4(B) rounding: an off-code
    // result must not cite the allowance as if it authorized it.
    nextSizeUpApplied = protectsConductor && candidate > ampacity
    if (nextSizeUpApplied) citations.push('nec2026.s240_4_b')
    if (!protectsConductor) deviations.push(deviationOcpdExceedsConductor(candidate, ampacity))
  }

  return {
    rating: candidate,
    requiredA,
    nextSizeUpApplied,
    minBreakerApplied,
    protectsConductor,
    fromMocp: false,
    citations,
    assumptions,
    deviations,
  }
}
