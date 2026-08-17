import { describe, expect, it } from 'vitest'
import {
  CONDUCTOR_SIZES,
  CONDUIT_TYPES,
  TRADE_SIZES,
  conduitDimensions,
  table31016,
} from '@elec-assistant/data'
import {
  ambientFactor,
  cccFactor,
  conduitFill,
  deratedAmpacity,
  minConductorForLoad,
  minSizeForVoltageDrop,
  sizeConduit,
  standardBreaker,
} from '@elec-assistant/engine'

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
