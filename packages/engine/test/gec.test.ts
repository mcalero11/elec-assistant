import { describe, expect, it } from 'vitest'
import { CONDUCTOR_SIZES } from '@elec-assistant/data'
import { gecSize, type GecInput } from '@elec-assistant/engine'
import golden from './golden/gec.json'

describe('gecSize (golden)', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const result = gecSize(c.input as GecInput)
      expect(result.size).toBe(c.expected.size)
      expect(result.tableSize).toBe(c.expected.tableSize)
      expect(result.rodCapApplied).toBe(c.expected.rodCapApplied)
    })
  }
})

describe('gecSize (conditional citations and assumptions)', () => {
  it('cites 250.66(A) only when the rod cap actually limited the size', () => {
    const capped = gecSize({
      largestUngroundedSize: '3/0',
      serviceMaterial: 'copper',
      material: 'copper',
      electrode: 'rod',
    })
    expect(capped.citations).toContain('nec2026.s250_66_a')
    const uncapped = gecSize({
      largestUngroundedSize: '2',
      serviceMaterial: 'copper',
      material: 'copper',
      electrode: 'rod',
    })
    expect(uncapped.citations).not.toContain('nec2026.s250_66_a')
    expect(uncapped.citations).toContain('nec2026.t250_66')
  })

  it('rod mode carries the sole-connection assumption; small GECs carry the 250.64(B) note', () => {
    const rod = gecSize({
      largestUngroundedSize: '2',
      serviceMaterial: 'copper',
      material: 'copper',
      electrode: 'rod',
    })
    const keys = rod.assumptions.map((a) => a.key)
    expect(keys).toContain('gec-rod-cap')
    expect(keys).toContain('gec-physical-protection') // 8 AWG < 6 AWG

    const big = gecSize({ largestUngroundedSize: '350', serviceMaterial: 'copper', material: 'copper' })
    expect(big.assumptions.map((a) => a.key)).not.toContain('gec-physical-protection')
  })

  it('covers every conductor size in the domain, monotonically', () => {
    let previousIdx = 0
    for (const size of CONDUCTOR_SIZES) {
      const { size: gec } = gecSize({
        largestUngroundedSize: size,
        serviceMaterial: 'copper',
        material: 'copper',
      })
      const idx = CONDUCTOR_SIZES.indexOf(gec)
      expect(idx).toBeGreaterThanOrEqual(previousIdx)
      previousIdx = idx
    }
  })
})
