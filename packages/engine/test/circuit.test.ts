import { describe, expect, it } from 'vitest'
import { sizeCircuit } from '@nec-assistant/engine'

describe('sizeCircuit (end-to-end)', () => {
  it('mini-split: 24 A MCA (continuous), 15 m, 240 V → 10 AWG Cu THHN + 30 A breaker', () => {
    // Manual check: terminations default to 60°C (110.14(C)(1), ≤100 A circuit).
    // Required at terminations = 24 × 1.25 = 30 A → 12 AWG (20 A @60°C) fails,
    // 10 AWG (30 A @60°C) passes; derated 90°C ampacity 40 A ≥ 24 A.
    // Protection ampacity = min(40, 30, 240.4(D) cap 30) = 30 A → breaker 30 A.
    // Voltage drop = 2 × 24 × 4.07 Ω/km × 0.015 km = 2.93 V = 1.22% ≤ 3%.
    const result = sizeCircuit({
      loadA: 24,
      continuous: true,
      lengthM: 15,
      systemVoltage: 240,
      material: 'copper',
      insulation: 'THHN',
    })
    expect(result.conductor.size).toBe('10')
    expect(result.breaker.rating).toBe(30)
    expect(result.voltageDrop.dropPercent).toBeCloseTo(1.221, 3)
    expect(result.governedBy).toBe('ampacity')
    expect(result.ampacityMinimumSize).toBe('10')
  })

  it('long 120 V run: 16 A, 30 m → voltage drop governs, 8 AWG + 20 A breaker', () => {
    // Ampacity alone allows 12 AWG, but 12 AWG drops 5.2% and 10 AWG 3.26% at 30 m;
    // 8 AWG drops 2.04% ≤ 3%. Breaker: 16 A load → 20 A ≤ protection 40 A (@60°C).
    const result = sizeCircuit({
      loadA: 16,
      lengthM: 30,
      systemVoltage: 120,
      material: 'copper',
      insulation: 'THHN',
    })
    expect(result.conductor.size).toBe('8')
    expect(result.breaker.rating).toBe(20)
    expect(result.governedBy).toBe('voltage-drop')
    expect(result.voltageDrop.dropPercent).toBeLessThanOrEqual(3)
    // The 250.122(B) baseline: ampacity alone needed only 12 AWG.
    expect(result.ampacityMinimumSize).toBe('12')
  })

  it('merges citations and assumptions from all stages', () => {
    const result = sizeCircuit({
      loadA: 24,
      continuous: true,
      lengthM: 15,
      systemVoltage: 240,
      material: 'copper',
      insulation: 'THHN',
    })
    expect(result.citations).toContain('nec2026.t310_16')
    expect(result.citations).toContain('nec2026.ch9_t8')
    expect(result.citations).toContain('nec2026.s240_6_a')
    const keys = result.assumptions.map((a) => a.key)
    expect(keys).toContain('dc-resistance-pf1')
    expect(keys).toContain('continuous-125')
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('minBreakerA floor upsizes the conductor until it may be protected (estufa: 33.3 A, floor 40 A)', () => {
    // Manual check: without the floor, 33.3 A → 10 AWG (protection capped 30 A by
    // 240.4(D)) fails 35 A… actually 10 AWG protection 30 < 33.3 already fails;
    // 8 AWG: 60°C termination 40 A, protection 40 → breaker 40 = floor. The floor
    // makes the 40 A pick explicit and flags it when the load alone needed 35.
    const result = sizeCircuit({
      loadA: 33.3,
      lengthM: 6,
      systemVoltage: 240,
      material: 'copper',
      insulation: 'THHN',
      minBreakerA: 40,
    })
    expect(result.conductor.size).toBe('8')
    expect(result.breaker.rating).toBe(40)
    expect(result.breaker.minBreakerApplied).toBe(true)
  })
})
