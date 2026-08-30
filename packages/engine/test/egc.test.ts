import { describe, expect, it } from 'vitest'
import { EngineError, egcSize, type EgcInput } from '@nec-assistant/engine'
import golden from './golden/egc.json'

describe('egcSize (golden)', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const result = egcSize(c.input as EgcInput)
      expect(result.size).toBe(c.expected.size)
      expect(result.tableSize).toBe(c.expected.tableSize)
      expect(result.upsized).toBe(c.expected.upsized)
      expect(result.citations).toContain('nec2026.t250_122')
      if (c.expected.upsized) {
        expect(result.citations).toContain('nec2026.s250_122_b')
      } else {
        expect(result.citations).not.toContain('nec2026.s250_122_b')
      }
      const keys = new Set(result.assumptions.map((a) => a.key))
      for (const key of c.expected.assumptionKeys) {
        expect(keys.has(key), `assumption ${key}`).toBe(true)
      }
      for (const key of c.expected.absentAssumptionKeys) {
        expect(keys.has(key), `assumption ${key} should be absent`).toBe(false)
      }
    })
  }
})

describe('egcSize (errors)', () => {
  it('rejects a non-positive OCPD rating', () => {
    expect(() => egcSize({ ocpdA: 0, material: 'copper' })).toThrow(EngineError)
    expect(() => egcSize({ ocpdA: -20, material: 'copper' })).toThrow(EngineError)
  })

  it('rejects one-sided installed/required input (masks template ref typos otherwise)', () => {
    expect(() => egcSize({ ocpdA: 30, material: 'copper', installedSize: '8' })).toThrow(
      EngineError,
    )
    expect(() => egcSize({ ocpdA: 30, material: 'copper', requiredSize: '10' })).toThrow(
      EngineError,
    )
  })

  it('throws a bilingual EngineError above the transcribed range', () => {
    try {
      egcSize({ ocpdA: 4000, material: 'copper' })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError)
      expect((e as EngineError).es.length).toBeGreaterThan(0)
    }
  })
})
