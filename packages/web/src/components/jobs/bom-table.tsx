'use client'

import { useState } from 'react'
import { Pencil, RotateCcw, TriangleAlert } from 'lucide-react'
import type { Retailer } from '@elec-assistant/data'
import { RETAILERS } from '@elec-assistant/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getMessages, fmtNumber } from '@/lib/i18n'
import { RETAILER_LABELS, fmtUsd, type PricedLine, type PricingSummary } from '@/lib/pricing'
import { CitationChips } from '@/components/calculators/citation-chips'

function UnitLabel({ unit }: { unit: PricedLine['line']['unit'] }) {
  const m = getMessages()
  const label =
    unit === 'm' ? m.jobs.unitMeter : unit === 'tramo-3m' ? m.jobs.unitStick : m.jobs.unitEach
  return <span className="font-sans text-xs text-muted-foreground">{label}</span>
}

function PriceCell({
  priced,
  onOverride,
  onReset,
}: {
  priced: PricedLine
  onOverride: (itemId: string, value: number) => void
  onReset: (itemId: string) => void
}) {
  const m = getMessages()
  const [editing, setEditing] = useState(false)
  const { line, unitPriceUsd, overrideUsd, stale } = priced

  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        min={0}
        step={0.01}
        defaultValue={unitPriceUsd ?? 0}
        className="h-7 w-24 text-right font-mono text-xs tabular-nums"
        onBlur={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v) && v > 0) onOverride(line.itemId, v)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <span className="inline-flex items-center justify-end gap-1">
      {unitPriceUsd === undefined ? (
        <Badge variant="outline" className="font-normal text-[10px] text-muted-foreground">
          {m.jobs.noPrice}
        </Badge>
      ) : (
        <span
          className={`font-mono tabular-nums ${overrideUsd !== undefined ? 'font-semibold text-primary' : ''}`}
        >
          {fmtUsd(unitPriceUsd)}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-6 print:hidden"
        title={m.jobs.editPrice}
        onClick={() => setEditing(true)}
      >
        <Pencil className="size-3" />
      </Button>
      {overrideUsd !== undefined ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 print:hidden"
          title={m.jobs.resetPrice}
          onClick={() => onReset(line.itemId)}
        >
          <RotateCcw className="size-3" />
        </Button>
      ) : null}
      {stale ? (
        <TriangleAlert className="size-3.5 text-warning" aria-label={m.jobs.verifyStale} />
      ) : null}
    </span>
  )
}

function LineRow({
  priced,
  onOverride,
  onReset,
}: {
  priced: PricedLine
  onOverride: (itemId: string, value: number) => void
  onReset: (itemId: string) => void
}) {
  const m = getMessages()
  const { line, prices, overrideUsd, lineTotalUsd, stale } = priced
  const staleEntry = Object.values(prices).find((p) => p !== undefined)
  return (
    <TableRow className="align-top hover:bg-accent/50">
      <TableCell className="whitespace-normal py-2 pl-0 pr-2">
        <span className="text-sm">{line.name.es}</span>
        {line.note ? <span className="block text-xs text-muted-foreground">{line.note.es}</span> : null}
        {line.citations.length > 0 ? (
          <span className="mt-0.5 block">
            <CitationChips keys={line.citations} />
          </span>
        ) : null}
        {overrideUsd !== undefined ? (
          <span className="mt-0.5 block text-[10px] font-medium text-primary">
            {m.jobs.overridden}
          </span>
        ) : null}
        {stale && staleEntry ? (
          <span className="mt-0.5 block text-[10px] text-warning">
            {m.jobs.priceFrom} {staleEntry.updatedAt} — {m.jobs.verifyStale}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="py-2 pr-2 text-right font-mono tabular-nums">
        {fmtNumber(line.qty)} <UnitLabel unit={line.unit} />
        {line.computedMeters !== undefined && line.unit === 'tramo-3m' ? (
          <span className="block font-sans text-[10px] text-muted-foreground">
            ({m.jobs.metersComputed}: {fmtNumber(line.computedMeters)} m)
          </span>
        ) : null}
      </TableCell>
      <TableCell className="py-2 pr-2 text-right">
        <PriceCell priced={priced} onOverride={onOverride} onReset={onReset} />
      </TableCell>
      <TableCell className="py-2 pr-0 text-right font-mono tabular-nums">
        {lineTotalUsd !== undefined ? fmtUsd(lineTotalUsd) : '—'}
      </TableCell>
    </TableRow>
  )
}

export function BomTable({
  summary,
  retailer,
  onRetailerChange,
  onOverride,
  onReset,
}: {
  summary: PricingSummary
  retailer: Retailer
  onRetailerChange: (r: Retailer) => void
  onOverride: (itemId: string, value: number) => void
  onReset: (itemId: string) => void
}) {
  const m = getMessages()
  const consumables = summary.lines.filter((l) => !l.line.optional)
  const tools = summary.lines.filter((l) => l.line.optional)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <span className="text-sm text-muted-foreground">{m.jobs.retailer}</span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={retailer}
          onValueChange={(v) => v && onRetailerChange(v as Retailer)}
        >
          {RETAILERS.map((r) => (
            <ToggleGroupItem key={r} value={r}>
              {RETAILER_LABELS[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-8 pl-0 pr-2 font-medium text-muted-foreground">{m.jobs.colItem}</TableHead>
            <TableHead className="h-8 pr-2 text-right font-medium text-muted-foreground">{m.jobs.colQty}</TableHead>
            <TableHead className="h-8 pr-2 text-right font-medium text-muted-foreground">
              {m.jobs.colPrice} ({RETAILER_LABELS[retailer]})
            </TableHead>
            <TableHead className="h-8 pr-0 text-right font-medium text-muted-foreground">{m.jobs.colTotal}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consumables.map((priced) => (
            <LineRow key={priced.line.ruleId} priced={priced} onOverride={onOverride} onReset={onReset} />
          ))}
        </TableBody>
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={3} className="py-2 pl-0 pr-2 text-right text-sm font-medium">
              {m.jobs.subtotal} ({RETAILER_LABELS[retailer]})
              {summary.unpricedCount > 0 ? (
                <span className="block text-[10px] font-normal text-muted-foreground">
                  +{summary.unpricedCount} {m.jobs.unpricedCount}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="py-2 pr-0 text-right font-mono text-base font-bold tabular-nums">
              {fmtUsd(summary.subtotalUsd)}
            </TableCell>
          </TableRow>
          <TableRow className="border-0 hover:bg-transparent">
            <TableCell colSpan={3} className="py-1 pl-0 pr-2 text-right text-xs text-muted-foreground">
              {m.jobs.cheapestBasket}
              {summary.cheapestUnpricedCount > 0
                ? ` (+${summary.cheapestUnpricedCount} ${m.jobs.unpricedCount})`
                : ''}
            </TableCell>
            <TableCell className="py-1 pr-0 text-right font-mono text-sm font-semibold tabular-nums">
              {fmtUsd(summary.cheapestBasketUsd)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {tools.length > 0 ? (
        <div className="rounded-lg border border-dashed p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{m.jobs.toolsTitle}</p>
          <Table>
            <TableBody>
              {tools.map((priced) => (
                <LineRow key={priced.line.ruleId} priced={priced} onOverride={onOverride} onReset={onReset} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}
