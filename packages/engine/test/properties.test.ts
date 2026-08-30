import { describe, expect, it } from 'vitest'
import {
  BOX_CONDUCTOR_SIZES,
  BOX_SHAPES,
  CONDUCTOR_SIZES,
  CONDUIT_TYPES,
  TRADE_SIZES,
  acPresets,
  appliancePresets,
  article220,
  boxAllowances,
  conduitDimensions,
  lightingDemand,
  rangeDemand,
  standardBoxes,
  standardBreakers,
  table31016,
} from '@nec-assistant/data'
import {
  ambientFactor,
  boxFill,
  cccFactor,
  conduitFill,
  deratedAmpacity,
  minConductorForLoad,
  minSizeForVoltageDrop,
  residentialLoad,
  sizeBox,
  sizeConduit,
  standardBreaker,
  type BoxFillItemsInput,
} from '@nec-assistant/engine'

describe('monotonicity properties', () => {
  it('larger conductors never have lower derated ampacity (Cu THHN)', () => {
    let previous = 0
    for (const size of CONDUCTOR_SIZES) {
      if (!table31016.copper[size]) continue
      const { ampacity } = deratedAmpacity({ size, material: 'copper', insulation: 'THHN' })
      expect(ampacity).toBeGreaterThanOrEqual(previous)
      previous = ampacity
    }
  })

  it('more current-carrying conductors never increase the adjustment factor', () => {
    let previous = 1
    for (let ccc = 1; ccc <= 45; ccc++) {
      const factor = cccFactor(ccc)
      expect(factor).toBeLessThanOrEqual(previous)
      previous = factor
    }
  })

  it('hotter ambients never increase the correction factor (90°C rating)', () => {
    let previous = Number.POSITIVE_INFINITY
    for (let ambientC = 21; ambientC <= 55; ambientC++) {
      const factor = ambientFactor(ambientC, 90)
      expect(factor).toBeLessThanOrEqual(previous)
      previous = factor
    }
  })

  it('longer runs never allow a smaller conductor for voltage drop', () => {
    let previousIndex = 0
    for (let lengthM = 10; lengthM <= 200; lengthM += 10) {
      const { size } = minSizeForVoltageDrop({
        currentA: 16,
        lengthM,
        material: 'copper',
        systemVoltage: 120,
      })
      const index = CONDUCTOR_SIZES.indexOf(size)
      expect(index).toBeGreaterThanOrEqual(previousIndex)
      previousIndex = index
    }
  })

  it('breaker rating always covers the required load', () => {
    for (let loadA = 1; loadA <= 100; loadA++) {
      expect(standardBreaker({ loadA }).rating).toBeGreaterThanOrEqual(loadA)
      expect(standardBreaker({ loadA, continuous: true }).rating).toBeGreaterThanOrEqual(
        loadA * 1.25,
      )
    }
  })

  it('selected conductor always satisfies both load checks', () => {
    for (let loadA = 10; loadA <= 90; loadA += 5) {
      const result = minConductorForLoad({ loadA, material: 'copper', insulation: 'THHN' })
      expect(result.deratedAmpacity).toBeGreaterThanOrEqual(loadA)
      expect(result.terminationAmpacity).toBeGreaterThanOrEqual(result.requiredTermination)
    }
  })
})

describe('conduit fill properties', () => {
  it('more conductors never allow a smaller conduit (12 THHN in EMT)', () => {
    let previousIndex = 0
    for (let count = 1; count <= 20; count++) {
      const { tradeSize } = sizeConduit({
        conduitType: 'EMT',
        conductors: [{ size: '12', insulation: 'THHN', count }],
      })
      const index = TRADE_SIZES.indexOf(tradeSize)
      expect(index).toBeGreaterThanOrEqual(previousIndex)
      previousIndex = index
    }
  })

  it('larger conductors never allow a smaller conduit (3 wires, THHN, EMT)', () => {
    let previousIndex = 0
    for (const size of CONDUCTOR_SIZES) {
      const { tradeSize } = sizeConduit({
        conduitType: 'EMT',
        conductors: [{ size, insulation: 'THHN', count: 3 }],
      })
      const index = TRADE_SIZES.indexOf(tradeSize)
      expect(index).toBeGreaterThanOrEqual(previousIndex)
      previousIndex = index
    }
  })

  it('chosen trade size is minimal: it fits, and the next-smaller available size does not', () => {
    for (const conduitType of CONDUIT_TYPES) {
      const available = TRADE_SIZES.filter((s) => conduitDimensions.types[conduitType].sizes[s])
      for (const size of ['12', '10', '6', '1/0'] as const) {
        for (const count of [1, 2, 3, 5, 9]) {
          const conductors = [{ size, insulation: 'THHN' as const, count }]
          let result
          try {
            result = sizeConduit({ conduitType, conductors })
          } catch {
            continue // set too large for this conduit type's range — covered by error tests
          }
          expect(result.fits).toBe(true)
          const chosenIndex = available.indexOf(result.tradeSize)
          if (chosenIndex > 0) {
            const smaller = available[chosenIndex - 1]
            expect(
              smaller && conduitFill({ conduitType, tradeSize: smaller, conductors }).fits,
            ).toBe(false)
          }
        }
      }
    }
  })

  it('whenever fill passes without Note 7, actual percent is within the limit', () => {
    for (const count of [1, 2, 3, 4, 6, 9]) {
      const result = conduitFill({
        conduitType: 'EMT',
        tradeSize: '3/4',
        conductors: [{ size: '12', insulation: 'THHN', count }],
      })
      if (result.fits && !result.note7Applied) {
        expect(result.fillPercentActual).toBeLessThanOrEqual(result.fillPercentLimit)
      }
    }
  })

  it('Table 4 data sanity: column ordering and monotonic growth per conduit type', () => {
    for (const conduitType of CONDUIT_TYPES) {
      let previousTotal = 0
      for (const tradeSize of TRADE_SIZES) {
        const entry = conduitDimensions.types[conduitType].sizes[tradeSize]
        if (!entry) continue
        // 53% > 40% > 31% columns, all below total; 60% nipple column above the 53% column.
        expect(entry.fill1WireMm2).toBeGreaterThan(entry.fillOver2WiresMm2)
        expect(entry.fillOver2WiresMm2).toBeGreaterThan(entry.fill2WiresMm2)
        expect(entry.fillNippleMm2).toBeGreaterThan(entry.fill1WireMm2)
        expect(entry.fillNippleMm2).toBeLessThan(entry.totalAreaMm2)
        // Printed columns stay within ±1.5% of percent × total area (printed rounding tolerance).
        expect(entry.fill1WireMm2).toBeCloseTo(entry.totalAreaMm2 * 0.53, -1)
        expect(entry.fillOver2WiresMm2).toBeCloseTo(entry.totalAreaMm2 * 0.4, -1)
        // Areas strictly increase with trade size within a type.
        expect(entry.totalAreaMm2).toBeGreaterThan(previousTotal)
        previousTotal = entry.totalAreaMm2
      }
    }
  })
})

describe('box fill properties', () => {
  const bigBox = { volumeCm3: 10000 }

  it('more conductors never decrease the required volume', () => {
    let previous = 0
    for (let count = 1; count <= 20; count++) {
      const { requiredVolumeCm3 } = boxFill({ ...bigBox, conductors: [{ size: '12', count }] })
      expect(requiredVolumeCm3).toBeGreaterThanOrEqual(previous)
      previous = requiredVolumeCm3
    }
  })

  it('adding any content category never decreases the required volume', () => {
    const base: BoxFillItemsInput = { conductors: [{ size: '14', count: 3 }] }
    const baseline = boxFill({ ...bigBox, ...base }).requiredVolumeCm3
    const additions: BoxFillItemsInput[] = [
      { ...base, internalClamps: true },
      { ...base, luminaireStud: true },
      { ...base, hickey: true },
      { ...base, deviceYokes: [{ count: 1, largestConductor: '14' }] },
      { ...base, egcCount: 1, largestEgc: '14' },
      { ...base, conductors: [...base.conductors, { size: '18', count: 1 }] },
    ]
    for (const input of additions) {
      expect(boxFill({ ...bigBox, ...input }).requiredVolumeCm3).toBeGreaterThan(baseline)
    }
  })

  it('EGC allowances: flat for 1–4, quarter steps beyond', () => {
    const base: BoxFillItemsInput = { conductors: [{ size: '12', count: 2 }] }
    const volumeAt = (egcCount: number) =>
      boxFill({ ...bigBox, ...base, egcCount, largestEgc: '12' }).requiredVolumeCm3
    const oneEgc = volumeAt(1)
    for (let n = 2; n <= 4; n++) expect(volumeAt(n)).toBe(oneEgc)
    let previous = oneEgc
    for (let n = 5; n <= 10; n++) {
      const current = volumeAt(n)
      expect(current).toBeGreaterThan(previous)
      previous = current
    }
  })

  it('required volume equals the sum of the breakdown exactly', () => {
    const result = boxFill({
      ...bigBox,
      conductors: [
        { size: '14', count: 4 },
        { size: '12', count: 2 },
      ],
      internalClamps: true,
      luminaireStud: true,
      deviceYokes: [{ count: 1, largestConductor: '12' }],
      egcCount: 5,
      largestEgc: '12',
    })
    const sum =
      result.breakdown.conductorsCm3 +
      result.breakdown.clampsCm3 +
      result.breakdown.supportFittingsCm3 +
      result.breakdown.devicesCm3 +
      result.breakdown.egcCm3
    expect(result.requiredVolumeCm3).toBeCloseTo(sum, 6)
  })

  it('chosen box is minimal: it fits, and the next-smaller candidate does not', () => {
    const contents: BoxFillItemsInput[] = [
      { conductors: [{ size: '12', count: 6 }] },
      {
        conductors: [{ size: '14', count: 4 }],
        deviceYokes: [{ count: 1, largestConductor: '14' }],
        egcCount: 2,
        largestEgc: '14',
      },
      { conductors: [{ size: '8', count: 3 }], internalClamps: true },
    ]
    for (const shape of [undefined, ...BOX_SHAPES]) {
      const candidates = standardBoxes.boxes.filter((b) => shape == null || b.shape === shape)
      for (const items of contents) {
        let result
        try {
          result = sizeBox(shape ? { ...items, shape } : items)
        } catch {
          continue // contents too big for this shape group — covered by error tests
        }
        expect(result.fits).toBe(true)
        const chosenIndex = candidates.findIndex((b) => b.id === result.boxId)
        if (chosenIndex > 0) {
          const smaller = candidates[chosenIndex - 1]!
          expect(boxFill({ ...items, boxId: smaller.id }).fits).toBe(false)
        }
      }
    }
  })

  it('Table 314.16(B)(1) data sanity: allowances strictly increase and match the in³ column', () => {
    expect(boxAllowances.allowances.map((a) => a.size)).toEqual([...BOX_CONDUCTOR_SIZES])
    let previous = 0
    for (const row of boxAllowances.allowances) {
      expect(row.cm3).toBeGreaterThan(previous)
      previous = row.cm3
      // Printed metric column stays within rounding of in³ × 16.387.
      expect(row.cm3).toBeCloseTo(row.in3 * 16.387, 0)
    }
  })

  it('Table 314.16(A) data sanity: ascending volumes that match the in³ column', () => {
    let previous = 0
    for (const box of standardBoxes.boxes) {
      expect(box.volumeCm3).toBeGreaterThan(0)
      expect(box.volumeCm3).toBeGreaterThanOrEqual(previous)
      previous = box.volumeCm3
      expect(box.volumeCm3).toBeCloseTo(box.volumeIn3 * 16.387, -1)
    }
  })
})

describe('residential load properties', () => {
  const devices = [
    { va: 9000, category: 'range' as const },
    { va: 5000, category: 'dryer' as const },
    { va: 4400, category: 'fixed' as const },
    { va: 1840, category: 'ac' as const },
  ]

  it('a larger dwelling never lowers demand or service (both methods)', () => {
    let prevStd = 0
    let prevOpt = 0
    let prevStdService = 0
    let prevOptService = 0
    for (let areaM2 = 40; areaM2 <= 1000; areaM2 += 40) {
      const r = residentialLoad({ areaM2, devices })
      expect(r.standard.totalDemandVa).toBeGreaterThanOrEqual(prevStd)
      expect(r.optional.totalDemandVa).toBeGreaterThanOrEqual(prevOpt)
      expect(r.standard.serviceA).toBeGreaterThanOrEqual(prevStdService)
      expect(r.optional.serviceA).toBeGreaterThanOrEqual(prevOptService)
      prevStd = r.standard.totalDemandVa
      prevOpt = r.optional.totalDemandVa
      prevStdService = r.standard.serviceA
      prevOptService = r.optional.serviceA
    }
  })

  it('more small-appliance circuits never lower demand (both methods)', () => {
    let prevStd = 0
    let prevOpt = 0
    for (let sa = 2; sa <= 6; sa++) {
      const r = residentialLoad({ areaM2: 120, smallApplianceCircuits: sa, devices })
      expect(r.standard.totalDemandVa).toBeGreaterThanOrEqual(prevStd)
      expect(r.optional.totalDemandVa).toBeGreaterThanOrEqual(prevOpt)
      prevStd = r.standard.totalDemandVa
      prevOpt = r.optional.totalDemandVa
    }
  })

  it('per-line demand never exceeds connected load (largest-motor adder excepted by design)', () => {
    const r = residentialLoad({
      areaM2: 150,
      devices: [...devices, { va: 1200, category: 'motor' as const }, { va: 500, category: 'covered' as const }],
    })
    for (const method of [r.standard, r.optional]) {
      for (const line of method.lines) {
        if (line.key === 'largest-motor') continue
        expect(line.demandVa, `${method.method} ${line.key}`).toBeLessThanOrEqual(line.connectedVa)
      }
    }
  })

  it('totals are consistent and the service rating is minimal', () => {
    for (const areaM2 of [60, 150, 400, 1500]) {
      const r = residentialLoad({ areaM2, devices })
      for (const method of [r.standard, r.optional]) {
        const sum = method.lines.reduce((acc, l) => acc + l.demandVa, 0)
        expect(method.totalDemandVa).toBeCloseTo(sum, 6)
        expect(method.amps).toBeCloseTo(method.totalDemandVa / 240, 6)
        const required = Math.max(method.amps, article220.minDwellingServiceA)
        expect(method.serviceA).toBeGreaterThanOrEqual(required)
        const index = standardBreakers.ratings.indexOf(method.serviceA)
        if (index > 0) {
          expect(standardBreakers.ratings[index - 1]!).toBeLessThan(required)
        }
      }
      expect(r.minServiceA).toBe(Math.min(r.standard.serviceA, r.optional.serviceA))
      expect(r[r.governingMethod].serviceA).toBe(r.minServiceA)
    }
  })

  it('Table 220.45 data sanity: contiguous ascending tiers with non-increasing percents', () => {
    let previousCap = 0
    let previousPercent = Number.POSITIVE_INFINITY
    for (const tier of lightingDemand.tiers) {
      if (tier.upToVa != null) {
        expect(tier.upToVa).toBeGreaterThan(previousCap)
        previousCap = tier.upToVa
      }
      expect(tier.percent).toBeLessThanOrEqual(previousPercent)
      expect(tier.percent).toBeGreaterThan(0)
      previousPercent = tier.percent
    }
    expect(lightingDemand.tiers[lightingDemand.tiers.length - 1]?.upToVa).toBeNull()
  })

  it('Table 220.55 Column C data sanity: total demand grows, per-appliance demand shrinks', () => {
    let previousKw = 0
    let previousPerAppliance = Number.POSITIVE_INFINITY
    for (const row of rangeDemand.columnC) {
      expect(row.demandKw).toBeGreaterThanOrEqual(previousKw)
      const perAppliance = row.demandKw / row.appliances
      expect(perAppliance).toBeLessThanOrEqual(previousPerAppliance)
      previousKw = row.demandKw
      previousPerAppliance = perAppliance
    }
  })

  it('appliance presets: unique ids, positive VA, and A/C entries consistent with the MCA presets', () => {
    const ids = new Set<string>()
    for (const preset of appliancePresets) {
      expect(ids.has(preset.id), preset.id).toBe(false)
      ids.add(preset.id)
      expect(preset.typicalVa).toBeGreaterThan(0)
      expect(preset.synonyms.length).toBeGreaterThan(0)
    }
    // typicalVa ≈ (typicalMcaA ÷ 1.25) × 230, rounded to 10 (see appliance-presets.ts docblock).
    for (const ac of acPresets) {
      const appliance = appliancePresets.find((p) => p.id === ac.id)
      if (!appliance) continue
      expect(appliance.typicalVa).toBeCloseTo((ac.typicalMcaA / 1.25) * 230, -1)
    }
  })
})
