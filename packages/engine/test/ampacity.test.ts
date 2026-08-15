import { describe, expect, it } from 'vitest'
import {
  EngineError,
  deratedAmpacity,
  minConductorForLoad,
  type DeratedAmpacityInput,
  type MinConductorInput,
} from '@elec-assistant/engine'
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
