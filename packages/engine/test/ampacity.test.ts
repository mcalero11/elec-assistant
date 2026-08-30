import { describe, expect, it } from 'vitest'
import {
  EngineError,
  deratedAmpacity,
  minConductorForLoad,
  type DeratedAmpacityInput,
  type MinConductorInput,
} from '@nec-assistant/engine'
import ampacityGolden from './golden/ampacity.json'
import minConductorGolden from './golden/min-conductor.json'

describe('deratedAmpacity (golden)', () => {
  for (const c of ampacityGolden.cases) {
    it(c.name, () => {
      const result = deratedAmpacity(c.input as DeratedAmpacityInput)
      expect(result.baseAmpacity).toBe(c.expected.baseAmpacity)
      expect(result.ampacity).toBeCloseTo(c.expected.ampacity, 6)
      expect(result.citations).toContain('nec2026.t310_16')
    })
  }

  it('cites only tables whose factor changed the result (30°C, ≤3 CCC → base table alone)', () => {
    const r = deratedAmpacity({
      size: '10',
      material: 'copper',
      insulation: 'THHN',
      ambientC: 30,
      cccCount: 2,
    })
    expect(r.citations).toEqual(['nec2026.t310_16'])
  })

  it('cites the ambient correction table only when the factor ≠ 1', () => {
    const hot = deratedAmpacity({ size: '10', material: 'copper', insulation: 'THHN', ambientC: 40, cccCount: 2 })
    expect(hot.citations).toContain('nec2026.t310_15_b_1')
    expect(hot.citations).not.toContain('nec2026.t310_15_c_1')
  })

  it('cites the bundling adjustment table only above 3 CCC', () => {
    const bundled = deratedAmpacity({ size: '10', material: 'copper', insulation: 'THHN', ambientC: 30, cccCount: 6 })
    expect(bundled.citations).toContain('nec2026.t310_15_c_1')
    expect(bundled.citations).not.toContain('nec2026.t310_15_b_1')
  })

  it('always surfaces the ambient temperature the calculation used', () => {
    const defaulted = deratedAmpacity({ size: '10', material: 'copper', insulation: 'THHN' })
    expect(defaulted.assumptions.some((a) => a.key === 'ambient-30c')).toBe(true)

    const provided = deratedAmpacity({ size: '10', material: 'copper', insulation: 'THHN', ambientC: 40 })
    const ambient = provided.assumptions.find((a) => a.key === 'ambient-used')
    expect(ambient?.es).toContain('40 °C')
    expect(ambient?.es).toContain('91%')
    expect(ambient?.citations).toContain('nec2026.t310_15_b_1')
  })

  it('rejects ambient temperatures the insulation cannot survive', () => {
    expect(() =>
      deratedAmpacity({ size: '12', material: 'copper', insulation: 'TW', ambientC: 60 }),
    ).toThrow(EngineError)
  })

  it('rejects sizes not listed for the material (14 AWG aluminum)', () => {
    expect(() =>
      deratedAmpacity({ size: '14', material: 'aluminum', insulation: 'THHN' }),
    ).toThrow(EngineError)
  })
})

describe('minConductorForLoad (golden)', () => {
  for (const c of minConductorGolden.cases) {
    it(c.name, () => {
      const result = minConductorForLoad(c.input as MinConductorInput)
      expect(result.size).toBe(c.expected.size)
      expect(result.protectionAmpacity).toBeCloseTo(c.expected.protectionAmpacity, 6)
      expect(result.requiredTermination).toBeCloseTo(c.expected.requiredTermination, 6)
      expect(result.satisfiesLoad).toBe(true)
    })
  }

  it('records the terminal-rating assumption when defaulted', () => {
    const result = minConductorForLoad({ loadA: 24, material: 'copper', insulation: 'THHN' })
    expect(result.assumptions.some((a) => a.key === 'terminal-rating-default')).toBe(true)
  })
})
