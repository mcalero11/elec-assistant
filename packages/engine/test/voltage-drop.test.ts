import { describe, expect, it } from 'vitest'
import {
  isNonCompliant,
  minSizeForVoltageDrop,
  voltageDrop,
  type MinSizeForVoltageDropInput,
  type VoltageDropInput,
} from '@nec-assistant/engine'
import golden from './golden/voltage-drop.json'

describe('voltageDrop (golden)', () => {
  for (const c of golden.drops) {
    it(c.name, () => {
      const result = voltageDrop(c.input as VoltageDropInput)
      expect(result.dropVolts).toBeCloseTo(c.expected.dropVolts, 4)
      expect(result.dropPercent).toBeCloseTo(c.expected.dropPercent, 4)
      expect(result.citations).toContain('nec2026.ch9_t8')
    })
  }
})

describe('minSizeForVoltageDrop (golden)', () => {
  for (const c of golden.minSizes) {
    it(c.name, () => {
      const result = minSizeForVoltageDrop(c.input as MinSizeForVoltageDropInput)
      expect(result.size).toBe(c.expected.size)
      expect(result.dropPercent).toBeCloseTo(c.expected.dropPercent, 4)
      expect(result.dropPercent).toBeLessThanOrEqual(3)
    })
  }

  it('returns the largest size, marked, when no size can meet the target', () => {
    const result = minSizeForVoltageDrop({
      currentA: 400,
      lengthM: 2000,
      material: 'copper',
      systemVoltage: 120,
      maxDropPercent: 1,
    })
    // Best effort, not a refusal: the biggest wire we have, plus why it still misses.
    expect(result.size).toBe('600')
    expect(result.dropPercent).toBeGreaterThan(1)
    const deviation = result.deviations.find((d) => d.key === 'voltage-drop-over-limit')
    expect(deviation).toBeDefined()
    expect(deviation?.citations).toContain('nec2026.in210_19_vd')
    // The 3% guidance is an Informational Note — exceeding it is not «no cumple».
    expect(deviation?.severity).toBe('recommendation')
    expect(isNonCompliant(result)).toBe(false)
  })

  it('emits no deviation when the run is inside the limit', () => {
    const result = minSizeForVoltageDrop({
      currentA: 16,
      lengthM: 30,
      material: 'copper',
      systemVoltage: 120,
    })
    expect(result.deviations).toEqual([])
  })
})
