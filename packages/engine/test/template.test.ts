import { describe, expect, it } from 'vitest'
import { acMinisplitTemplate, type JobTemplate } from '@elec-assistant/data'
import { EngineError, resolveTemplateState, runTemplate } from '@elec-assistant/engine'

const baseAnswers = {
  device: { id: 'ac-36k', mcaA: 24, mocpA: 40 },
  runLengthM: 15,
  location: 'exterior',
  panelSlots: '2polos',
}

describe('ambient temperature question', () => {
  it('defaults from the location answer: exterior → 40°C, interior → 35°C', () => {
    const exterior = runTemplate(acMinisplitTemplate, { answers: baseAnswers })
    const extAmbient = exterior.assumptions.find((a) => a.key === 'ambient-used')
    expect(extAmbient?.es).toContain('40 °C')

    const interior = runTemplate(acMinisplitTemplate, {
      answers: { ...baseAnswers, location: 'interior' },
    })
    const intAmbient = interior.assumptions.find((a) => a.key === 'ambient-used')
    expect(intAmbient?.es).toContain('35 °C')
  })

  it('an explicit ambientC answer overrides the location default', () => {
    const result = runTemplate(acMinisplitTemplate, {
      answers: { ...baseAnswers, ambientC: 45 },
    })
    expect(result.assumptions.find((a) => a.key === 'ambient-used')?.es).toContain('45 °C')
  })

  it('conductor line cites ambient correction (40°C) but not bundling (2 CCC)', () => {
    const result = runTemplate(acMinisplitTemplate, { answers: baseAnswers })
    const conductor = result.parameters.find((p) => p.id === 'conductor')
    expect(conductor?.citations).toContain('nec2026.t310_16')
    expect(conductor?.citations).toContain('nec2026.t310_15_b_1')
    expect(conductor?.citations).not.toContain('nec2026.t310_15_c_1')
  })
})

// Golden fixtures run in template-golden.test.ts, registry-driven over allTemplates.

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

  it('exposes raw engine-call results in declaration order (memoria source)', () => {
    const result = runTemplate(acMinisplitTemplate, { answers: baseAnswers })
    expect(result.calls.map((c) => ({ id: c.id, fn: c.fn }))).toEqual([
      { id: 'circuit', fn: 'sizeCircuit' },
      { id: 'egc', fn: 'egcSize' },
      { id: 'conduit', fn: 'sizeConduit' },
    ])
    const circuit = result.calls[0]
    if (circuit?.fn !== 'sizeCircuit') expect.unreachable('first call must be the circuit')
    else {
      expect(['ampacity', 'voltage-drop', 'protection']).toContain(circuit.result.governedBy)
      expect(circuit.result.breaker.rating).toBeGreaterThan(0)
    }
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

/* ------------------------- interpreter v2 primitives ------------------------- */

const L = { es: 'x', en: 'x' }

/** Synthetic template exercising $calc, neq/lt, derived 'value', perCount, and choice ValueSpec defaults. */
const miniTemplate: JobTemplate = {
  id: 'test-mini',
  version: 1,
  name: L,
  synonyms: [],
  questions: [
    { id: 'watts', type: 'number', unit: 'W', min: 100, max: 10000, step: 100, default: 4400, label: L },
    {
      id: 'voltage',
      type: 'choice',
      // Choice defaults may be ValueSpecs referencing earlier answers.
      default: { $cond: { if: { ref: 'answers.watts', gte: 5000 }, then: '240', else: '120' } },
      choices: [
        { value: '120', label: L },
        { value: '240', label: L },
      ],
      label: L,
    },
    { id: 'points', type: 'number', unit: '', min: 1, max: 10, step: 1, default: 4, label: L },
  ],
  options: [],
  calls: [],
  derived: [
    {
      id: 'amps',
      kind: 'value',
      value: {
        $calc: {
          op: 'round',
          args: [
            {
              $calc: {
                op: 'div',
                args: [
                  { $ref: 'answers.watts' },
                  { $cond: { if: { ref: 'answers.voltage', eq: '240' }, then: 240, else: 120 } },
                ],
              },
            },
            1,
          ],
        },
      },
      label: L,
    },
  ],
  parameters: [{ id: 'amps', label: L, value: { $ref: 'derived.amps.value' }, citations: ['nec2026.s240_6_a'] }],
  bom: [
    { id: 'per-point', item: { itemId: 'pvc-cement' }, qty: { perCount: { count: 'answers.points', each: 2, plus: 1 } } },
    // Negative plus expresses «all but one»; when few points, the lt condition gates it.
    {
      id: 'few-points-extra',
      when: [{ ref: 'answers.points', lt: 3 }],
      item: { itemId: 'pvc-cement' },
      qty: { perCount: { count: 'answers.points', plus: -1 } },
    },
  ],
  warnings: [
    {
      id: 'high-amps-120',
      when: [
        { ref: 'answers.voltage', neq: '240' },
        { ref: 'derived.amps.value', gte: 30 },
      ],
      text: L,
    },
  ],
  assumptions: [{ key: 'static-note', en: 'x', es: 'x' }],
}

describe('interpreter v2 primitives', () => {
  it('$calc div/round with a choice ValueSpec default: 4400 W defaults to 120 V → 36.7 A', () => {
    const result = runTemplate(miniTemplate, { answers: {} })
    expect(result.parameters.find((p) => p.id === 'amps')?.value).toBe(36.7)
  })

  it('choice default flips with the earlier answer: 6000 W → 240 V → 25 A', () => {
    const result = runTemplate(miniTemplate, { answers: { watts: 6000 } })
    expect(result.parameters.find((p) => p.id === 'amps')?.value).toBe(25)
  })

  it('neq + gte warning array is an AND: fires at 120 V/36.7 A, not at 240 V', () => {
    expect(runTemplate(miniTemplate, { answers: {} }).warnings.map((w) => w.id)).toEqual([
      'high-amps-120',
    ])
    expect(runTemplate(miniTemplate, { answers: { voltage: '240' } }).warnings).toEqual([])
  })

  it('perCount: qty = count × each + plus (4 points → 9); lt gates the extra rule', () => {
    const four = runTemplate(miniTemplate, { answers: {} })
    expect(four.bom.find((l) => l.ruleId === 'per-point')?.qty).toBe(9)
    expect(four.bom.some((l) => l.ruleId === 'few-points-extra')).toBe(false)

    const two = runTemplate(miniTemplate, { answers: { points: 2 } })
    expect(two.bom.find((l) => l.ruleId === 'few-points-extra')?.qty).toBe(1)

    // count 1 → 1 - 1 = 0 → zero-qty line dropped.
    const one = runTemplate(miniTemplate, { answers: { points: 1 } })
    expect(one.bom.some((l) => l.ruleId === 'few-points-extra')).toBe(false)
  })

  it('template-level assumptions merge into the result', () => {
    const result = runTemplate(miniTemplate, { answers: {} })
    expect(result.assumptions.map((a) => a.key)).toContain('static-note')
  })

  it('$calc division by zero throws a bilingual EngineError', () => {
    const bad: JobTemplate = {
      ...miniTemplate,
      parameters: [
        { id: 'x', label: L, value: { $calc: { op: 'div', args: [1, 0] } }, citations: ['nec2026.s240_6_a'] },
      ],
    }
    try {
      runTemplate(bad, { answers: {} })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError)
      expect((e as EngineError).es.length).toBeGreaterThan(0)
    }
  })

  it('resolveTemplateState exposes effective defaults and disabled options', () => {
    const state = resolveTemplateState(miniTemplate, { answers: { watts: 6000 } })
    expect(state.answers['voltage']).toBe('240')
    expect(state.answers['points']).toBe(4)

    const acState = resolveTemplateState(acMinisplitTemplate, {
      answers: baseAnswers,
      options: { conduitType: 'lfnc', bends: 'dobladora' },
    })
    // LFNC disables both the bends choice and the bend count (neither applies).
    expect(acState.disabledOptionIds).toEqual(['bends', 'bendCount'])
    expect(acState.options['bends']).toBe('curvas') // forced back to default
    expect(acState.answers['ambientC']).toBe(40) // location-aware default
  })
})
