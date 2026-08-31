'use client'

import { useMemo } from 'react'
import {
  parseAsBoolean,
  parseAsFloat,
  parseAsInteger,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs'
import {
  EngineError,
  INSULATION_TEMP_RATING,
  evaluateConductor,
  isNonCompliant,
  mergeDeviations,
  sizeCircuit,
  standardBreaker,
  voltageDrop,
  type BreakerResult,
  type CircuitInput,
  type CircuitResult,
  type ConductorEvaluation,
  type Deviation,
  type Insulation,
  type VoltageDropResult,
} from '@nec-assistant/engine'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BOX_CONDUCTOR_SIZES, CONDUCTOR_SIZES, citationLabel, type ConductorSize } from '@nec-assistant/data'
import { CONDUIT_FILL_INSULATIONS } from '@nec-assistant/engine'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { ChevronDown, TriangleAlert } from 'lucide-react'
import { Disclaimer } from '@/components/disclaimer'
import { Term } from '@/components/term'
import { fmtNumber, fmtPercent, getMessages } from '@/lib/i18n'
import { cToF, fToC, ftToM, mToFt } from '@/lib/units'
import { AssumptionsPanel } from './assumptions-panel'
import { DeviationsPanel, NonComplianceBadge } from './deviations-panel'
import { DropChart } from './drop-chart'
import { InputSlider } from './input-slider'
import { NumberField } from './number-field'
import { ResultLine, ResultsCard } from './results-card'

const INSULATIONS = Object.keys(INSULATION_TEMP_RATING) as Insulation[]
const MATERIALS = ['copper', 'aluminum'] as const
const VOLTAGES = ['120', '240'] as const
const TERMINALS = ['auto', '60', '75'] as const
const SIZE_CHOICES = ['auto', ...CONDUCTOR_SIZES] as const

type Computation =
  | { kind: 'auto'; circuit: CircuitResult }
  | {
      kind: 'pinned'
      conductor: ConductorEvaluation
      drop: VoltageDropResult
      breaker: BreakerResult
      /** Merged by hand: pinned mode composes three results with no aggregator. */
      deviations: Deviation[]
    }
  | { kind: 'error'; error: EngineError }

export function CalibreCalculator() {
  const m = getMessages()

  // URL state is canonical and always metric — a shared link reproduces the exact scenario.
  const [loadA, setLoadA] = useQueryState('a', parseAsFloat.withDefault(24))
  const [lengthM, setLengthM] = useQueryState('m', parseAsFloat.withDefault(15))
  // 35°C default: El Salvador runs hotter than the 30°C table basis (user feedback).
  const [ambientC, setAmbientC] = useQueryState('t', parseAsFloat.withDefault(35))
  const [continuous, setContinuous] = useQueryState('c', parseAsBoolean.withDefault(true))
  const [material, setMaterial] = useQueryState('mat', parseAsStringLiteral(MATERIALS).withDefault('copper'))
  const [insulation, setInsulation] = useQueryState('ais', parseAsStringLiteral(INSULATIONS).withDefault('THHN'))
  const [voltage, setVoltage] = useQueryState('v', parseAsStringLiteral(VOLTAGES).withDefault('240'))
  const [cccCount, setCccCount] = useQueryState('ccc', parseAsInteger.withDefault(2))
  const [terminal, setTerminal] = useQueryState('term', parseAsStringLiteral(TERMINALS).withDefault('auto'))
  const [maxDrop, setMaxDrop] = useQueryState('drop', parseAsFloat.withDefault(3))
  const [pinned, setPinned] = useQueryState('fix', parseAsStringLiteral(SIZE_CHOICES).withDefault('auto'))
  const [imperial, setImperial] = useQueryState('u', parseAsBoolean.withDefault(false))

  const systemVoltage = Number(voltage)

  const computation: Computation = useMemo(() => {
    const input: CircuitInput = {
      loadA,
      continuous,
      lengthM,
      systemVoltage,
      material,
      insulation,
      ambientC,
      cccCount,
      terminalRatingC: terminal === 'auto' ? undefined : (Number(terminal) as 60 | 75),
      maxVoltageDropPercent: maxDrop,
    }
    try {
      if (pinned === 'auto') {
        return { kind: 'auto', circuit: sizeCircuit(input) }
      }
      const conductor = evaluateConductor(pinned, input)
      const drop = voltageDrop({
        currentA: loadA,
        lengthM,
        size: pinned,
        material,
        systemVoltage,
        maxDropPercent: maxDrop,
      })
      const breaker = standardBreaker({
        loadA,
        continuous,
        conductorProtectionAmpacity: conductor.protectionAmpacity,
      })
      return {
        kind: 'pinned',
        conductor,
        drop,
        breaker,
        deviations: mergeDeviations(conductor.deviations, drop.deviations, breaker.deviations),
      }
    } catch (e) {
      if (e instanceof EngineError) return { kind: 'error', error: e }
      throw e
    }
  }, [loadA, continuous, lengthM, systemVoltage, material, insulation, ambientC, cccCount, terminal, maxDrop, pinned])

  const governedLabel = {
    ampacity: m.calibre.governedAmpacity,
    'voltage-drop': m.calibre.governedVoltageDrop,
    protection: m.calibre.governedProtection,
  } as const

  const chartSize: ConductorSize | null =
    computation.kind === 'auto'
      ? computation.circuit.conductor.size
      : computation.kind === 'pinned'
        ? (pinned as ConductorSize)
        : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
      {/* ------------------------------ inputs ------------------------------ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{m.calibre.title}</CardTitle>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {m.common.imperialUnits}
            <Switch checked={imperial} onCheckedChange={setImperial} />
          </label>
        </CardHeader>
        <CardContent className="space-y-5">
          <InputSlider
            label={m.calibre.load}
            value={loadA}
            onChange={setLoadA}
            min={1}
            max={100}
            step={1}
            unit={m.common.amps}
          />
          <InputSlider
            label={
              <>
                {m.calibre.length} (
                <Term id="caidaDeTension">{m.calibre.voltageDrop.toLowerCase()}</Term>)
              </>
            }
            value={imperial ? Math.round(mToFt(lengthM)) : lengthM}
            onChange={(v) => setLengthM(imperial ? Math.round(ftToM(v) * 10) / 10 : v)}
            min={imperial ? 3 : 1}
            max={imperial ? 330 : 100}
            step={1}
            unit={imperial ? m.common.feet : m.common.meters}
          />
          <InputSlider
            label={m.calibre.ambient}
            value={imperial ? Math.round(cToF(ambientC)) : ambientC}
            onChange={(v) => setAmbientC(imperial ? Math.round(fToC(v)) : v)}
            min={imperial ? 50 : 10}
            max={imperial ? 158 : 70}
            step={1}
            unit={imperial ? m.common.degreesF : m.common.degreesC}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={continuous} onCheckedChange={setContinuous} />
              <Term id="cargaContinua">{m.calibre.continuous}</Term>
            </label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={voltage}
              onValueChange={(v) => v && setVoltage(v as (typeof VOLTAGES)[number])}
            >
              {VOLTAGES.map((v) => (
                <ToggleGroupItem key={v} value={v}>
                  {v} {m.common.volts}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium">
              {m.common.moreOptions}
              <ChevronDown className="size-4 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{m.calibre.material}</Label>
                  <Select value={material} onValueChange={(v) => setMaterial(v as (typeof MATERIALS)[number])}>
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="copper">{m.calibre.copper}</SelectItem>
                      <SelectItem value="aluminum">{m.calibre.aluminum}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    <Term id="aislamiento">{m.calibre.insulation}</Term>
                  </Label>
                  <Select value={insulation} onValueChange={(v) => setInsulation(v as Insulation)}>
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSULATIONS.map((ins) => (
                        <SelectItem key={ins} value={ins}>
                          {ins} ({INSULATION_TEMP_RATING[ins]} °C)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{m.calibre.cccCount}</Label>
                  <NumberField
                    className="h-8"
                    min={1}
                    max={60}
                    integer
                    value={cccCount}
                    onChange={setCccCount}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    <Term id="terminales">{m.calibre.terminalRating}</Term>
                  </Label>
                  <Select value={terminal} onValueChange={(v) => setTerminal(v as (typeof TERMINALS)[number])}>
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{m.calibre.terminalAuto}</SelectItem>
                      <SelectItem value="60">60 °C</SelectItem>
                      <SelectItem value="75">75 °C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{m.calibre.maxDrop}</Label>
                  {/* The 3% figure is an Informational Note, not a requirement, so it
                      is a softMax rather than a hard bound: enter what the job
                      actually is and the result says how far past the advice it sits. */}
                  <NumberField
                    className="h-8"
                    min={0.5}
                    max={25}
                    step={0.5}
                    softMax={3}
                    hint={m.calibre.maxDropHint}
                    value={maxDrop}
                    onChange={setMaxDrop}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    <Term id="calibre">{m.calibre.fixSize}</Term>
                  </Label>
                  <Select value={pinned} onValueChange={(v) => setPinned(v as (typeof SIZE_CHOICES)[number])}>
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{m.calibre.autoSize}</SelectItem>
                      {CONDUCTOR_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s} AWG/kcmil
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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
        ) : computation.kind === 'auto' ? (
          <AutoResults circuit={computation.circuit} governedLabel={governedLabel} />
        ) : (
          <PinnedResults computation={computation} maxDrop={maxDrop} />
        )}

        {chartSize && computation.kind !== 'error' ? (
          <Card>
            <CardContent className="pt-4">
              <DropChart
                size={chartSize}
                material={material}
                currentA={loadA}
                systemVoltage={systemVoltage}
                phase={1}
                lengthM={lengthM}
                maxDropPercent={maxDrop}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* PRD US-3 chaining: hand the sized conductors to the conduit-fill calculator. */}
        {computation.kind === 'auto' && CONDUIT_FILL_INSULATIONS.includes(insulation) ? (
          <div className="space-y-1">
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/calculadoras/tuberia/?c=${encodeURIComponent(
                  `${cccCount}x${computation.circuit.conductor.size}.${insulation}`,
                )}&tipo=emt&modo=min&egc=${computation.circuit.breaker.rating}`}
              >
                {m.calibre.chainButton} <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">{m.calibre.chainHint}</p>
          </div>
        ) : null}

        {/* Chaining: hand the sized conductors to the box-fill calculator (18–6 AWG only). */}
        {computation.kind === 'auto' &&
        (BOX_CONDUCTOR_SIZES as readonly string[]).includes(computation.circuit.conductor.size) ? (
          <div className="space-y-1">
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/calculadoras/cajas/?c=${encodeURIComponent(
                  `${cccCount}x${computation.circuit.conductor.size}`,
                )}&modo=min`}
              >
                {m.calibre.chainBoxButton} <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">{m.calibre.chainBoxHint}</p>
          </div>
        ) : null}

        {computation.kind === 'auto' ? (
          <AssumptionsPanel assumptions={computation.circuit.assumptions} />
        ) : computation.kind === 'pinned' ? (
          <AssumptionsPanel assumptions={computation.conductor.assumptions} />
        ) : null}

        <Disclaimer />
      </div>
    </div>
  )
}

function AutoResults({
  circuit,
  governedLabel,
}: {
  circuit: CircuitResult
  governedLabel: Record<CircuitResult['governedBy'], string>
}) {
  const m = getMessages()
  return (
    <>
      <DeviationsPanel deviations={circuit.deviations} />
      <ResultsCard
        title={m.calibre.results}
        badge={
          <>
            {isNonCompliant(circuit) ? <NonComplianceBadge /> : null}
            <Badge variant={circuit.governedBy === 'ampacity' ? 'secondary' : 'default'}>
              {m.calibre.governedBy}: {governedLabel[circuit.governedBy]}
            </Badge>
          </>
        }
      >
        <ResultLine
          label={<Term id="calibre">{m.calibre.conductor}</Term>}
          value={`${circuit.conductor.size} AWG/kcmil`}
          detail={`${m.calibre.deratedAmpacity}: ${fmtNumber(circuit.conductor.deratedAmpacity)} ${m.common.amps} · terminales ${circuit.conductor.terminalRatingC} °C`}
          citations={circuit.conductor.citations}
        />
        <ResultLine
          label={<Term id="breaker">{m.calibre.breaker}</Term>}
          value={`${circuit.breaker.rating} ${m.common.amps}`}
          detail={circuit.breaker.nextSizeUpApplied ? m.calibre.breakerNextUp : undefined}
          citations={circuit.breaker.citations}
        />
        <ResultLine
          label={<Term id="caidaDeTension">{m.calibre.voltageDrop}</Term>}
          value={`${fmtNumber(circuit.voltageDrop.dropVolts)} ${m.common.volts} · ${fmtPercent(circuit.voltageDrop.dropPercent)}`}
          citations={circuit.voltageDrop.citations}
        />
      </ResultsCard>
    </>
  )
}

function PinnedResults({
  computation,
  maxDrop,
}: {
  computation: Extract<Computation, { kind: 'pinned' }>
  maxDrop: number
}) {
  const m = getMessages()
  const { conductor, drop, breaker, deviations } = computation
  const overLimit = drop.dropPercent > maxDrop
  const nonCompliant = isNonCompliant({ deviations })
  return (
    <>
      {/* The two hand-rolled red alerts that used to live here (doesNotSatisfy,
          limitExceeded) are now engine deviations, so they render in the shared
          panel — amber, because a pinned size that misses is off-code, not
          uncomputable. */}
      <DeviationsPanel deviations={deviations} />
      <ResultsCard
        title={m.calibre.results}
        badge={nonCompliant ? <NonComplianceBadge /> : undefined}
      >
        <ResultLine
          label={<Term id="calibre">{m.calibre.conductor}</Term>}
          value={`${conductor.size} AWG/kcmil`}
          detail={`${m.calibre.deratedAmpacity}: ${fmtNumber(conductor.deratedAmpacity)} ${m.common.amps} · terminales ${conductor.terminalRatingC} °C`}
          citations={conductor.citations}
          tone={conductor.satisfiesLoad ? 'default' : 'warning'}
        />
        <ResultLine
          label={<Term id="breaker">{m.calibre.breaker}</Term>}
          value={`${breaker.rating} ${m.common.amps}`}
          detail={breaker.nextSizeUpApplied ? m.calibre.breakerNextUp : undefined}
          citations={breaker.citations}
          tone={breaker.protectsConductor ? 'default' : 'warning'}
        />
        <ResultLine
          label={<Term id="caidaDeTension">{m.calibre.voltageDrop}</Term>}
          value={`${fmtNumber(drop.dropVolts)} ${m.common.volts} · ${fmtPercent(drop.dropPercent)}`}
          citations={drop.citations}
          tone={overLimit ? 'warning' : 'default'}
        />
      </ResultsCard>
    </>
  )
}

