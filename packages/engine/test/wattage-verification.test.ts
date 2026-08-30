import { describe, expect, it } from 'vitest'
import { acPresets, appliancePresets } from '@elec-assistant/data'

/**
 * Wattage provenance lint (packages/data/WATTAGES.md): every typical value in
 * the device catalog is either verified (`verifiedAt` + `source`) or listed
 * here as a documented gap. A companion test fails the moment a listed preset
 * gains a stamp, forcing these sets to shrink honestly — same forcing function
 * as KNOWN_UNPRICED in catalog-coverage.test.ts.
 *
 * The two sets stay separate: ac-9k…ac-24k exist in BOTH preset arrays (the
 * appliance entry is derived from the MCA preset) and must never be merged
 * into one id-keyed set.
 */

const KNOWN_UNVERIFIED_APPLIANCES = new Set([
  'ducha',
  'termo',
  'estufa',
  'horno',
  'secadora',
  'refri',
  'congelador',
  'micro',
  'lavadora',
  'lavaplatos',
  'plancha',
  'tv',
  'bomba',
  'ac-9k',
  'ac-12k',
  'ac-18k',
  'ac-24k',
])

const KNOWN_UNVERIFIED_AC = new Set(['ac-9k', 'ac-12k', 'ac-18k', 'ac-24k', 'ac-36k'])

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Widen from the `as const` literal types so the optional provenance fields
// are readable even while no entry sets them yet.
interface ProvenancePreset {
  readonly id: string
  readonly verifiedAt?: string
  readonly source?: string
}
const APPLIANCES: readonly ProvenancePreset[] = appliancePresets
const ACS: readonly ProvenancePreset[] = acPresets

const CATALOGS = [
  { name: 'appliancePresets', presets: APPLIANCES, known: KNOWN_UNVERIFIED_APPLIANCES },
  { name: 'acPresets', presets: ACS, known: KNOWN_UNVERIFIED_AC },
] as const

describe('wattage verification lint', () => {
  for (const { name, presets, known } of CATALOGS) {
    describe(name, () => {
      it('every unverified preset is a documented gap', () => {
        const undocumented = presets
          .filter((p) => p.verifiedAt === undefined && !known.has(p.id))
          .map((p) => p.id)
        expect(
          undocumented,
          `presets without verifiedAt missing from the known-unverified set: ${undocumented.join(', ')}`,
        ).toEqual([])
      })

      it('the known-unverified set shrinks honestly', () => {
        const nowVerified = presets
          .filter((p) => p.verifiedAt !== undefined && known.has(p.id))
          .map((p) => p.id)
        expect(
          nowVerified,
          `now verified — remove from the known-unverified set: ${nowVerified.join(', ')}`,
        ).toEqual([])
      })

      it('stamps are well-formed (ISO date + non-empty source)', () => {
        for (const p of presets) {
          if (p.verifiedAt !== undefined) {
            expect(p.verifiedAt, p.id).toMatch(ISO_DATE)
            expect(p.source ?? '', `${p.id}: verifiedAt requires a source`).not.toBe('')
          }
        }
      })

      it('every id in the known-unverified set exists in the catalog', () => {
        const ids = new Set(presets.map((p) => p.id))
        const stale = [...known].filter((id) => !ids.has(id))
        expect(stale, `unknown ids in the set: ${stale.join(', ')}`).toEqual([])
      })
    })
  }

  it('derived ac-* appliance entries stay in lockstep with their MCA preset twin', () => {
    for (const ac of ACS) {
      const twin = APPLIANCES.find((a) => a.id === ac.id)
      if (!twin) continue // ac-36k has no appliance twin
      expect(twin.verifiedAt, `${ac.id}: verify the MCA preset, then stamp both twins`).toBe(
        ac.verifiedAt,
      )
      expect(twin.source ?? '', `${ac.id}: appliance twin must carry the derivation note`).toContain(
        'ac-presets',
      )
    }
  })
})
