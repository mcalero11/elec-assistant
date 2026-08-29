import { describe, expect, it } from 'vitest'
import {
  allTemplates,
  catalogItems,
  priceEntries,
  type BomRule,
  type JobTemplate,
} from '@elec-assistant/data'

/**
 * Coverage lint (PRD §4): CI fails if a BOM can emit an item that is missing
 * from the item catalog or has no price entry. BOM item selection uses
 * enumerable `map.table` values (never string interpolation) precisely so this
 * walker can see every reachable itemId statically.
 */

const TEMPLATES: readonly JobTemplate[] = allTemplates

/**
 * Documented pricing gaps (packages/data/PRICES.md, updated 2026-08-17 with the
 * user's market research): breaker-2p-25 is not commercialized locally (only
 * 20/30 A; kept because it is the code-correct output for MOCP-25 nameplates —
 * special order), and the ½" LFNC connector is effectively unavailable (searches
 * return water-hose fittings; the ¾" is sold). The UI renders both as «sin precio»
 * with per-quote manual override. A companion test below fails the moment one of
 * these gains a price, forcing this list to shrink honestly.
 */
const KNOWN_UNPRICED = new Set([
  'breaker-2p-25',
  'lfnc-connector-12',
  // 2026-08-28 run: Vidrí now serves a Cloudflare challenge to non-browser
  // clients (was crawlable 2026-08-16); Freund/EPA remain opted out of AI
  // access. All ducha-electrica breaker items await manual price research —
  // see PRICES.md.
  'breaker-1p-15',
  'breaker-1p-20',
  'breaker-1p-30',
  'breaker-1p-40',
  'breaker-1p-50',
  'breaker-2p-50',
  'breaker-2p-60',
  'breaker-1p-gfci-30',
  'breaker-1p-gfci-40',
  'breaker-2p-gfci-40',
  'breaker-2p-gfci-50',
])

function reachableItemIds(rules: readonly BomRule[]): Set<string> {
  const ids = new Set<string>()
  for (const rule of rules) {
    if ('itemId' in rule.item) ids.add(rule.item.itemId)
    else for (const id of Object.values(rule.item.map.table)) ids.add(id)
  }
  return ids
}

describe('catalog coverage lint', () => {
  const catalogIds = new Set<string>(catalogItems.map((i) => i.id))

  for (const template of TEMPLATES) {
    const reachable = [...reachableItemIds(template.bom)]

    it(`${template.id}: every reachable BOM item exists in the catalog`, () => {
      const missing = reachable.filter((id) => !catalogIds.has(id))
      expect(missing, `unknown items: ${missing.join(', ')}`).toEqual([])
    })

    it(`${template.id}: every reachable BOM item has at least one price entry`, () => {
      const priced = new Set(priceEntries.map((p) => p.itemId))
      const unpriced = reachable.filter((id) => !priced.has(id) && !KNOWN_UNPRICED.has(id))
      expect(unpriced, `items without any price: ${unpriced.join(', ')}`).toEqual([])
    })
  }

  it('the KNOWN_UNPRICED list only contains items that are still unpriced', () => {
    const priced = new Set(priceEntries.map((p) => p.itemId))
    const stale = [...KNOWN_UNPRICED].filter((id) => priced.has(id))
    expect(stale, `now priced — remove from KNOWN_UNPRICED: ${stale.join(', ')}`).toEqual([])
  })

  it('every price entry references a known catalog item', () => {
    const unknown = priceEntries.filter((p) => !catalogIds.has(p.itemId)).map((p) => p.itemId)
    expect(unknown, `prices for unknown items: ${unknown.join(', ')}`).toEqual([])
  })
})
