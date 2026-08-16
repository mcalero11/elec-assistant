import { describe, expect, it } from 'vitest'
import { acMinisplitTemplate } from '@elec-assistant/data'
import { EngineError, runTemplate } from '@elec-assistant/engine'
import golden from './golden/template-ac-minisplit.json'

const baseAnswers = {
  device: { id: 'ac-36k', mcaA: 24, mocpA: 40 },
  runLengthM: 15,
  location: 'exterior',
  panelSlots: '2polos',
}

describe('runTemplate ac-minisplit (golden)', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const result = runTemplate(acMinisplitTemplate, {
        answers: c.answers,
        options: c.options,
      })

      const byId = new Map(result.parameters.map((p) => [p.id, p]))
      for (const [id, value] of Object.entries(c.expected.parameters)) {
        expect(byId.get(id)?.value, `parameter ${id}`).toBe(value)
      }
      expect(byId.get('drop')?.value as number).toBeCloseTo(c.expected.dropPercent, 3)

      // Every parameter line must carry at least one citation (PRD: cited outputs).
      for (const p of result.parameters) {
        expect(p.citations.length, `citations of ${p.id}`).toBeGreaterThan(0)
      }

      expect(
        result.bom.map((line) => ({
          ruleId: line.ruleId,
          itemId: line.itemId,
          qty: line.qty,
          ...(line.optional ? { optional: true } : {}),
        })),
      ).toEqual(c.expected.bom)

      const keys = new Set(result.assumptions.map((a) => a.key))
      for (const k of c.expected.assumptionKeys) {
        expect(keys.has(k), `assumption ${k}`).toBe(true)
      }
      for (const k of c.expected.absentAssumptionKeys) {
        expect(keys.has(k), `assumption ${k} should be absent`).toBe(false)
      }
      expect(result.warnings.length).toBe(c.expected.warningCount)
    })
  }
})

describe('runTemplate mechanics', () => {
  it('fires the panel-space warning', () => {
    const result = runTemplate(acMinisplitTemplate, {
      answers: { ...baseAnswers, panelSlots: 'ninguno' },
      options: {},
    })
    expect(result.warnings.map((w) => w.id)).toEqual(['panel-space'])
  })

  it('falls back to option defaults when options are omitted', () => {
    const result = runTemplate(acMinisplitTemplate, { answers: baseAnswers })
    // defaults: emt + curvas + 3 bends → elbow line present
    expect(result.bom.some((l) => l.ruleId === 'emt-elbows' && l.qty === 3)).toBe(true)
  })

  it('forces a disabled option back to its default (stale URL state)', () => {
    // lfnc disables the bends option; a smuggled «dobladora» must not add a bender.
    const result = runTemplate(acMinisplitTemplate, {
      answers: baseAnswers,
      options: { conduitType: 'lfnc', bends: 'dobladora' },
    })
    expect(result.bom.some((l) => l.ruleId === 'bender')).toBe(false)
  })

  it('drops zero-quantity lines (bendCount 0)', () => {
    const result = runTemplate(acMinisplitTemplate, {
      answers: baseAnswers,
      options: { bendCount: 0 },
    })
    expect(result.bom.some((l) => l.ruleId === 'emt-elbows')).toBe(false)
  })

  it('rejects a missing preset answer with a bilingual EngineError', () => {
    try {
      runTemplate(acMinisplitTemplate, { answers: { runLengthM: 10 }, options: {} })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError)
      expect((e as EngineError).es.length).toBeGreaterThan(0)
    }
  })

  it('rejects unknown refs and unknown engine functions', () => {
    expect(() =>
      runTemplate(
        { ...acMinisplitTemplate, parameters: [{ id: 'x', label: { es: 'x', en: 'x' }, value: { $ref: 'calls.nope.value' } }] },
        { answers: baseAnswers },
      ),
    ).toThrow(EngineError)
    expect(() =>
      runTemplate(
        { ...acMinisplitTemplate, calls: [{ id: 'c', fn: 'notAFunction', input: {} }] },
        { answers: baseAnswers },
      ),
    ).toThrow(EngineError)
  })

  it('propagates engine errors from the call graph (load beyond 600 kcmil)', () => {
    expect(() =>
      runTemplate(acMinisplitTemplate, {
        answers: { ...baseAnswers, device: { mcaA: 900, mocpA: 900 } },
      }),
    ).toThrow(EngineError)
  })

  it('merges citations across the whole run', () => {
    const result = runTemplate(acMinisplitTemplate, { answers: baseAnswers })
    for (const key of ['nec2026.t310_16', 'nec2026.ch9_t4', 'nec2026.t250_122', 'nec2026.s440_14', 'nec2026.s358_30']) {
      expect(result.citations).toContain(key)
    }
  })
})
