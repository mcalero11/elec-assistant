'use client'

import { useMemo } from 'react'
import {
  parseAsBoolean,
  parseAsFloat,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs'
import { TriangleAlert } from 'lucide-react'
import { CONDUCTOR_SIZES, type ConductorSize } from '@nec-assistant/data'
import {
  EngineError,
  evaluateConductor,
  gecSize,
  isNonCompliant,
  mergeAssumptions,
  mergeDeviations,
  minConductorForLoad,
  type ConductorEvaluation,
  type Deviation,
  type GecResult,
} from '@nec-assistant/engine'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { DeviationsPanel, NonComplianceBadge } from './deviations-panel'
import { InputSlider } from './input-slider'
import { ResultLine, ResultsCard } from './results-card'

const MATERIALS = ['copper', 'aluminum'] as const
const ELECTRODES = ['var', 'otro'] as const

/**
 * Declared here, not computed: whether the panel has a main disconnect is a
 * fact about the install the engine cannot know, so the calculator asks and
 * emits the deviation itself. The key matches the local-practice registry.
 */
const NO_MAIN_DEVIATION: Deviation = {
  key: 'no-main-disconnect',
  en: 'The service lands straight on the bus bars with no main disconnecting means; the NEC requires being able to de-energize the whole installation at the service (in practice: a main breaker) and to protect the panelboard.',
  es: 'La acometida llega directo a las barras sin un medio de desconexión principal; el NEC exige poder cortar toda la instalación en la acometida (en la práctica: un térmico principal) y proteger el tablero.',
  citations: ['nec2026.s230_70', 'nec2026.s230_71', 'nec2026.s408_36'],
  severity: 'off-code',
}

type Computation =
  | { ok: true; service: ConductorEvaluation; gec: GecResult }
  | { ok: false; error: EngineError }

export function AcometidaCalculator() {
  const m = getMessages()

  const [amps, setAmps] = useQueryState('a', parseAsFloat.withDefault(100))
  const [material, setMaterial] = useQueryState('mat', parseAsStringLiteral(MATERIALS).withDefault('copper'))
  // null = size the conductor from the amps; a value = what is actually installed.
  const [fixedSize, setFixedSize] = useQueryState('cal', parseAsStringLiteral(CONDUCTOR_SIZES))
  const [gecMaterial, setGecMaterial] = useQueryState('gmat', parseAsStringLiteral(MATERIALS).withDefault('copper'))
  const [electrode, setElectrode] = useQueryState('el', parseAsStringLiteral(ELECTRODES).withDefault('var'))
  const [damage, setDamage] = useQueryState('dano', parseAsBoolean.withDefault(false))
  const [noMain, setNoMain] = useQueryState('sinpral', parseAsBoolean.withDefault(false))

  const computation: Computation = useMemo(() => {
    try {
      const input = { loadA: amps, material, insulation: 'THHN' as const }
      const service = fixedSize ? evaluateConductor(fixedSize, input) : minConductorForLoad(input)
      const gec = gecSize({
        largestUngroundedSize: service.size,
        serviceMaterial: material,
        material: gecMaterial,
        electrode: electrode === 'var' ? 'rod' : 'other',
      })
      return { ok: true, service, gec }
    } catch (e) {
      if (e instanceof EngineError) return { ok: false, error: e }
      throw e
    }
  }, [amps, material, fixedSize, gecMaterial, electrode])

  const deviations = computation.ok
    ? mergeDeviations(computation.service.deviations, computation.gec.deviations, noMain ? [NO_MAIN_DEVIATION] : [])
    : noMain
      ? [NO_MAIN_DEVIATION]
      : []

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.acometida.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <InputSlider
            label={<Term id="acometida">{m.acometida.serviceAmps}</Term>}
            value={amps}
            onChange={setAmps}
            min={40}
            max={400}
            step={5}
            unit={m.common.amps}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">{m.acometida.serviceMaterial}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="w-full"
              value={material}
              onValueChange={(v) => v && setMaterial(v as (typeof MATERIALS)[number])}
            >
              <ToggleGroupItem value="copper" className="flex-1">
                {m.calibre.copper}
              </ToggleGroupItem>
              <ToggleGroupItem value="aluminum" className="flex-1">
                {m.calibre.aluminum}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={fixedSize !== null}
                onCheckedChange={(on) => void setFixedSize(on ? '6' : null)}
              />
              {m.acometida.fixSize}
            </label>
            {fixedSize !== null ? (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  <Term id="calibre">{m.acometida.installedSize}</Term>
                </Label>
                <Select value={fixedSize} onValueChange={(v) => setFixedSize(v as ConductorSize)}>
                  <SelectTrigger className="h-8 w-full text-sm">
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
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{m.acometida.autoSize}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              <Term id="gec">{m.acometida.gecMaterial}</Term>
            </Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="w-full"
              value={gecMaterial}
              onValueChange={(v) => v && setGecMaterial(v as (typeof MATERIALS)[number])}
            >
              <ToggleGroupItem value="copper" className="flex-1">
                {m.calibre.copper}
              </ToggleGroupItem>
              <ToggleGroupItem value="aluminum" className="flex-1">
                {m.calibre.aluminum}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              <Term id="varillaDeTierra">{m.acometida.electrode}</Term>
            </Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="w-full"
              value={electrode}
              onValueChange={(v) => v && setElectrode(v as (typeof ELECTRODES)[number])}
            >
              <ToggleGroupItem value="var" className="flex-1">
                {m.acometida.electrodeRod}
              </ToggleGroupItem>
              <ToggleGroupItem value="otro" className="flex-1">
                {m.acometida.electrodeOther}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={damage} onCheckedChange={setDamage} />
            {m.acometida.exposedDamage}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={noMain} onCheckedChange={setNoMain} />
            {m.acometida.noMain}
          </label>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Above the numbers, per the app-wide pattern: the reader must know the
            run is off-code before reading any figure. */}
        <DeviationsPanel deviations={deviations} />
        {!computation.ok ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{m.calibre.engineErrorTitle}</AlertTitle>
            <AlertDescription>{computation.error.es}</AlertDescription>
          </Alert>
        ) : (
          <AcometidaResults
            amps={amps}
            service={computation.service}
            gec={computation.gec}
            damage={damage}
            rod={electrode === 'var'}
            gecMaterial={gecMaterial}
            serviceMaterial={material}
            nonCompliant={isNonCompliant({ deviations })}
          />
        )}
        <Disclaimer />
      </div>
    </div>
  )
}

function AcometidaResults({
  amps,
  service,
  gec,
  damage,
  rod,
  gecMaterial,
  serviceMaterial,
  nonCompliant,
}: {
  amps: number
  service: ConductorEvaluation
  gec: GecResult
  damage: boolean
  rod: boolean
  gecMaterial: (typeof MATERIALS)[number]
  serviceMaterial: (typeof MATERIALS)[number]
  nonCompliant: boolean
}) {
  const m = getMessages()
  const matLabel = (mat: (typeof MATERIALS)[number]) => (mat === 'copper' ? 'Cu' : 'Al')

  // 250.64(B): under 6 AWG the GEC always needs mechanical protection; from
  // 6 AWG up it may run exposed unless it is subject to damage.
  const thin = CONDUCTOR_SIZES.indexOf(gec.size) < CONDUCTOR_SIZES.indexOf('6')
  const needsRaceway = thin || damage

  return (
    <>
      <ResultsCard
        title={m.acometida.serviceTitle}
        badge={nonCompliant ? <NonComplianceBadge /> : undefined}
      >
        <ResultLine
          label={<Term id="breaker">{m.acometida.mainBreaker}</Term>}
          value={`${fmtNumber(amps)} A`}
          detail={amps < 100 ? m.acometida.below100 : undefined}
          tone={amps < 100 ? 'warning' : 'default'}
          citations={['nec2026.s230_79']}
        />
        <ResultLine
          label={<Term id="calibre">{m.acometida.serviceConductor}</Term>}
          value={`${service.size} AWG/kcmil ${matLabel(serviceMaterial)}`}
          detail={`${m.acometida.ampacityDetail}: ${fmtNumber(service.deratedAmpacity)} A`}
          tone={service.satisfiesLoad ? 'default' : 'warning'}
          citations={service.citations}
        />
      </ResultsCard>

      <ResultsCard
        title={m.acometida.groundingTitle}
        badge={
          <>
            {nonCompliant ? <NonComplianceBadge /> : null}
            {gec.rodCapApplied ? <Badge variant="secondary">{m.acometida.rodCapBadge}</Badge> : null}
          </>
        }
      >
        <ResultLine
          label={<Term id="gec">{m.acometida.gec}</Term>}
          value={`${gec.size} AWG/kcmil ${matLabel(gecMaterial)}`}
          detail={gec.rodCapApplied ? `${m.acometida.tableValue}: ${gec.tableSize}` : undefined}
          citations={gec.citations}
        />
        <ResultLine
          label={m.acometida.raceway}
          value={needsRaceway ? m.acometida.racewayRequired : m.acometida.racewayExposedOk}
          detail={
            <>
              {thin
                ? m.acometida.racewayThinDetail
                : damage
                  ? m.acometida.racewayDamageDetail
                  : m.acometida.racewayExposedDetail}
              {needsRaceway ? ` ${m.acometida.racewayFerrousNote}` : null}
            </>
          }
        />
        {rod ? (
          <ResultLine
            label={<Term id="varillaDeTierra">{m.acometida.rodLine}</Term>}
            value={m.acometida.rodValue}
            detail={m.acometida.rodDetail}
            citations={['nec2026.s250_53']}
          />
        ) : null}
      </ResultsCard>

      <AssumptionsPanel assumptions={mergeAssumptions(service.assumptions, gec.assumptions)} />
    </>
  )
}
