import { describe, expect, it } from 'vitest'
import {
  EngineError,
  conduitFill,
  sizeConduit,
  type ConduitFillInput,
  type SizeConduitInput,
} from '@nec-assistant/engine'
import goldenFill from './golden/conduit-fill.json'
import goldenSize from './golden/size-conduit.json'

describe('conduitFill (golden)', () => {
  for (const c of goldenFill.cases) {
    it(c.name, () => {
      const result = conduitFill(c.input as ConduitFillInput)
      expect(result.fits).toBe(c.expected.fits)
      expect(result.fillPercentLimit).toBe(c.expected.fillPercentLimit)
      expect(result.conductorAreaMm2).toBeCloseTo(c.expected.conductorAreaMm2, 4)
      expect(result.allowedFillAreaMm2).toBeCloseTo(c.expected.allowedFillAreaMm2, 4)
      if (c.expected.fillPercentActual !== undefined) {
        expect(result.fillPercentActual).toBeCloseTo(c.expected.fillPercentActual, 4)
      }
      expect(result.note7Applied).toBe(c.expected.note7Applied)
      expect(result.citations).toContain('nec2026.ch9_t1')
      expect(result.citations).toContain('nec2026.ch9_t4')
      expect(result.citations).toContain('nec2026.ch9_t5')
      expect(result.assumptions.some((a) => a.key === 'jam-not-evaluated')).toBe(true)
    })
  }

  it('cites Note 4 only for nipples and Note 7 only when it changed the outcome', () => {
    const nipple = goldenFill.cases.find((c) => c.input.nipple)
    const note7 = goldenFill.cases.find((c) => c.expected.note7Applied)
    expect(nipple && conduitFill(nipple.input as ConduitFillInput).citations).toContain(
      'nec2026.ch9_note4',
    )
    expect(note7 && conduitFill(note7.input as ConduitFillInput).citations).toContain(
      'nec2026.ch9_note7',
    )
    const plain = conduitFill({
      conduitType: 'EMT',
      tradeSize: '1/2',
      conductors: [{ size: '10', insulation: 'THHN', count: 3 }],
    })
    expect(plain.citations).not.toContain('nec2026.ch9_note4')
    expect(plain.citations).not.toContain('nec2026.ch9_note7')
  })

  it('surfaces the PVC Schedule 40 and LFNC-B assumptions on those conduit types', () => {
    const pvc = conduitFill({
      conduitType: 'PVC-40',
      tradeSize: '1/2',
      conductors: [{ size: '10', insulation: 'THHN', count: 3 }],
    })
    expect(pvc.assumptions.some((a) => a.key === 'conduit-pvc-sch40')).toBe(true)
    const lfnc = conduitFill({
      conduitType: 'LFNC-B',
      tradeSize: '1/2',
      conductors: [{ size: '10', insulation: 'THHN', count: 3 }],
    })
    expect(lfnc.assumptions.some((a) => a.key === 'lfnc-b')).toBe(true)
  })

  it('rejects UF and USE (no Chapter 9 Table 5 rows)', () => {
    for (const insulation of ['UF', 'USE'] as const) {
      expect(() =>
        conduitFill({
          conduitType: 'EMT',
          tradeSize: '1/2',
          conductors: [{ size: '10', insulation, count: 2 }],
        }),
      ).toThrow(EngineError)
    }
  })

  it('rejects trade sizes a conduit type is not made in', () => {
    expect(() =>
      conduitFill({
        conduitType: 'EMT',
        tradeSize: '3/8',
        conductors: [{ size: '10', insulation: 'THHN', count: 3 }],
      }),
    ).toThrow(EngineError)
    expect(() =>
      conduitFill({
        conduitType: 'LFNC-B',
        tradeSize: '3',
        conductors: [{ size: '10', insulation: 'THHN', count: 3 }],
      }),
    ).toThrow(EngineError)
  })

  it('rejects an empty conductor list and non-integer counts', () => {
    expect(() =>
      conduitFill({ conduitType: 'EMT', tradeSize: '1/2', conductors: [] }),
    ).toThrow(EngineError)
    expect(() =>
      conduitFill({
        conduitType: 'EMT',
        tradeSize: '1/2',
        conductors: [{ size: '10', insulation: 'THHN', count: 1.5 }],
      }),
    ).toThrow(EngineError)
  })
})

describe('PV wire fill (Ch. 9 Note 5 actual dimensions)', () => {
  // Areas from packages/data/src/reference/pv-wire.json (larger-of-two-manufacturers):
  // #12 = 29.92 mm², #10 = 36.94 mm². Hand math documented per case.
  it('2× 10 PV, EMT: 73.88 > 61 (1/2 @31%) → 3/4 (106); 73.88/343 = 21.54%', () => {
    const result = sizeConduit({
      conduitType: 'EMT',
      conductors: [{ size: '10', insulation: 'PV', count: 2 }],
    })
    expect(result.tradeSize).toBe('3/4')
    expect(result.fillPercentLimit).toBe(31)
    expect(result.fillPercentActual).toBeCloseTo(21.5394, 4)
    expect(result.citations).toContain('nec2026.ch9_note5')
    expect(result.citations).not.toContain('nec2026.ch9_t5')
    expect(result.assumptions.some((a) => a.key === 'pv-wire-typical-dims')).toBe(true)
  })

  it('mixed string + EGC: 2× 10 PV + 1× 10 THWN-2 = 87.49 → 3/4 EMT @40%; cites Table 5 AND Note 5', () => {
    const result = sizeConduit({
      conduitType: 'EMT',
      conductors: [
        { size: '10', insulation: 'PV', count: 2 },
        { size: '10', insulation: 'THWN-2', count: 1 },
      ],
    })
    expect(result.tradeSize).toBe('3/4')
    expect(result.fillPercentLimit).toBe(40)
    expect(result.fillPercentActual).toBeCloseTo(25.5073, 4)
    expect(result.citations).toContain('nec2026.ch9_t5')
    expect(result.citations).toContain('nec2026.ch9_note5')
    expect(result.assumptions.some((a) => a.key === 'pv-wire-typical-dims')).toBe(true)
  })

  it('verify mode: 4× 12 PV in 3/4 EMT: 119.68 ≤ 137 → fits at 34.89%', () => {
    const result = conduitFill({
      conduitType: 'EMT',
      tradeSize: '3/4',
      conductors: [{ size: '12', insulation: 'PV', count: 4 }],
    })
    expect(result.fits).toBe(true)
    expect(result.fillPercentActual).toBeCloseTo(34.8921, 4)
  })

  it('rejects PV sizes without typical dimensions (e.g. #2)', () => {
    expect(() =>
      conduitFill({
        conduitType: 'EMT',
        tradeSize: '2',
        conductors: [{ size: '2', insulation: 'PV', count: 2 }],
      }),
    ).toThrow(EngineError)
  })

  it('non-PV results do not carry the PV assumption or Note 5', () => {
    const result = conduitFill({
      conduitType: 'EMT',
      tradeSize: '1/2',
      conductors: [{ size: '10', insulation: 'THHN', count: 3 }],
    })
    expect(result.citations).not.toContain('nec2026.ch9_note5')
    expect(result.assumptions.some((a) => a.key === 'pv-wire-typical-dims')).toBe(false)
  })
})

describe('sizeConduit (golden)', () => {
  for (const c of goldenSize.cases) {
    it(c.name, () => {
      const result = sizeConduit(c.input as SizeConduitInput)
      expect(result.tradeSize).toBe(c.expected.tradeSize)
      expect(result.fits).toBe(true)
      expect(result.fillPercentLimit).toBe(c.expected.fillPercentLimit)
      expect(result.fillPercentActual).toBeCloseTo(c.expected.fillPercentActual, 4)
    })
  }

  it('surfaces the min-trade-size assumption when a floor is applied', () => {
    const result = sizeConduit({
      conduitType: 'LFNC-B',
      conductors: [{ size: '10', insulation: 'THHN', count: 3 }],
      minTradeSize: '1/2',
    })
    expect(result.assumptions.some((a) => a.key === 'min-trade-size')).toBe(true)
  })

  it('throws a bilingual EngineError when nothing fits', () => {
    try {
      sizeConduit({
        conduitType: 'LFNC-B',
        conductors: [{ size: '600', insulation: 'THWN-2', count: 40 }],
      })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError)
      expect((e as EngineError).es.length).toBeGreaterThan(0)
    }
  })
})
