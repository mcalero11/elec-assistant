'use client'

import { useMemo, useState } from 'react'
import {
  parseAsFloat,
  parseAsInteger,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs'
import { FileDown, TriangleAlert } from 'lucide-react'
import {
  RETAILERS,
  acMinisplitTemplate,
  acPresets,
  type Retailer,
} from '@elec-assistant/data'
import { EngineError, runTemplate, type TemplateRunResult } from '@elec-assistant/engine'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Disclaimer } from '@/components/disclaimer'
import { GlossaryText } from '@/components/glossary-text'
import { Term } from '@/components/term'
import { AssumptionsPanel } from '@/components/calculators/assumptions-panel'
import { InputSlider } from '@/components/calculators/input-slider'
import { ResultLine, ResultsCard } from '@/components/calculators/results-card'
import { BomTable } from './bom-table'
import { fmtNumber, fmtPercent, getMessages } from '@/lib/i18n'
import { priceBom } from '@/lib/pricing'

const DEVICE_IDS = [...acPresets.map((p) => p.id), 'manual'] as const
const LOCATIONS = ['interior', 'exterior'] as const
const PANEL = ['2polos', 'ninguno'] as const
const CONDUITS = ['emt', 'pvc', 'lfnc'] as const
const BENDS = ['curvas', 'dobladora'] as const

const template = acMinisplitTemplate
const optionDef = (id: string) => template.options.find((o) => o.id === id)
const questionDef = (id: string) => template.questions.find((q) => q.id === id)

type Computation = { ok: true; result: TemplateRunResult } | { ok: false; error: EngineError }

export function JobRunner() {
  const m = getMessages()

  const [deviceId, setDeviceId] = useQueryState('d', parseAsStringLiteral(DEVICE_IDS).withDefault('ac-12k'))
  const [mca, setMca] = useQueryState('mca', parseAsFloat.withDefault(10))
  const [mocp, setMocp] = useQueryState('mocp', parseAsFloat.withDefault(15))
  const [lengthM, setLengthM] = useQueryState('l', parseAsFloat.withDefault(10))
  const [location, setLocation] = useQueryState('loc', parseAsStringLiteral(LOCATIONS).withDefault('exterior'))
  // No .withDefault: while untouched, the ambient follows the location choice
  // (mirrors the template's declarative default — 40°C outdoors, 35°C indoors).
  const [amb, setAmb] = useQueryState('amb', parseAsFloat)
  const [panelSlots, setPanelSlots] = useQueryState('p', parseAsStringLiteral(PANEL).withDefault('2polos'))
  const [conduitType, setConduitType] = useQueryState('cd', parseAsStringLiteral(CONDUITS).withDefault('emt'))
  const [bends, setBends] = useQueryState('bd', parseAsStringLiteral(BENDS).withDefault('curvas'))
  const [bendCount, setBendCount] = useQueryState('bc', parseAsInteger.withDefault(3))
  const [wastage, setWastage] = useQueryState('w', parseAsInteger.withDefault(10))
  const [retailer, setRetailer] = useQueryState('r', parseAsStringLiteral(RETAILERS).withDefault('vidri'))

  const [overrides, setOverrides] = useState<Map<string, number>>(new Map())
  const [today] = useState(() => new Date())

  const preset = acPresets.find((p) => p.id === deviceId)
  const device = preset
    ? { id: preset.id, mcaA: preset.typicalMcaA, mocpA: preset.typicalMocpA }
    : { mcaA: mca, mocpA: mocp }

  const ambientC = amb ?? (location === 'exterior' ? 40 : 35)

  const computation: Computation = useMemo(() => {
    try {
      const result = runTemplate(template, {
        answers: { device, runLengthM: lengthM, location, ambientC, panelSlots },
        options: { conduitType, bends, bendCount, wastagePercent: wastage },
      })
      return { ok: true, result }
    } catch (e) {
      if (e instanceof EngineError) return { ok: false, error: e }
      throw e
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.mcaA, device.mocpA, lengthM, location, ambientC, panelSlots, conduitType, bends, bendCount, wastage])

  const summary = useMemo(
    () => (computation.ok ? priceBom(computation.result.bom, retailer, overrides, today) : null),
    [computation, retailer, overrides, today],
  )

  const bendsDisabled = conduitType !== 'emt'
  const bendsDef = optionDef('bends')
  const conduitDef = optionDef('conduitType')
  const locationDef = questionDef('location')
  const panelDef = questionDef('panelSlots')

  const setOverride = (itemId: string, value: number) =>
    setOverrides((prev) => new Map(prev).set(itemId, value))
  const resetOverride = (itemId: string) =>
    setOverrides((prev) => {
      const next = new Map(prev)
      next.delete(itemId)
      return next
    })

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ------------------------------ inputs (hidden on print) ------------------------------ */}
      <div className="space-y-4 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{m.jobs.questionsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{questionDef('device')?.label.es}</Label>
              <Select value={deviceId} onValueChange={(v) => setDeviceId(v as (typeof DEVICE_IDS)[number])}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {acPresets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label.es} — corriente mínima (MCA) {p.typicalMcaA} A
                    </SelectItem>
                  ))}
                  <SelectItem value="manual">{m.jobs.manualEntry}</SelectItem>
                </SelectContent>
              </Select>
              {preset ? (
                <p className="text-[11px] text-muted-foreground">{m.jobs.presetNote}</p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">{m.jobs.mcaLabel}</Label>
                    <Input
                      type="number"
                      className="h-8"
                      min={1}
                      max={60}
                      value={mca}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (Number.isFinite(v) && v > 0) setMca(v)
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{m.jobs.mocpLabel}</Label>
                    <Input
                      type="number"
                      className="h-8"
                      min={1}
                      max={70}
                      value={mocp}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (Number.isFinite(v) && v > 0) setMocp(v)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <InputSlider
              label={questionDef('runLengthM')?.label.es ?? ''}
              value={lengthM}
              onChange={setLengthM}
              min={1}
              max={60}
              step={1}
              unit={m.common.meters}
            />

            <div className="space-y-1.5">
              <Label className="text-xs">{locationDef?.label.es}</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="w-full"
                value={location}
                onValueChange={(v) => v && setLocation(v as (typeof LOCATIONS)[number])}
              >
                {locationDef?.type === 'choice'
                  ? locationDef.choices.map((c) => (
                      <ToggleGroupItem key={c.value} value={c.value} className="flex-1">
                        {c.label.es}
                      </ToggleGroupItem>
                    ))
                  : null}
              </ToggleGroup>
            </div>

            <InputSlider
              label={
                <Term id="temperaturaAmbiente" icon>
                  {questionDef('ambientC')?.label.es ?? ''}
                </Term>
              }
              value={ambientC}
              onChange={setAmb}
              min={25}
              max={50}
              step={1}
              unit="°C"
            />

            <div className="space-y-1.5">
              <Label className="text-xs">{panelDef?.label.es}</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="w-full"
                value={panelSlots}
                onValueChange={(v) => v && setPanelSlots(v as (typeof PANEL)[number])}
              >
                {panelDef?.type === 'choice'
                  ? panelDef.choices.map((c) => (
                      <ToggleGroupItem key={c.value} value={c.value} className="flex-1">
                        {c.label.es}
                      </ToggleGroupItem>
                    ))
                  : null}
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{m.jobs.optionsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{conduitDef?.label.es}</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="w-full"
                value={conduitType}
                onValueChange={(v) => v && setConduitType(v as (typeof CONDUITS)[number])}
              >
                {conduitDef?.type === 'choice'
                  ? conduitDef.choices.map((c) => (
                      <ToggleGroupItem key={c.value} value={c.value} className="flex-1">
                        {c.value === 'lfnc' ? (
                          <Term id="poliducto">{c.label.es}</Term>
                        ) : (
                          c.label.es
                        )}
                      </ToggleGroupItem>
                    ))
                  : null}
              </ToggleGroup>
            </div>

            <div className="space-y-1.5">
              <Label className={`text-xs ${bendsDisabled ? 'opacity-50' : ''}`}>
                {bendsDef?.label.es}
              </Label>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="w-full"
                value={bendsDisabled ? 'curvas' : bends}
                disabled={bendsDisabled}
                onValueChange={(v) => v && setBends(v as (typeof BENDS)[number])}
              >
                {bendsDef?.type === 'choice'
                  ? bendsDef.choices.map((c) => (
                      <ToggleGroupItem key={c.value} value={c.value} className="flex-1">
                        {c.value === 'curvas' ? (
                          <Term id="curva">{c.label.es}</Term>
                        ) : (
                          <Term id="dobladora">{c.label.es}</Term>
                        )}
                      </ToggleGroupItem>
                    ))
                  : null}
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={`text-xs ${bendsDisabled && conduitType === 'lfnc' ? 'opacity-50' : ''}`}>
                  {optionDef('bendCount')?.label.es}
                </Label>
                <Input
                  type="number"
                  className="h-8"
                  min={0}
                  max={8}
                  disabled={conduitType === 'lfnc'}
                  value={bendCount}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (Number.isInteger(v) && v >= 0 && v <= 8) setBendCount(v)
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{optionDef('wastagePercent')?.label.es} (%)</Label>
                <Input
                  type="number"
                  className="h-8"
                  min={0}
                  max={30}
                  step={5}
                  value={wastage}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (Number.isInteger(v) && v >= 0 && v <= 30) setWastage(v)
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------ results ------------------------------ */}
      <div className="space-y-4">
        <div className="hidden print:block">
          <h2 className="text-lg font-bold">{template.name.es} — {m.common.appName}</h2>
          <p className="text-xs text-muted-foreground">
            {m.jobs.printedOn} {today.toLocaleDateString('es-SV')}
          </p>
        </div>

        {!computation.ok ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{m.calibre.engineErrorTitle}</AlertTitle>
            <AlertDescription>{computation.error.es}</AlertDescription>
          </Alert>
        ) : (
          <>
            {computation.result.warnings.map((w) => (
              <Alert key={w.id}>
                <TriangleAlert className="size-4" />
                <AlertTitle>{m.jobs.warningsTitle}</AlertTitle>
                <AlertDescription>{w.text.es}</AlertDescription>
              </Alert>
            ))}

            <ResultsCard title={m.jobs.parametersTitle}>
              {computation.result.parameters.map((p) => (
                <ResultLine
                  key={p.id}
                  label={<GlossaryText text={p.label.es} />}
                  value={
                    p.id === 'drop'
                      ? fmtPercent(p.value as number)
                      : `${typeof p.value === 'number' ? fmtNumber(p.value) : String(p.value)}${p.unit ? ` ${p.unit}` : ''}`
                  }
                  citations={p.citations}
                />
              ))}
            </ResultsCard>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{m.jobs.bomTitle}</CardTitle>
                <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
                  <FileDown className="size-3.5" /> {m.jobs.exportPdf}
                </Button>
              </CardHeader>
              <CardContent>
                {summary ? (
                  <BomTable
                    summary={summary}
                    retailer={retailer}
                    onRetailerChange={(r) => void setRetailer(r)}
                    onOverride={setOverride}
                    onReset={resetOverride}
                  />
                ) : null}
              </CardContent>
            </Card>

            <AssumptionsPanel assumptions={computation.result.assumptions} />
          </>
        )}

        <Disclaimer />
      </div>
    </div>
  )
}
