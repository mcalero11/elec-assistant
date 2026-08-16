import { describe, expect, it } from 'vitest'
import { EngineError, egcSize, type EgcInput } from '@elec-assistant/engine'
import golden from './golden/egc.json'

describe('egcSize (golden)', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const result = egcSize(c.input as EgcInput)
      expect(result.size).toBe(c.expected.size)
      expect(result.citations).toContain('nec2026.t250_122')
      expect(result.assumptions.some((a) => a.key === 'egc-not-upsized')).toBe(true)
    })
  }
})

describe('egcSize (errors)', () => {
  it('rejects a non-positive OCPD rating', () => {
    expect(() => egcSize({ ocpdA: 0, material: 'copper' })).toThrow(EngineError)
    expect(() => egcSize({ ocpdA: -20, material: 'copper' })).toThrow(EngineError)
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
