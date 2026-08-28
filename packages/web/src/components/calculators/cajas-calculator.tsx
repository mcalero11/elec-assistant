'use client'

import { useMemo } from 'react'
import {
  createParser,
  parseAsBoolean,
  parseAsFloat,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs'
import { Plus, TriangleAlert, X } from 'lucide-react'
import {
  BOX_CONDUCTOR_SIZES,
  standardBoxes,
  type BoxConductorSize,
  type BoxShape,
} from '@elec-assistant/data'
import {
  EngineError,
  boxFill,
  sizeBox,
  type BoxConductorEntry,
  type BoxDeviceYokeEntry,
  type BoxFillResult,
} from '@elec-assistant/engine'
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

const MODES = ['min', 'ver'] as const

/** Shape filter keys (URL) → Table 314.16(A) shape groups. */
const SHAPE_KEYS = ['todas', 'oct', 'cua', 'disp', 'mamp', 'fsfd'] as const
type ShapeKey = (typeof SHAPE_KEYS)[number]
const SHAPE_BY_KEY: Record<Exclude<ShapeKey, 'todas'>, BoxShape> = {
  oct: 'round-octagonal',
  cua: 'square',
  disp: 'device',
  mamp: 'masonry',
  fsfd: 'fs-fd',
}

/** Sentinel for «other box: marked volume» in the `caja` param. */
const CUSTOM_BOX = 'custom'

/** Rows travel in the URL as `<count>x<size>` joined by `_` (e.g. 3x12_2x14). */
const conductorRowsParser = createParser<BoxConductorEntry[]>({
  parse: (value) => {
    const rows: BoxConductorEntry[] = []
    for (const token of value.split('_')) {
      const xIdx = token.indexOf('x')
      if (xIdx <= 0) return null
      const count = Number(token.slice(0, xIdx))
      const size = token.slice(xIdx + 1)
      if (!Number.isInteger(count) || count < 1 || count > 60) return null
      if (!(BOX_CONDUCTOR_SIZES as readonly string[]).includes(size)) return null
      rows.push({ count, size: size as BoxConductorSize })
    }
    return rows.length > 0 ? rows : null
  },
  serialize: (rows) => rows.map((r) => `${r.count}x${r.size}`).join('_'),
  eq: (a, b) => a.length === b.length && a.every((r, i) => r.count === b[i]?.count && r.size === b[i]?.size),
})

/** Yokes reuse the same token grammar; size = largest conductor on the yoke. */
const yokeRowsParser = createParser<BoxDeviceYokeEntry[]>({
  parse: (value) => {
    const rows: BoxDeviceYokeEntry[] = []
    for (const token of value.split('_')) {
      const xIdx = token.indexOf('x')
      if (xIdx <= 0) return null
      const count = Number(token.slice(0, xIdx))
      const size = token.slice(xIdx + 1)
      if (!Number.isInteger(count) || count < 1 || count > 10) return null
      if (!(BOX_CONDUCTOR_SIZES as readonly string[]).includes(size)) return null
      rows.push({ count, largestConductor: size as BoxConductorSize })
    }
    return rows
  },
  serialize: (rows) => rows.map((r) => `${r.count}x${r.largestConductor}`).join('_'),
  eq: (a, b) =>
    a.length === b.length &&
    a.every((r, i) => r.count === b[i]?.count && r.largestConductor === b[i]?.largestConductor),
})

/** Single token `<count>x<size>` for the EGC group (e.g. 2x12). */
const egcParser = createParser<{ count: number; size: BoxConductorSize }>({
  parse: (value) => {
    const xIdx = value.indexOf('x')
    if (xIdx <= 0) return null
    const count = Number(value.slice(0, xIdx))
    const size = value.slice(xIdx + 1)
    if (!Number.isInteger(count) || count < 0 || count > 20) return null
    if (!(BOX_CONDUCTOR_SIZES as readonly string[]).includes(size)) return null
    return { count, size: size as BoxConductorSize }
  },
  serialize: (v) => `${v.count}x${v.size}`,
  eq: (a, b) => a.count === b.count && a.size === b.size,
})

const DEFAULT_ROWS: BoxConductorEntry[] = [{ count: 4, size: '12' }]
const DEFAULT_YOKES: BoxDeviceYokeEntry[] = [{ count: 1, largestConductor: '12' }]
const DEFAULT_EGC = { count: 2, size: '12' as BoxConductorSize }

type Computation =
  | { kind: 'ok'; result: BoxFillResult }
  | { kind: 'error'; error: EngineError }

export function CajasCalculator() {
  const m = getMessages()

  const [mode, setMode] = useQueryState('modo', parseAsStringLiteral(MODES).withDefault('min'))
  const [shapeKey, setShapeKey] = useQueryState('forma', parseAsStringLiteral(SHAPE_KEYS).withDefault('todas'))
  const [boxId, setBoxId] = useQueryState('caja', parseAsString.withDefault('sq-100x54'))
  const [customVol, setCustomVol] = useQueryState('vol', parseAsFloat.withDefault(300))
  const [rows, setRows] = useQueryState('c', conductorRowsParser.withDefault(DEFAULT_ROWS))
  const [yokes, setYokes] = useQueryState('dev', yokeRowsParser.withDefault(DEFAULT_YOKES))
  const [egc, setEgc] = useQueryState('eg', egcParser.withDefault(DEFAULT_EGC))
  const [clamps, setClamps] = useQueryState('pr', parseAsBoolean.withDefault(false))
  const [stud, setStud] = useQueryState('st', parseAsBoolean.withDefault(false))
  const [hickey, setHickey] = useQueryState('hk', parseAsBoolean.withDefault(false))

  // A stale URL can carry an unknown box id — clamp to a real one.
  const effectiveBoxId =
    boxId === CUSTOM_BOX || standardBoxes.boxes.some((b) => b.id === boxId)
      ? boxId
      : (standardBoxes.boxes[0]?.id ?? CUSTOM_BOX)

  const items = useMemo(
    () => ({
      conductors: rows,
      internalClamps: clamps,
      luminaireStud: stud,
      hickey,
      deviceYokes: yokes,
      egcCount: egc.count,
      ...(egc.count >= 1 ? { largestEgc: egc.size } : {}),
    }),
    [rows, clamps, stud, hickey, yokes, egc],
  )

  const computation: Computation = useMemo(() => {
    try {
      const result =
        mode === 'min'
          ? sizeBox({
              ...items,
              ...(shapeKey !== 'todas' ? { shape: SHAPE_BY_KEY[shapeKey] } : {}),
            })
          : boxFill(
              effectiveBoxId === CUSTOM_BOX
                ? { ...items, volumeCm3: customVol }
                : { ...items, boxId: effectiveBoxId },
            )
      return { kind: 'ok', result }
    } catch (e) {
      if (e instanceof EngineError) return { kind: 'error', error: e }
      throw e
    }
  }, [mode, shapeKey, effectiveBoxId, customVol, items])

  const updateRow = (index: number, patch: Partial<BoxConductorEntry>) =>
    void setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const removeRow = (index: number) => void setRows(rows.filter((_, i) => i !== index))
  const addRow = () => void setRows([...rows, { count: 1, size: '12' }])

  const updateYoke = (index: number, patch: Partial<BoxDeviceYokeEntry>) =>
    void setYokes(yokes.map((y, i) => (i === index ? { ...y, ...patch } : y)))
  const removeYoke = (index: number) => void setYokes(yokes.filter((_, i) => i !== index))
  const addYoke = () => void setYokes([...yokes, { count: 1, largestConductor: '12' }])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
      {/* ------------------------------ inputs ------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.cajas.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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
                  {m.cajas.modeMin}
                </ToggleGroupItem>
                <ToggleGroupItem value="ver" className="flex-1">
                  {m.cajas.modeVerify}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {mode === 'min' ? (
            <div className="space-y-1.5">
              <Label className="text-xs">{m.cajas.shape}</Label>
              <Select value={shapeKey} onValueChange={(v) => setShapeKey(v as ShapeKey)}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">{m.cajas.shapeAll}</SelectItem>
                  <SelectItem value="oct">{m.cajas.shapeOct}</SelectItem>
                  <SelectItem value="cua">{m.cajas.shapeSquare}</SelectItem>
                  <SelectItem value="disp">{m.cajas.shapeDevice}</SelectItem>
                  <SelectItem value="mamp">{m.cajas.shapeMasonry}</SelectItem>
                  <SelectItem value="fsfd">{m.cajas.shapeFsFd}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-52 flex-1 space-y-1.5">
                <Label className="text-xs">{m.cajas.box}</Label>
                <Select value={effectiveBoxId} onValueChange={(v) => setBoxId(v)}>
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {standardBoxes.boxes.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label.es} · {fmtNumber(b.volumeCm3)} cm³
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_BOX}>{m.cajas.customOption}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {effectiveBoxId === CUSTOM_BOX ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    <Term id="volumenDeCaja">{m.cajas.customVolume}</Term> ({m.cajas.cm3})
                  </Label>
                  <Input
                    type="number"
                    className="h-8 w-28 text-right tabular-nums"
                    min={1}
                    max={5000}
                    value={customVol}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (v > 0) void setCustomVol(v)
                    }}
                  />
                </div>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">{m.cajas.conductorsTitle}</Label>
            <p className="text-xs text-muted-foreground">{m.cajas.conductorsHint}</p>
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="number"
                  className="h-8 w-16 text-right tabular-nums"
                  min={1}
                  max={60}
                  value={row.count}
                  aria-label={m.cajas.count}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (Number.isInteger(v) && v >= 1 && v <= 60) updateRow(index, { count: v })
                  }}
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Select value={row.size} onValueChange={(v) => updateRow(index, { size: v as BoxConductorSize })}>
                  <SelectTrigger className="h-8 flex-1 text-sm" aria-label={m.cajas.size}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOX_CONDUCTOR_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s} AWG
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  title={m.cajas.removeConductor}
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(index)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-3.5" /> {m.cajas.addConductor}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              <Term id="yugo">{m.cajas.devicesTitle}</Term>
            </Label>
            {yokes.map((yoke, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="number"
                  className="h-8 w-16 text-right tabular-nums"
                  min={1}
                  max={10}
                  value={yoke.count}
                  aria-label={m.cajas.count}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (Number.isInteger(v) && v >= 1 && v <= 10) updateYoke(index, { count: v })
                  }}
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Select
                  value={yoke.largestConductor}
                  onValueChange={(v) => updateYoke(index, { largestConductor: v as BoxConductorSize })}
                >
                  <SelectTrigger className="h-8 flex-1 text-sm" aria-label={m.cajas.yokeLargest}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOX_CONDUCTOR_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s} AWG ({m.cajas.yokeLargest})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  title={m.cajas.removeYoke}
                  onClick={() => removeYoke(index)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addYoke}>
              <Plus className="size-3.5" /> {m.cajas.addYoke}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{m.cajas.egcTitle}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="h-8 w-16 text-right tabular-nums"
                min={0}
                max={20}
                value={egc.count}
                aria-label={m.cajas.egcCount}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isInteger(v) && v >= 0 && v <= 20) void setEgc({ ...egc, count: v })
                }}
              />
              <span className="text-xs text-muted-foreground">×</span>
              <Select
                value={egc.size}
                onValueChange={(v) => void setEgc({ ...egc, size: v as BoxConductorSize })}
              >
                <SelectTrigger className="h-8 flex-1 text-sm" aria-label={m.cajas.egcSize}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOX_CONDUCTOR_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s} AWG ({m.cajas.egcSize.toLowerCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={clamps} onCheckedChange={setClamps} />
              <Term id="prensacable">{m.cajas.clamps}</Term>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={stud} onCheckedChange={setStud} />
              {m.cajas.stud}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={hickey} onCheckedChange={setHickey} />
              {m.cajas.hickey}
            </label>
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
          <CajasResults result={computation.result} mode={mode} />
        )}
        <Disclaimer />
      </div>
    </div>
  )
}

function CajasResults({ result, mode }: { result: BoxFillResult; mode: 'min' | 'ver' }) {
  const m = getMessages()
  const boxName = result.boxLabel?.es ?? `${fmtNumber(result.boxVolumeCm3)} ${m.cajas.cm3}`
  const breakdownRows = [
    { label: m.cajas.catConductors, cm3: result.breakdown.conductorsCm3 },
    { label: m.cajas.catDevices, cm3: result.breakdown.devicesCm3 },
    { label: m.cajas.catEgc, cm3: result.breakdown.egcCm3 },
    { label: m.cajas.catClamps, cm3: result.breakdown.clampsCm3 },
    { label: m.cajas.catSupports, cm3: result.breakdown.supportFittingsCm3 },
  ].filter((row) => row.cm3 > 0)

  return (
    <>
      {mode === 'ver' && !result.fits ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>{m.cajas.fitsNo}</AlertTitle>
          <AlertDescription>
            <CitationChips keys={['nec2026.t314_16_b']} />
          </AlertDescription>
        </Alert>
      ) : null}
      <ResultsCard title={m.cajas.results}>
        <ResultLine
          label={mode === 'min' ? m.cajas.minBox : m.cajas.checkedBox}
          value={boxName}
          detail={result.boxLabel ? `${fmtNumber(result.boxVolumeCm3)} ${m.cajas.cm3}` : undefined}
          citations={result.citations}
          tone={mode === 'ver' && !result.fits ? 'destructive' : 'default'}
        />
        <ResultLine
          label={m.cajas.requiredVolume}
          value={`${fmtNumber(result.requiredVolumeCm3)} ${m.cajas.cm3}`}
          detail={`${result.countedConductors} conductores · ${m.cajas.boxVolume}: ${fmtNumber(result.boxVolumeCm3)} ${m.cajas.cm3}`}
        />
        <div className="py-2">
          <FillGauge
            fillPercentActual={result.fillPercent}
            fillPercentLimit={100}
            fits={result.fits}
            labels={{ title: m.cajas.gaugeTitle, limit: m.cajas.gaugeLimit }}
          />
        </div>
        <div className="space-y-1 py-2">
          <p className="text-xs font-medium">{m.cajas.breakdownTitle}</p>
          {breakdownRows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-mono tabular-nums">
                {fmtNumber(row.cm3)} {m.cajas.cm3}
              </span>
            </div>
          ))}
        </div>
        {result.egcQuarterRuleApplied ? (
          <p className="py-2 text-xs text-muted-foreground">{m.cajas.quarterNote}</p>
        ) : null}
      </ResultsCard>
      <AssumptionsPanel assumptions={result.assumptions} />
    </>
  )
}
