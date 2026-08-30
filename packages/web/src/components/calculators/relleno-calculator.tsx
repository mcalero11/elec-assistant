'use client'

import { useMemo } from 'react'
import {
  createParser,
  parseAsBoolean,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs'
import { Plus, TriangleAlert, X } from 'lucide-react'
import {
  CONDUCTOR_SIZES,
  TRADE_SIZES,
  conduitDimensions,
  type ConductorSize,
  type ConduitType,
  type TradeSize,
} from '@nec-assistant/data'
import {
  CONDUIT_FILL_INSULATIONS,
  EngineError,
  conduitFill,
  sizeConduit,
  type ConductorFillEntry,
  type ConduitFillResult,
  type Insulation,
} from '@nec-assistant/engine'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Disclaimer } from '@/components/disclaimer'
import { Term } from '@/components/term'
import { fmtNumber, getMessages } from '@/lib/i18n'
import { AssumptionsPanel } from './assumptions-panel'
import { CitationChips } from './citation-chips'
import { FillGauge } from './fill-gauge'
import { ResultLine, ResultsCard } from './results-card'

/** Table 5 building wire + PV wire (Note 5 actual dims); UF/USE excluded by the engine. */
const FILL_INSULATIONS = CONDUIT_FILL_INSULATIONS

const insulationLabel = (ins: Insulation): string => (ins === 'PV' ? 'PV (fotovoltaico)' : ins)

const CONDUIT_KEYS = ['emt', 'pvc', 'lfnc'] as const
type ConduitKey = (typeof CONDUIT_KEYS)[number]
const CONDUIT_BY_KEY: Record<ConduitKey, ConduitType> = {
  emt: 'EMT',
  pvc: 'PVC-40',
  lfnc: 'LFNC-B',
}
const CONDUIT_LABELS: Record<ConduitKey, string> = {
  emt: 'EMT',
  pvc: 'PVC C40',
  lfnc: 'Poliducto (LFNC)',
}

const MODES = ['min', 'ver'] as const

/** Rows travel in the URL as `<count>x<size>.<insulation>` joined by `_` (e.g. 2x10.THHN_1x10.THHN). */
const rowsParser = createParser<ConductorFillEntry[]>({
  parse: (value) => {
    const rows: ConductorFillEntry[] = []
    for (const token of value.split('_')) {
      const xIdx = token.indexOf('x')
      const dotIdx = token.lastIndexOf('.')
      if (xIdx <= 0 || dotIdx <= xIdx) return null
      const count = Number(token.slice(0, xIdx))
      const size = token.slice(xIdx + 1, dotIdx)
      const insulation = token.slice(dotIdx + 1)
      if (!Number.isInteger(count) || count < 1 || count > 60) return null
      if (!(CONDUCTOR_SIZES as readonly string[]).includes(size)) return null
      if (!(FILL_INSULATIONS as readonly string[]).includes(insulation)) return null
      rows.push({ count, size: size as ConductorSize, insulation: insulation as Insulation })
    }
    return rows.length > 0 ? rows : null
  },
  serialize: (rows) => rows.map((r) => `${r.count}x${r.size}.${r.insulation}`).join('_'),
  eq: (a, b) =>
    a.length === b.length &&
    a.every((r, i) => r.count === b[i]?.count && r.size === b[i]?.size && r.insulation === b[i]?.insulation),
})

const DEFAULT_ROWS: ConductorFillEntry[] = [
  { count: 2, size: '12', insulation: 'THHN' },
  { count: 1, size: '12', insulation: 'THHN' },
]

type Computation =
  | { kind: 'ok'; result: ConduitFillResult }
  | { kind: 'error'; error: EngineError }

export function RellenoCalculator() {
  const m = getMessages()

  const [conduitKey, setConduitKey] = useQueryState('tipo', parseAsStringLiteral(CONDUIT_KEYS).withDefault('emt'))
  const [mode, setMode] = useQueryState('modo', parseAsStringLiteral(MODES).withDefault('min'))
  const [tradeSize, setTradeSize] = useQueryState('ts', parseAsStringLiteral(TRADE_SIZES).withDefault('1/2'))
  const [nipple, setNipple] = useQueryState('nip', parseAsBoolean.withDefault(false))
  const [rows, setRows] = useQueryState('c', rowsParser.withDefault(DEFAULT_ROWS))

  const conduitType = CONDUIT_BY_KEY[conduitKey]
  const availableTradeSizes = TRADE_SIZES.filter(
    (s) => conduitDimensions.types[conduitType].sizes[s],
  )
  // A stale URL can carry a size the selected conduit type is not made in — clamp.
  const effectiveTradeSize: TradeSize = availableTradeSizes.includes(tradeSize)
    ? tradeSize
    : (availableTradeSizes[0] ?? '1/2')

  const computation: Computation = useMemo(() => {
    try {
      const result =
        mode === 'min'
          ? sizeConduit({ conduitType, conductors: rows, nipple })
          : conduitFill({ conduitType, tradeSize: effectiveTradeSize, conductors: rows, nipple })
      return { kind: 'ok', result }
    } catch (e) {
      if (e instanceof EngineError) return { kind: 'error', error: e }
      throw e
    }
  }, [mode, conduitType, effectiveTradeSize, rows, nipple])

  const updateRow = (index: number, patch: Partial<ConductorFillEntry>) =>
    void setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const removeRow = (index: number) => void setRows(rows.filter((_, i) => i !== index))
  const addRow = () => void setRows([...rows, { count: 1, size: '12', insulation: 'THHN' }])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
      {/* ------------------------------ inputs ------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.relleno.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs">{m.relleno.conduitType}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="w-full"
              value={conduitKey}
              onValueChange={(v) => v && setConduitKey(v as ConduitKey)}
            >
              {CONDUIT_KEYS.map((key) => (
                <ToggleGroupItem key={key} value={key} className="flex-1">
                  {key === 'lfnc' ? <Term id="poliducto">{CONDUIT_LABELS[key]}</Term> : CONDUIT_LABELS[key]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-44 flex-1 space-y-1.5">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="w-full"
                value={mode}
                onValueChange={(v) => v && setMode(v as (typeof MODES)[number])}
              >
                <ToggleGroupItem value="min" className="flex-1">
                  {m.relleno.modeMin}
                </ToggleGroupItem>
                <ToggleGroupItem value="ver" className="flex-1">
                  {m.relleno.modeVerify}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            {mode === 'ver' ? (
              <div className="space-y-1.5">
                <Label className="text-xs">{m.relleno.tradeSize}</Label>
                <Select value={effectiveTradeSize} onValueChange={(v) => setTradeSize(v as TradeSize)}>
                  <SelectTrigger className="h-8 w-28 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTradeSizes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s} {m.relleno.inches}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={nipple} onCheckedChange={setNipple} />
            {m.relleno.nipple}
          </label>

          <div className="space-y-2">
            <Label className="text-xs">{m.relleno.conductorsTitle}</Label>
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="number"
                  className="h-8 w-16 text-right tabular-nums"
                  min={1}
                  max={60}
                  value={row.count}
                  aria-label={m.relleno.count}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (Number.isInteger(v) && v >= 1 && v <= 60) updateRow(index, { count: v })
                  }}
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Select value={row.size} onValueChange={(v) => updateRow(index, { size: v as ConductorSize })}>
                  <SelectTrigger className="h-8 flex-1 text-sm" aria-label={m.relleno.size}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDUCTOR_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={row.insulation}
                  onValueChange={(v) => updateRow(index, { insulation: v as Insulation })}
                >
                  <SelectTrigger className="h-8 flex-1 text-sm" aria-label={m.relleno.insulation}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILL_INSULATIONS.map((ins) => (
                      <SelectItem key={ins} value={ins}>
                        {insulationLabel(ins)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  title={m.relleno.removeConductor}
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(index)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-3.5" /> {m.relleno.addConductor}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------ results ----------------------------- */}
      <div className="space-y-4">
        {computation.kind === 'error' ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{m.calibre.engineErrorTitle}</AlertTitle>
            <AlertDescription>{computation.error.es}</AlertDescription>
          </Alert>
        ) : (
          <RellenoResults result={computation.result} mode={mode} />
        )}
        <Disclaimer />
      </div>
    </div>
  )
}

function RellenoResults({ result, mode }: { result: ConduitFillResult; mode: 'min' | 'ver' }) {
  const m = getMessages()
  return (
    <>
      {mode === 'ver' && !result.fits ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>{m.relleno.fitsNo}</AlertTitle>
          <AlertDescription>
            <CitationChips keys={['nec2026.ch9_t1']} />
          </AlertDescription>
        </Alert>
      ) : null}
      <ResultsCard title={m.relleno.results}>
        <ResultLine
          label={mode === 'min' ? m.relleno.minTradeSize : m.relleno.checkedTradeSize}
          value={`${result.tradeSize} ${m.relleno.inches} (${result.metricDesignator} mm)`}
          detail={`${result.conduitType}`}
          citations={result.citations}
          tone={mode === 'ver' && !result.fits ? 'destructive' : 'default'}
        />
        <ResultLine
          label={m.relleno.conductorArea}
          value={`${fmtNumber(result.conductorAreaMm2)} mm²`}
          detail={`${result.conductorCount} conductores · ${m.relleno.fillLimit}: ${fmtNumber(result.allowedFillAreaMm2)} mm²`}
        />
        <div className="py-2">
          <FillGauge
            fillPercentActual={result.fillPercentActual}
            fillPercentLimit={result.fillPercentLimit}
            fits={result.fits}
          />
        </div>
        {result.note7Applied ? (
          <p className="py-2 text-xs text-muted-foreground">{m.relleno.note7}</p>
        ) : null}
      </ResultsCard>
      <AssumptionsPanel assumptions={result.assumptions} />
    </>
  )
}
