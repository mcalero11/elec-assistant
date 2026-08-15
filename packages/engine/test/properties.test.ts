import { describe, expect, it } from 'vitest'
import { CONDUCTOR_SIZES, table31016 } from '@elec-assistant/data'
import {
  cccFactor,
  deratedAmpacity,
  minConductorForLoad,
  minSizeForVoltageDrop,
  standardBreaker,
} from '@elec-assistant/engine'

describe('monotonicity properties', () => {
  it('larger conductors never have lower derated ampacity (Cu THHN)', () => {
    let previous = 0
    for (const size of CONDUCTOR_SIZES) {
      if (!table31016.copper[size]) continue
      const { ampacity } = deratedAmpacity({ size, material: 'copper', insulation: 'THHN' })
      expect(ampacity).toBeGreaterThanOrEqual(previous)
      previous = ampacity
    }
  })

  it('more current-carrying conductors never increase the adjustment factor', () => {
    let previous = 1
    for (let ccc = 1; ccc <= 45; ccc++) {
      const factor = cccFactor(ccc)
      expect(factor).toBeLessThanOrEqual(previous)
      previous = factor
    }
  })

  it('longer runs never allow a smaller conductor for voltage drop', () => {
    let previousIndex = 0
    for (let lengthM = 10; lengthM <= 200; lengthM += 10) {
      const { size } = minSizeForVoltageDrop({
        currentA: 16,
        lengthM,
        material: 'copper',
        systemVoltage: 120,
      })
      const index = CONDUCTOR_SIZES.indexOf(size)
      expect(index).toBeGreaterThanOrEqual(previousIndex)
      previousIndex = index
    }
  })

  it('breaker rating always covers the required load', () => {
    for (let loadA = 1; loadA <= 100; loadA++) {
      expect(standardBreaker({ loadA }).rating).toBeGreaterThanOrEqual(loadA)
      expect(standardBreaker({ loadA, continuous: true }).rating).toBeGreaterThanOrEqual(
        loadA * 1.25,
      )
    }
  })

  it('selected conductor always satisfies both load checks', () => {
    for (let loadA = 10; loadA <= 90; loadA += 5) {
      const result = minConductorForLoad({ loadA, material: 'copper', insulation: 'THHN' })
      expect(result.deratedAmpacity).toBeGreaterThanOrEqual(loadA)
      expect(result.terminationAmpacity).toBeGreaterThanOrEqual(result.requiredTermination)
    }
  })
})
