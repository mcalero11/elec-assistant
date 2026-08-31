import { describe, expect, it } from 'vitest'
import {
  UI_OWNED_PRACTICE_KEYS,
  allTemplates,
  localPracticeNotes,
  presetCatalogs,
} from '@nec-assistant/data'
import {
  DEVIATION_KEYS,
  boxFill,
  conduitFill,
  deratedAmpacity,
  egcSize,
  evaluateConductor,
  gecSize,
  isNonCompliant,
  mergeDeviations,
  minConductorForLoad,
  minSizeForVoltageDrop,
  residentialLoad,
  runTemplate,
  sizeBox,
  sizeCircuit,
  sizeConduit,
  standardBreaker,
  voltageDrop,
  EngineError,
  type Deviation,
} from '@nec-assistant/engine'


/** Preset answers must arrive resolved; numbers and choices take template defaults. */
function defaultAnswers(template: (typeof allTemplates)[number]): Record<string, unknown> {
  const answers: Record<string, unknown> = {}
  for (const q of template.questions) {
    if (q.type !== 'preset') continue
    const preset = presetCatalogs[q.catalog][0]!
    const resolved: Record<string, unknown> = { id: preset.id }
    for (const [field, key] of Object.entries(q.sets)) resolved[field] = preset.values[key]
    answers[q.id] = resolved
  }
  return answers
}

/**
 * The contract for the deviation channel: the engine computes real numbers for
 * off-code inputs and marks them, instead of refusing to answer.
 *
 * The first test here is the one that matters most. Every golden fixture and
 * every «Supuestos (N)» count in the UI depends on clean, in-code inputs staying
 * clean — a deviation that fires when nothing is wrong would be invisible in the
 * goldens (they don't read `deviations`) but very visible to a user, who would
 * see «No cumple NEC» on a compliant job and stop trusting the badge.
 */
describe('no false positives on in-code inputs', () => {
  const clean: Array<[string, () => { deviations: Deviation[] }]> = [
    ['deratedAmpacity', () => deratedAmpacity({ size: '10', material: 'copper', insulation: 'THHN' })],
    ['evaluateConductor', () => evaluateConductor('10', { loadA: 24, material: 'copper', insulation: 'THHN' })],
    ['minConductorForLoad', () => minConductorForLoad({ loadA: 24, material: 'copper', insulation: 'THHN' })],
    ['voltageDrop', () => voltageDrop({ currentA: 24, lengthM: 15, size: '10', material: 'copper', systemVoltage: 240 })],
    ['minSizeForVoltageDrop', () => minSizeForVoltageDrop({ currentA: 16, lengthM: 30, material: 'copper', systemVoltage: 120 })],
    ['standardBreaker', () => standardBreaker({ loadA: 24, conductorProtectionAmpacity: 35 })],
    ['sizeCircuit', () => sizeCircuit({ loadA: 24, material: 'copper', insulation: 'THHN', lengthM: 15, systemVoltage: 240 })],
    ['boxFill', () => boxFill({ conductors: [{ size: '12', count: 4 }], boxId: 'sq-100x54' })],
    ['sizeBox', () => sizeBox({ conductors: [{ size: '12', count: 4 }] })],
    ['conduitFill', () => conduitFill({ conduitType: 'EMT', tradeSize: '1/2', conductors: [{ size: '12', insulation: 'THHN', count: 3 }] })],
    ['sizeConduit', () => sizeConduit({ conduitType: 'EMT', conductors: [{ size: '12', insulation: 'THHN', count: 3 }] })],
    ['egcSize', () => egcSize({ ocpdA: 20, material: 'copper' })],
    ['gecSize', () => gecSize({ largestUngroundedSize: '2', serviceMaterial: 'copper', material: 'copper' })],
    ['residentialLoad', () => residentialLoad({ areaM2: 120 })],
  ]

  for (const [name, run] of clean) {
    it(`${name} emits nothing`, () => {
      const result = run()
      expect(result.deviations).toEqual([])
      expect(isNonCompliant(result)).toBe(false)
    })
  }

  it('every template at its declared defaults is clean', () => {
    for (const template of allTemplates) {
      const result = runTemplate(template, { answers: defaultAnswers(template), options: {} })
      expect(
        result.deviations.map((d) => d.key),
        `${template.id} should be clean at defaults`,
      ).toEqual([])
    }
  })
})

describe('deviation shape', () => {
  // Mirrors the citation lint on template parameters: prose alone is not enough,
  // the reader needs the article to look it up.
  const offCode: Array<[string, () => { deviations: Deviation[] }]> = [
    ['ampacity-insufficient', () => evaluateConductor('14', { loadA: 50, material: 'copper', insulation: 'THHN' })],
    ['box-fill-exceeds', () => sizeBox({ conductors: [{ size: '6', count: 10 }] })],
    ['conduit-fill-exceeds', () => sizeConduit({ conduitType: 'LFNC-B', conductors: [{ size: '600', insulation: 'THWN-2', count: 40 }] })],
    ['ocpd-exceeds-conductor', () => standardBreaker({ loadA: 50, conductorProtectionAmpacity: 40 })],
    ['voltage-drop-over-limit', () => voltageDrop({ currentA: 40, lengthM: 90, size: '12', material: 'copper', systemVoltage: 120 })],
    ['small-appliance-below-minimum', () => residentialLoad({ areaM2: 100, smallApplianceCircuits: 0 })],
  ]

  for (const [key, run] of offCode) {
    it(`${key} is fully formed`, () => {
      const deviation = run().deviations.find((d) => d.key === key)
      expect(deviation, `${key} was not emitted`).toBeDefined()
      expect(deviation!.es.length).toBeGreaterThan(0)
      expect(deviation!.en.length).toBeGreaterThan(0)
      expect(deviation!.es).not.toBe(deviation!.en)
      expect(deviation!.citations?.length ?? 0).toBeGreaterThan(0)
      expect(['off-code', 'conditional', 'recommendation']).toContain(deviation!.severity)
    })
  }
})

describe('severity semantics', () => {
  it('an over-recommendation voltage drop does not make a run non-compliant', () => {
    // 210.19's 3% is an Informational Note. Calling it a violation would be the
    // same overreach the whole channel exists to avoid.
    const result = voltageDrop({
      currentA: 40,
      lengthM: 90,
      size: '12',
      material: 'copper',
      systemVoltage: 120,
    })
    expect(result.deviations[0]?.severity).toBe('recommendation')
    expect(isNonCompliant(result)).toBe(false)
  })

  it('a 240.4 protection failure does make it non-compliant', () => {
    expect(isNonCompliant(standardBreaker({ loadA: 50, conductorProtectionAmpacity: 40 }))).toBe(
      true,
    )
  })
})

describe('mergeDeviations', () => {
  const a: Deviation = { key: 'x', en: 'first', es: 'primero', severity: 'off-code' }
  const b: Deviation = { key: 'x', en: 'second', es: 'segundo', severity: 'recommendation' }
  const c: Deviation = { key: 'y', en: 'other', es: 'otro', severity: 'conditional' }

  it('dedupes by key, keeping the first (same contract as mergeAssumptions)', () => {
    expect(mergeDeviations([a], [b], [c])).toEqual([a, c])
  })

  it('is empty for empty input', () => {
    expect(mergeDeviations([], [])).toEqual([])
  })
})

describe('propagation', () => {
  it('a sub-call deviation reaches the circuit result', () => {
    // 2000 m of #14 at 120 V: even 600 kcmil cannot hold 3%, so the best-effort
    // conductor comes back carrying the voltage-drop deviation.
    const result = sizeCircuit({
      loadA: 40,
      material: 'copper',
      insulation: 'THHN',
      lengthM: 2000,
      systemVoltage: 120,
    })
    expect(result.deviations.map((d) => d.key)).toContain('voltage-drop-over-limit')
  })

  it('a severity-tagged template warning is promoted into deviations', () => {
    const ducha = allTemplates.find((t) => t.id.includes('ducha'))!
    const result = runTemplate(ducha, {
      answers: defaultAnswers(ducha),
      options: { proteccion: 'estandar' },
    })
    const promoted = result.deviations.find((d) => d.key === 'warning:gfci-estandar')
    expect(promoted?.severity).toBe('off-code')
    expect(promoted?.citations).toContain('nec2026.s210_8')
    // The warning itself stays in `warnings` too — template order and count are
    // asserted by the template goldens.
    expect(result.warnings.map((w) => w.id)).toContain('gfci-estandar')
    expect(isNonCompliant(result)).toBe(true)
  })

  it('an untagged warning stays advice and does not flip compliance', () => {
    const ducha = allTemplates.find((t) => t.id.includes('ducha'))!
    const result = runTemplate(ducha, {
      answers: { ...defaultAnswers(ducha), panelSlots: 'no' },
      options: {},
    })
    expect(result.warnings.map((w) => w.id)).toContain('panel-space')
    expect(result.deviations.map((d) => d.key)).not.toContain('warning:panel-space')
  })
})

describe('nonmetallic raceway ambient ceiling (352.12 / 362.12)', () => {
  const ducha = () => allTemplates.find((t) => t.id === 'ac-minisplit')!

  it('PVC on a 55 °C roof run is flagged', () => {
    const t = ducha()
    const result = runTemplate(t, {
      answers: { ...defaultAnswers(t), location: 'techo', ambientC: 55 },
      options: { conduitType: 'pvc' },
    })
    const w = result.warnings.find((x) => x.id === 'tubo-no-metalico-caliente')
    expect(w, 'the ambient ceiling warning should fire').toBeDefined()
    expect(w?.citations).toContain('nec2026.s352_12')
    expect(w?.citations).toContain('nec2026.s362_12')
    // «unless listed otherwise» — the app cannot read the tube's marking, so it
    // warns without stamping the job as non-compliant.
    expect(w?.severity).toBe('conditional')
    expect(isNonCompliant(result)).toBe(false)
  })

  it('metal at the same temperature is not flagged', () => {
    const t = ducha()
    const result = runTemplate(t, {
      answers: { ...defaultAnswers(t), location: 'techo', ambientC: 55 },
      options: { conduitType: 'emt' },
    })
    expect(result.warnings.map((w) => w.id)).not.toContain('tubo-no-metalico-caliente')
  })

  it('PVC at exactly 50 °C is not flagged — the rule is "in excess of"', () => {
    const t = ducha()
    const result = runTemplate(t, {
      answers: { ...defaultAnswers(t), location: 'techo', ambientC: 50 },
      options: { conduitType: 'pvc' },
    })
    expect(result.warnings.map((w) => w.id)).not.toContain('tubo-no-metalico-caliente')
  })
})

describe('local-practice coverage', () => {
  // A note keyed to something nothing emits is invisible: it would look present
  // in the data and never reach a reader. Same spirit as catalog-coverage.
  it('every El Salvador practice note is keyed to a real deviation', () => {
    const engineKeys = new Set<string>(DEVIATION_KEYS)
    const uiKeys = new Set<string>(UI_OWNED_PRACTICE_KEYS)
    for (const key of Object.keys(localPracticeNotes)) {
      expect(
        engineKeys.has(key) || uiKeys.has(key),
        `localPracticeNotes["${key}"] matches no engine deviation and is not declared UI-owned`,
      ).toBe(true)
    }
  })

  it('each note self-identifies with its own key', () => {
    for (const [key, note] of Object.entries(localPracticeNotes)) {
      expect(note.key).toBe(key)
      expect(note.es).not.toBe(note.en)
    }
  })
})

describe('emitted keys stay inside the registry', () => {
  it('no deviation escapes DEVIATION_KEYS', () => {
    const known = new Set<string>(DEVIATION_KEYS)
    const emitters: Array<() => { deviations: Deviation[] }> = [
      () => evaluateConductor('14', { loadA: 50, material: 'copper', insulation: 'THHN' }),
      () => sizeBox({ conductors: [{ size: '6', count: 10 }] }),
      () =>
        sizeConduit({
          conduitType: 'LFNC-B',
          conductors: [{ size: '600', insulation: 'THWN-2', count: 40 }],
        }),
      () => standardBreaker({ loadA: 50, conductorProtectionAmpacity: 40 }),
      () => standardBreaker({ loadA: 9000 }),
      () =>
        voltageDrop({
          currentA: 40,
          lengthM: 90,
          size: '12',
          material: 'copper',
          systemVoltage: 120,
        }),
      () => residentialLoad({ areaM2: 100, smallApplianceCircuits: 0 }),
    ]
    for (const emit of emitters) {
      for (const d of emit().deviations) {
        expect(known.has(d.key), `unregistered deviation key "${d.key}"`).toBe(true)
      }
    }
  })
})

describe('coverage errors are still errors', () => {
  it('an impossible ambient reports the ambient, not a fabricated conductor', () => {
    // Regression: minConductorForLoad used to swallow this EngineError on all 19
    // iterations and report "no size satisfies a 20 A load" instead.
    try {
      minConductorForLoad({ loadA: 20, material: 'copper', insulation: 'TW', ambientC: 60 })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError)
      expect((e as EngineError).kind).toBe('coverage')
      expect((e as EngineError).message).toContain('60')
      expect((e as EngineError).es).toContain('60')
    }
  })

  it('an untranscribed table range is a coverage limit, not an off-code verdict', () => {
    try {
      residentialLoad({ areaM2: 100, devices: [{ va: 28000, category: 'range' }] })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect((e as EngineError).kind).toBe('coverage')
    }
  })

  it('malformed input is an input error', () => {
    try {
      residentialLoad({ areaM2: 0 })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect((e as EngineError).kind).toBe('input')
    }
  })
})
