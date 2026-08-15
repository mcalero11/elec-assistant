import { describe, expect, it } from 'vitest'
import {
  EngineError,
  minSizeForVoltageDrop,
  voltageDrop,
  type MinSizeForVoltageDropInput,
  type VoltageDropInput,
} from '@elec-assistant/engine'
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

  it('throws when no size can meet the target', () => {
    expect(() =>
      minSizeForVoltageDrop({
        currentA: 400,
        lengthM: 2000,
        material: 'copper',
        systemVoltage: 120,
        maxDropPercent: 1,
      }),
    ).toThrow(EngineError)
  })
})
