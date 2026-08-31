import { describe, expect, it } from 'vitest'
import { isNonCompliant, standardBreaker, type BreakerInput } from '@nec-assistant/engine'
import golden from './golden/breaker.json'

describe('standardBreaker (golden)', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const result = standardBreaker(c.input as BreakerInput)
      expect(result.rating).toBe(c.expected.rating)
      expect(result.nextSizeUpApplied).toBe(c.expected.nextSizeUpApplied)
      expect(result.citations).toContain('nec2026.s240_6_a')
    })
  }

  it('marks a breaker the conductor cannot support (50 A load on a 40 A conductor)', () => {
    // 40 A is not standard-matched here: next-up allowance tops out at 45 A < required 50 A.
    const result = standardBreaker({ loadA: 50, conductorProtectionAmpacity: 40 })
    expect(result.rating).toBe(50)
    expect(result.protectsConductor).toBe(false)
    // An off-code result must not claim the 240.4(B) rounding as its authority.
    expect(result.nextSizeUpApplied).toBe(false)
    expect(result.citations).not.toContain('nec2026.s240_4_b')
    const deviation = result.deviations.find((d) => d.key === 'ocpd-exceeds-conductor')
    expect(deviation?.severity).toBe('off-code')
    expect(deviation?.citations).toContain('nec2026.s240_4')
    expect(isNonCompliant(result)).toBe(true)
  })

  it('protects and emits nothing on an ordinary in-code pairing', () => {
    const result = standardBreaker({ loadA: 20, conductorProtectionAmpacity: 30 })
    expect(result.protectsConductor).toBe(true)
    expect(result.deviations).toEqual([])
    expect(isNonCompliant(result)).toBe(false)
  })
})

describe('standardBreaker minBreakerA floor', () => {
  it('raises the rating to the floor and flags it (33.3 A load, 40 A floor → 40, not 35)', () => {
    const result = standardBreaker({ loadA: 33.3, minBreakerA: 40 })
    expect(result.rating).toBe(40)
    expect(result.minBreakerApplied).toBe(true)
  })

  it('a floor below the load requirement changes nothing', () => {
    const result = standardBreaker({ loadA: 33.3, minBreakerA: 20 })
    expect(result.rating).toBe(35)
    expect(result.minBreakerApplied).toBe(false)
  })

  it('the 240.4 check still marks a floored breaker the conductor cannot support', () => {
    // Floor forces 40 A, but a 30 A conductor (standard-matched) allows at most 30 A.
    const result = standardBreaker({ loadA: 20, minBreakerA: 40, conductorProtectionAmpacity: 30 })
    expect(result.rating).toBe(40)
    expect(result.minBreakerApplied).toBe(true)
    expect(result.protectsConductor).toBe(false)
    expect(result.deviations.map((d) => d.key)).toContain('ocpd-exceeds-conductor')
  })

  it('a required rating above the 240.6(A) ladder returns the largest, marked', () => {
    const result = standardBreaker({ loadA: 9000 })
    expect(result.rating).toBe(6000)
    const deviation = result.deviations.find((d) => d.key === 'ocpd-above-standard-ratings')
    expect(deviation?.severity).toBe('off-code')
  })
})
