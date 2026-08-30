import { describe, expect, it } from 'vitest'
import { EngineError, residentialLoad, type ResidentialLoadInput } from '@nec-assistant/engine'
import golden from './golden/load-calc.json'

describe('residentialLoad (golden)', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const result = residentialLoad(c.input as ResidentialLoadInput)

      const std = c.expected.standard
      expect(result.standard.totalDemandVa).toBeCloseTo(std.totalDemandVa, 2)
      expect(result.standard.amps).toBeCloseTo(std.amps, 3)
      expect(result.standard.serviceA).toBe(std.serviceA)
      expect(result.standard.serviceFlooredTo100).toBe(std.serviceFlooredTo100)
      expect(result.standard.applianceDemand75Applied).toBe(std.applianceDemand75Applied)
      expect(result.standard.dryerMinApplied).toBe(std.dryerMinApplied)
      expect(result.standard.rangeNote1Applied).toBe(std.rangeNote1Applied)
      expect(result.standard.rangeCappedAtNameplate).toBe(std.rangeCappedAtNameplate)
      expect(result.standard.heatGovernsOverAc).toBe(std.heatGovernsOverAc)

      expect(result.optional.totalDemandVa).toBeCloseTo(c.expected.optional.totalDemandVa, 2)
      expect(result.optional.amps).toBeCloseTo(c.expected.optional.amps, 3)
      expect(result.optional.serviceA).toBe(c.expected.optional.serviceA)

      expect(result.governingMethod).toBe(c.expected.governingMethod)
      expect(result.minServiceA).toBe(c.expected.minServiceA)

      const lineDemand = (method: 'standard' | 'optional', key: string) =>
        result[method].lines.find((l) => l.key === key)?.demandVa
      for (const [key, demand] of Object.entries(
        (c.expected as { standardLineDemands?: Record<string, number> }).standardLineDemands ?? {},
      )) {
        expect(lineDemand('standard', key), `standard line ${key}`).toBeCloseTo(demand, 2)
      }
      for (const [key, demand] of Object.entries(
        (c.expected as { optionalLineDemands?: Record<string, number> }).optionalLineDemands ?? {},
      )) {
        expect(lineDemand('optional', key), `optional line ${key}`).toBeCloseTo(demand, 2)
      }

      const keys = result.assumptions.map((a) => a.key)
      for (const key of c.expected.assumptionKeys) expect(keys).toContain(key)
      for (const key of c.expected.absentAssumptionKeys) expect(keys).not.toContain(key)
    })
  }
})

describe('residentialLoad (conditional citations)', () => {
  it('lighting-only calc cites the pool sections but no appliance rules', () => {
    const result = residentialLoad({ areaM2: 100 })
    expect(result.standard.citations).toContain('nec2026.s220_41')
    expect(result.standard.citations).toContain('nec2026.s220_52')
    expect(result.standard.citations).toContain('nec2026.t220_45')
    expect(result.standard.citations).toContain('nec2026.s230_79')
    expect(result.standard.citations).not.toContain('nec2026.t220_55')
    expect(result.standard.citations).not.toContain('nec2026.s220_53')
    expect(result.standard.citations).not.toContain('nec2026.s220_54')
    expect(result.standard.citations).not.toContain('nec2026.s220_60')
    expect(result.standard.citations).not.toContain('nec2026.s220_50')
  })

  it('220.53 is cited only when the 75% factor fires', () => {
    const three = residentialLoad({ areaM2: 100, devices: [{ va: 1000, category: 'fixed', qty: 3 }] })
    const four = residentialLoad({ areaM2: 100, devices: [{ va: 1000, category: 'fixed', qty: 4 }] })
    expect(three.standard.citations).not.toContain('nec2026.s220_53')
    expect(four.standard.citations).toContain('nec2026.s220_53')
  })

  it('220.60 is cited only when both A/C and heat are present', () => {
    const acOnly = residentialLoad({ areaM2: 100, devices: [{ va: 4000, category: 'ac' }] })
    const both = residentialLoad({
      areaM2: 100,
      devices: [
        { va: 4000, category: 'ac' },
        { va: 6000, category: 'heat' },
      ],
    })
    expect(acOnly.standard.citations).not.toContain('nec2026.s220_60')
    expect(both.standard.citations).toContain('nec2026.s220_60')
  })

  it('every line carries its own citations and the optional method cites 220.82', () => {
    const result = residentialLoad({ areaM2: 100, devices: [{ presetId: 'estufa' }] })
    const ranges = result.standard.lines.find((l) => l.key === 'ranges')
    expect(ranges?.citations).toContain('nec2026.t220_55')
    expect(result.optional.citations).toContain('nec2026.s220_82')
  })
})

describe('residentialLoad (errors)', () => {
  const expectBilingualError = (input: ResidentialLoadInput) => {
    try {
      residentialLoad(input)
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError)
      expect((e as EngineError).es.length).toBeGreaterThan(0)
    }
  }

  it('rejects a non-positive area', () => {
    expectBilingualError({ areaM2: 0 })
  })

  it('rejects fewer than 2 small-appliance circuits (220.52(A))', () => {
    expectBilingualError({ areaM2: 100, smallApplianceCircuits: 1 })
  })

  it('rejects an unknown preset id', () => {
    expectBilingualError({ areaM2: 100, devices: [{ presetId: 'no-such-device' }] })
  })

  it('rejects a custom device without category, and preset+custom together', () => {
    expectBilingualError({ areaM2: 100, devices: [{ va: 1000 }] })
    expectBilingualError({ areaM2: 100, devices: [{ presetId: 'ducha', va: 1000, category: 'fixed' }] })
  })

  it('rejects non-integer or zero quantities', () => {
    expectBilingualError({ areaM2: 100, devices: [{ va: 1000, category: 'fixed', qty: 0 }] })
  })

  it('rejects more cooking appliances than Column C covers', () => {
    expectBilingualError({ areaM2: 100, devices: [{ va: 8000, category: 'range', qty: 7 }] })
  })

  it('rejects ranges over the Note 1 ceiling (27 kW)', () => {
    expectBilingualError({ areaM2: 100, devices: [{ va: 28000, category: 'range' }] })
  })

  it('rejects more dryers than the transcribed 120.54 factors cover', () => {
    expectBilingualError({ areaM2: 100, devices: [{ va: 5000, category: 'dryer', qty: 6 }] })
  })
})
