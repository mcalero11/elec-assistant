import { describe, expect, it } from 'vitest'
import {
  EngineError,
  boxFill,
  sizeBox,
  type BoxFillInput,
  type SizeBoxInput,
} from '@elec-assistant/engine'
import goldenFill from './golden/box-fill.json'
import goldenSize from './golden/size-box.json'

describe('boxFill (golden)', () => {
  for (const c of goldenFill.cases) {
    it(c.name, () => {
      const result = boxFill(c.input as BoxFillInput)
      expect(result.boxId).toBe(c.expected.boxId)
      expect(result.boxVolumeCm3).toBeCloseTo(c.expected.boxVolumeCm3, 4)
      expect(result.requiredVolumeCm3).toBeCloseTo(c.expected.requiredVolumeCm3, 4)
      expect(result.fits).toBe(c.expected.fits)
      expect(result.fillPercent).toBeCloseTo(c.expected.fillPercent, 3)
      expect(result.egcAllowances).toBeCloseTo(c.expected.egcAllowances, 4)
      expect(result.egcQuarterRuleApplied).toBe(c.expected.egcQuarterRuleApplied)
      expect(result.largestConductor).toBe(c.expected.largestConductor)
      expect(result.countedConductors).toBe(c.expected.countedConductors)
      expect(result.deviceAllowances).toBe(c.expected.deviceAllowances)
      expect(result.breakdown.conductorsCm3).toBeCloseTo(c.expected.breakdown.conductorsCm3, 4)
      expect(result.breakdown.clampsCm3).toBeCloseTo(c.expected.breakdown.clampsCm3, 4)
      expect(result.breakdown.supportFittingsCm3).toBeCloseTo(c.expected.breakdown.supportFittingsCm3, 4)
      expect(result.breakdown.devicesCm3).toBeCloseTo(c.expected.breakdown.devicesCm3, 4)
      expect(result.breakdown.egcCm3).toBeCloseTo(c.expected.breakdown.egcCm3, 4)
      const keys = result.assumptions.map((a) => a.key)
      for (const key of c.expected.assumptionKeys) expect(keys).toContain(key)
      for (const key of c.expected.absentAssumptionKeys) expect(keys).not.toContain(key)
    })
  }
})

describe('sizeBox (golden)', () => {
  for (const c of goldenSize.cases) {
    it(c.name, () => {
      const result = sizeBox(c.input as SizeBoxInput)
      expect(result.boxId).toBe(c.expected.boxId)
      expect(result.boxVolumeCm3).toBeCloseTo(c.expected.boxVolumeCm3, 4)
      expect(result.requiredVolumeCm3).toBeCloseTo(c.expected.requiredVolumeCm3, 4)
      expect(result.fits).toBe(true)
    })
  }
})

describe('boxFill (conditional citations)', () => {
  it('conductor-only standard box cites the two tables and (B)(1), nothing else', () => {
    const result = boxFill({ boxId: 'sq-100x54', conductors: [{ size: '12', count: 6 }] })
    expect(result.citations).toContain('nec2026.t314_16_a')
    expect(result.citations).toContain('nec2026.t314_16_b')
    expect(result.citations).toContain('nec2026.s314_16_b_1')
    expect(result.citations).not.toContain('nec2026.s314_16_b_2')
    expect(result.citations).not.toContain('nec2026.s314_16_b_3')
    expect(result.citations).not.toContain('nec2026.s314_16_b_4')
    expect(result.citations).not.toContain('nec2026.s314_16_b_5')
  })

  it('clamps, yokes, and EGCs each pull in their subsection only when present', () => {
    const result = boxFill({
      boxId: 'oct-100x38',
      conductors: [{ size: '14', count: 4 }],
      internalClamps: true,
      deviceYokes: [{ count: 1, largestConductor: '14' }],
      egcCount: 2,
      largestEgc: '14',
    })
    expect(result.citations).toContain('nec2026.s314_16_b_2')
    expect(result.citations).toContain('nec2026.s314_16_b_4')
    expect(result.citations).toContain('nec2026.s314_16_b_5')
    expect(result.citations).not.toContain('nec2026.s314_16_b_3')
  })

  it('support fittings cite (B)(3)', () => {
    const result = boxFill({
      volumeCm3: 164,
      conductors: [{ size: '14', count: 3 }],
      luminaireStud: true,
      hickey: true,
    })
    expect(result.citations).toContain('nec2026.s314_16_b_3')
  })

  it('marked-volume mode does not cite Table 314.16(A)', () => {
    const result = boxFill({ volumeCm3: 200, conductors: [{ size: '12', count: 2 }] })
    expect(result.citations).not.toContain('nec2026.t314_16_a')
    expect(result.citations).toContain('nec2026.t314_16_b')
  })

  it('sizeBox result cites Table 314.16(A)', () => {
    const result = sizeBox({ conductors: [{ size: '12', count: 6 }] })
    expect(result.citations).toContain('nec2026.t314_16_a')
  })
})

describe('boxFill (errors)', () => {
  const expectBilingualError = (fn: () => unknown) => {
    try {
      fn()
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError)
      expect((e as EngineError).es.length).toBeGreaterThan(0)
    }
  }

  it('rejects an empty conductor list', () => {
    expectBilingualError(() => boxFill({ volumeCm3: 200, conductors: [] }))
  })

  it('rejects non-integer conductor counts', () => {
    expectBilingualError(() =>
      boxFill({ volumeCm3: 200, conductors: [{ size: '12', count: 1.5 }] }),
    )
  })

  it('rejects an unknown box id', () => {
    expectBilingualError(() =>
      boxFill({ boxId: 'no-such-box', conductors: [{ size: '12', count: 2 }] }),
    )
  })

  it('rejects boxId and volumeCm3 together, and neither', () => {
    expectBilingualError(() =>
      boxFill({ boxId: 'sq-100x54', volumeCm3: 200, conductors: [{ size: '12', count: 2 }] }),
    )
    expectBilingualError(() => boxFill({ conductors: [{ size: '12', count: 2 }] }))
  })

  it('rejects a non-positive marked volume', () => {
    expectBilingualError(() => boxFill({ volumeCm3: 0, conductors: [{ size: '12', count: 2 }] }))
  })

  it('rejects egcCount without largestEgc, and negative egcCount', () => {
    expectBilingualError(() =>
      boxFill({ volumeCm3: 200, conductors: [{ size: '12', count: 2 }], egcCount: 2 }),
    )
    expectBilingualError(() =>
      boxFill({
        volumeCm3: 200,
        conductors: [{ size: '12', count: 2 }],
        egcCount: -1,
        largestEgc: '12',
      }),
    )
  })

  it('rejects non-integer yoke counts', () => {
    expectBilingualError(() =>
      boxFill({
        volumeCm3: 200,
        conductors: [{ size: '12', count: 2 }],
        deviceYokes: [{ count: 0, largestConductor: '12' }],
      }),
    )
  })

  it('sizeBox throws when nothing fits (10× #6 = 819 > 689 max)', () => {
    expectBilingualError(() => sizeBox({ conductors: [{ size: '6', count: 10 }] }))
  })
})
