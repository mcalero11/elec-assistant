'use client'

import { useMemo } from 'react'
import { createParser, parseAsInteger, useQueryState } from 'nuqs'
import Link from 'next/link'
import { ArrowRight, Plus, TriangleAlert, X } from 'lucide-react'
import {
  APPLIANCE_CATEGORIES,
  appliancePresets,
  type ApplianceCategory,
} from '@elec-assistant/data'
import {
  EngineError,
  residentialLoad,
  type LoadDeviceInput,
  type LoadMethodResult,
  type ResidentialLoadResult,
} from '@elec-assistant/engine'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { Disclaimer } from '@/components/disclaimer'
import { Term } from '@/components/term'
import { AssumptionsPanel } from './assumptions-panel'
import { InputSlider } from './input-slider'
import { ResultLine, ResultsCard } from './results-card'
import { fmtNumber, getMessages } from '@/lib/i18n'

/** Short URL codes for the Article 120 categories. */
const CAT_CODES = ['coc', 'sec', 'fij', 'mot', 'ac', 'cal', 'cub'] as const
type CatCode = (typeof CAT_CODES)[number]
const CATEGORY_BY_CODE: Record<CatCode, ApplianceCategory> = {
  coc: 'range',
  sec: 'dryer',
  fij: 'fixed',
  mot: 'motor',
  ac: 'ac',
  cal: 'heat',
  cub: 'covered',
}
const CODE_BY_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_BY_CODE).map(([code, cat]) => [cat, code]),
) as Record<ApplianceCategory, CatCode>

const PRESET_IDS = appliancePresets.map((p) => p.id) as readonly string[]

type DeviceRow =
  | { kind: 'preset'; qty: number; presetId: string }
  | { kind: 'custom'; qty: number; va: number; category: ApplianceCategory }

/**
 * Device rows travel in the URL joined by `_`:
 * preset `1xducha`, custom `1x4500@fij` (all-digits VA before the `@`).
 */
const deviceRowsParser = createParser<DeviceRow[]>({
  parse: (value) => {
    const rows: DeviceRow[] = []
    for (const token of value.split('_')) {
      const xIdx = token.indexOf('x')
      if (xIdx <= 0) return null
      const qty = Number(token.slice(0, xIdx))
      if (!Number.isInteger(qty) || qty < 1 || qty > 10) return null
      const rest = token.slice(xIdx + 1)
      const atIdx = rest.indexOf('@')
      if (atIdx > 0) {
        const va = Number(rest.slice(0, atIdx))
        const code = rest.slice(atIdx + 1)
        if (!Number.isFinite(va) || va <= 0 || va > 50000) return null
        if (!(CAT_CODES as readonly string[]).includes(code)) return null
        rows.push({ kind: 'custom', qty, va, category: CATEGORY_BY_CODE[code as CatCode] })
      } else {
        if (!PRESET_IDS.includes(rest)) return null
        rows.push({ kind: 'preset', qty, presetId: rest })
      }
    }
    return rows
  },
  serialize: (rows) =>
    rows
      .map((r) =>
        r.kind === 'preset' ? `${r.qty}x${r.presetId}` : `${r.qty}x${r.va}@${CODE_BY_CATEGORY[r.category]}`,
      )
      .join('_'),
  eq: (a, b) => JSON.stringify(a) === JSON.stringify(b),
})

const DEFAULT_DEVICES: DeviceRow[] = [
  { kind: 'preset', qty: 1, presetId: 'refri' },
  { kind: 'preset', qty: 1, presetId: 'ducha' },
]

const MANUAL = 'manual'

type Computation =
  | { kind: 'ok'; result: ResidentialLoadResult }
  | { kind: 'error'; error: EngineError }

export function CargaCalculator() {
  const m = getMessages()

  const [areaM2, setAreaM2] = useQueryState('a', parseAsInteger.withDefault(80))
  const [sa, setSa] = useQueryState('sa', parseAsInteger.withDefault(2))
  const [laundry, setLaundry] = useQueryState('la', parseAsInteger.withDefault(1))
  const [rows, setRows] = useQueryState('d', deviceRowsParser.withDefault(DEFAULT_DEVICES))

  const computation: Computation = useMemo(() => {
    try {
      const devices: LoadDeviceInput[] = rows.map((r) =>
        r.kind === 'preset'
          ? { presetId: r.presetId, qty: r.qty }
          : { va: r.va, category: r.category, qty: r.qty },
      )
      const result = residentialLoad({
        areaM2,
        smallApplianceCircuits: sa,
        laundryCircuits: laundry,
        devices,
      })
      return { kind: 'ok', result }
    } catch (e) {
      if (e instanceof EngineError) return { kind: 'error', error: e }
      throw e
    }
  }, [areaM2, sa, laundry, rows])

  const updateRow = (index: number, row: DeviceRow) =>
    void setRows(rows.map((r, i) => (i === index ? row : r)))
  const removeRow = (index: number) => void setRows(rows.filter((_, i) => i !== index))
  const addRow = () => void setRows([...rows, { kind: 'preset', qty: 1, presetId: 'micro' }])

  const categoryLabels: Record<ApplianceCategory, string> = {
    range: m.carga.catRange,
    dryer: m.carga.catDryer,
    fixed: m.carga.catFixed,
    motor: m.carga.catMotor,
    ac: m.carga.catAc,
    heat: m.carga.catHeat,
    covered: m.carga.catCovered,
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ------------------------------ inputs ------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.carga.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <InputSlider
            label={m.carga.area}
            value={areaM2}
            onChange={(v) => void setAreaM2(Math.round(v))}
            min={20}
            max={600}
            step={5}
            unit="m²"
          />

          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{m.carga.smallAppliance}</Label>
              <Input
                type="number"
                className="h-8 w-20 text-right tabular-nums"
                min={2}
                max={6}
                value={sa}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isInteger(v) && v >= 2 && v <= 6) void setSa(v)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{m.carga.laundry}</Label>
              <Input
                type="number"
                className="h-8 w-20 text-right tabular-nums"
                min={0}
                max={3}
                value={laundry}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isInteger(v) && v >= 0 && v <= 3) void setLaundry(v)
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{m.carga.devicesTitle}</Label>
            <p className="text-xs text-muted-foreground">{m.carga.verifyNameplate}</p>
            {rows.map((row, index) => (
              <div key={index} className="space-y-2 rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="h-8 w-14 text-right tabular-nums"
                    min={1}
                    max={10}
                    value={row.qty}
                    aria-label={m.carga.qty}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (Number.isInteger(v) && v >= 1 && v <= 10) updateRow(index, { ...row, qty: v })
                    }}
                  />
                  <span className="text-xs text-muted-foreground">×</span>
                  <Select
                    value={row.kind === 'preset' ? row.presetId : MANUAL}
                    onValueChange={(v) =>
                      updateRow(
                        index,
                        v === MANUAL
                          ? { kind: 'custom', qty: row.qty, va: 1000, category: 'fixed' }
                          : { kind: 'preset', qty: row.qty, presetId: v },
                      )
                    }
                  >
                    <SelectTrigger className="h-8 flex-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {appliancePresets.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label.es} · {fmtNumber(p.typicalVa)} W
                        </SelectItem>
                      ))}
                      <SelectItem value={MANUAL}>{m.carga.manualEntry}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    title={m.carga.removeDevice}
                    disabled={rows.length <= 1}
                    onClick={() => removeRow(index)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                {row.kind === 'custom' ? (
                  <div className="flex items-center gap-2 pl-16">
                    <div className="space-y-1">
                      <Label className="text-xs">
                        <Term id="vatio">{m.carga.watts}</Term>
                      </Label>
                      <Input
                        type="number"
                        className="h-8 w-24 text-right tabular-nums"
                        min={1}
                        max={50000}
                        value={row.va}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (v > 0 && v <= 50000) updateRow(index, { ...row, va: v })
                        }}
                      />
                    </div>
                    <div className="min-w-36 flex-1 space-y-1">
                      <Label className="text-xs">{m.carga.category}</Label>
                      <Select
                        value={row.category}
                        onValueChange={(v) => updateRow(index, { ...row, category: v as ApplianceCategory })}
                      >
                        <SelectTrigger className="h-8 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APPLIANCE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {categoryLabels[cat]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-3.5" /> {m.carga.addDevice}
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
          <CargaResults result={computation.result} />
        )}
        <Disclaimer />
      </div>
    </div>
  )
}

function MethodCard({ method, title, governing }: { method: LoadMethodResult; title: React.ReactNode; governing: boolean }) {
  const m = getMessages()
  return (
    <ResultsCard
      title={title}
      badge={governing ? <Badge variant="secondary">{m.carga.governsTitle}</Badge> : undefined}
      footer={
        <>
          <ResultLine
            label={<Term id="factorDemanda">{m.carga.totalDemand}</Term>}
            value={`${fmtNumber(method.totalDemandVa)} VA`}
            detail={`${m.carga.amps}: ${fmtNumber(method.amps)} A`}
          />
          <ResultLine
            label={<Term id="acometida">{m.carga.suggestedService}</Term>}
            value={`${method.serviceA} A`}
            detail={method.serviceFlooredTo100 ? m.carga.floored100 : undefined}
            citations={['nec2026.s240_6_a', 'nec2026.s230_79']}
          />
        </>
      }
    >
      {method.lines.map((line) => (
        <ResultLine
          key={line.key}
          label={line.label.es}
          value={`${fmtNumber(line.demandVa)} VA`}
          detail={
            line.detail
              ? `${fmtNumber(line.connectedVa)} ${m.carga.connectedSuffix} · ${line.detail.es}`
              : `${fmtNumber(line.connectedVa)} ${m.carga.connectedSuffix}`
          }
          citations={line.citations}
        />
      ))}
    </ResultsCard>
  )
}

function CargaResults({ result }: { result: ResidentialLoadResult }) {
  const m = getMessages()
  const governing = result[result.governingMethod]
  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-baseline justify-between gap-2 py-4">
          <div>
            <p className="text-sm text-muted-foreground">{m.carga.governsTitle}</p>
            <p className="text-lg font-semibold">
              {result.governingMethod === 'standard' ? m.carga.governsStandard : m.carga.governsOptional}
              {' → '}
              <span className="font-mono tabular-nums">{result.minServiceA} A</span>
            </p>
          </div>
          <p className="max-w-64 text-xs text-muted-foreground">{m.carga.governsDetail}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <MethodCard
          method={result.standard}
          title={m.carga.methodStandard}
          governing={result.governingMethod === 'standard'}
        />
        <MethodCard
          method={result.optional}
          title={<Term id="metodoOpcional">{m.carga.methodOptional}</Term>}
          governing={result.governingMethod === 'optional'}
        />
      </div>

      <div className="space-y-1">
        <Button asChild variant="outline" size="sm">
          <Link href={`/calculadoras/calibre/?a=${Math.round(governing.amps * 10) / 10}&v=240`}>
            {m.carga.chainButton} <ArrowRight className="size-3.5" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">{m.carga.chainHint}</p>
      </div>

      <AssumptionsPanel assumptions={result.assumptions} />
    </>
  )
}
