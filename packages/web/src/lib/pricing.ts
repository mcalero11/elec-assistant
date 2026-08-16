import {
  RETAILERS,
  priceEntries,
  type PriceEntry,
  type Retailer,
} from '@elec-assistant/data'
import type { BomLine } from '@elec-assistant/engine'

export const RETAILER_LABELS: Record<Retailer, string> = {
  vidri: 'Vidrí',
  freund: 'Freund',
  epa: 'EPA',
}

export const STALE_AFTER_DAYS = 60

export interface PricedLine {
  line: BomLine
  /** Catalog entries by retailer for this item. */
  prices: Partial<Record<Retailer, PriceEntry>>
  /** Per-quote user override in USD per unit — wins over any catalog value (PRD US-2). */
  overrideUsd?: number
  /** Effective unit price for the selected retailer (override ?? catalog), if any. */
  unitPriceUsd?: number
  lineTotalUsd?: number
  stale: boolean
}

export interface PricingSummary {
  lines: PricedLine[]
  /** Consumables subtotal for the selected retailer (optional tool lines excluded). */
  subtotalUsd: number
  unpricedCount: number
  /** Sum of each line's cheapest price across all retailers (overrides win). */
  cheapestBasketUsd: number
  cheapestUnpricedCount: number
}

const byItem = new Map<string, Partial<Record<Retailer, PriceEntry>>>()
for (const entry of priceEntries) {
  const slot = byItem.get(entry.itemId) ?? {}
  slot[entry.retailer] = entry
  byItem.set(entry.itemId, slot)
}

export function isStale(entry: PriceEntry, today: Date): boolean {
  const age = (today.getTime() - new Date(entry.updatedAt).getTime()) / 86_400_000
  return age > STALE_AFTER_DAYS
}

export function priceBom(
  bom: readonly BomLine[],
  retailer: Retailer,
  overrides: ReadonlyMap<string, number>,
  today: Date,
): PricingSummary {
  let subtotal = 0
  let unpriced = 0
  let cheapestTotal = 0
  let cheapestUnpriced = 0

  const lines: PricedLine[] = bom.map((line) => {
    const prices = byItem.get(line.itemId) ?? {}
    const overrideUsd = overrides.get(line.itemId)
    const entry = prices[retailer]
    const unitPriceUsd = overrideUsd ?? entry?.priceUsd
    const lineTotalUsd = unitPriceUsd !== undefined ? unitPriceUsd * line.qty : undefined

    if (!line.optional) {
      if (lineTotalUsd !== undefined) subtotal += lineTotalUsd
      else unpriced += 1

      const candidates = RETAILERS.map((r) => prices[r]?.priceUsd).filter(
        (p): p is number => p !== undefined,
      )
      const cheapestUnit =
        overrideUsd ?? (candidates.length > 0 ? Math.min(...candidates) : undefined)
      if (cheapestUnit !== undefined) cheapestTotal += cheapestUnit * line.qty
      else cheapestUnpriced += 1
    }

    return {
      line,
      prices,
      ...(overrideUsd !== undefined ? { overrideUsd } : {}),
      ...(unitPriceUsd !== undefined ? { unitPriceUsd } : {}),
      ...(lineTotalUsd !== undefined ? { lineTotalUsd } : {}),
      stale: entry !== undefined && overrideUsd === undefined && isStale(entry, today),
    }
  })

  return {
    lines,
    subtotalUsd: subtotal,
    unpricedCount: unpriced,
    cheapestBasketUsd: cheapestTotal,
    cheapestUnpricedCount: cheapestUnpriced,
  }
}

export const fmtUsd = (value: number): string =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(value)
