'use client'

import { useMemo, useState } from 'react'
import { createParser, parseAsInteger, parseAsStringLiteral, useQueryState } from 'nuqs'
import Link from 'next/link'
import { ArrowRight, FileDown, Plus, TriangleAlert, X } from 'lucide-react'
import {
  APPLIANCE_CATEGORIES,
  CONDUCTOR_SIZES,
  appliancePresets,
  type ApplianceCategory,
  type ConductorSize,
} from '@nec-assistant/data'
import {
  EngineError,
  evaluateConductor,
  isNonCompliant,
  residentialLoad,
  type ConductorEvaluation,
  type LoadDeviceInput,
  type LoadMethodResult,
  type ResidentialLoadResult,
} from '@nec-assistant/engine'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { MemoriaDocument } from '@/components/memoria/memoria-document'
import { ProjectInfoFields, useProjectInfo } from '@/components/memoria/project-info-fields'
import { AssumptionsPanel } from './assumptions-panel'
import { CitationChips } from './citation-chips'
import { DeviationsPanel, LocalPracticeLine, NonComplianceBadge } from './deviations-panel'
import { InputSlider } from './input-slider'
import { NumberField } from './number-field'
import { ResultLine, ResultsCard } from './results-card'
import { fmtNumber, getMessages } from '@/lib/i18n'
import { buildCargaMemoria } from '@/lib/memoria'

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

const SERVICE_MATERIALS = ['copper', 'aluminum'] as const

/** Below this much spare capacity the answer is «va justa», not «alcanza». */
const TIGHT_HEADROOM_FRACTION = 0.25

type DeviceRow =
  | { kind: 'preset'; qty: number; presetId: string }
  | { kind: 'custom'; qty: number; va: number; category: ApplianceCategory }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * One device row from its URL token: preset `1xducha`, custom `1x4500@fij`
 * (all-digits VA before the `@`). Returns null only when the token is
 * structurally unreadable — out-of-range numbers are clamped, because losing an
 * entire shared scenario over one stale number is worse than showing a
 * corrected one.
 */
function parseDeviceToken(token: string): DeviceRow | null {
  const xIdx = token.indexOf('x')
  if (xIdx <= 0) return null
  const rawQty = Number(token.slice(0, xIdx))
  if (!Number.isInteger(rawQty)) return null
  const qty = clamp(rawQty, 1, 99)
  const rest = token.slice(xIdx + 1)
  const atIdx = rest.indexOf('@')
  if (atIdx > 0) {
    const rawVa = Number(rest.slice(0, atIdx))
    const code = rest.slice(atIdx + 1)
    if (!Number.isFinite(rawVa) || rawVa <= 0) return null
    // An unknown category code is not recoverable — there is nothing to fall back to.
    if (!(CAT_CODES as readonly string[]).includes(code)) return null
    return {
      kind: 'custom',
      qty,
      va: clamp(rawVa, 1, 50000),
      category: CATEGORY_BY_CODE[code as CatCode],
    }
  }
  if (!PRESET_IDS.includes(rest)) return null
  return { kind: 'preset', qty, presetId: rest }
}

/** Device rows travel in the URL joined by `_`. */
const deviceRowsParser = createParser<DeviceRow[]>({
  parse: (value) => {
    const rows: DeviceRow[] = []
    for (const token of value.split('_')) {
      const row = parseDeviceToken(token)
      if (row) rows.push(row)
    }
    // Whole-link fallback only when nothing at all survived.
    return rows.length > 0 ? rows : null
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

/** Sentinel for «no especificar» in the installed-service select. */
const NONE = 'none'

const MANUAL = 'manual'

interface ServiceCheck {
  conductor: ConductorEvaluation
  /** Demand current of the governing method. */
  amps: number
  /** Lower of derated and termination ampacity — what the wire actually carries. */
  capacityA: number
  headroomA: number
  verdict: 'carries' | 'tight' | 'short'
}

type Computation =
  | { kind: 'ok'; result: ResidentialLoadResult }
  | { kind: 'error'; error: EngineError }

export function CargaCalculator() {
  const m = getMessages()

  const [areaM2, setAreaM2] = useQueryState('a', parseAsInteger.withDefault(80))
  const [sa, setSa] = useQueryState('sa', parseAsInteger.withDefault(2))
  const [laundry, setLaundry] = useQueryState('la', parseAsInteger.withDefault(1))
  const [rows, setRows] = useQueryState('d', deviceRowsParser.withDefault(DEFAULT_DEVICES))
  // null = not stated. Deliberately NOT defaulted to 6 AWG: it is the common
  // local case, but assuming a fact about someone's house is not ours to do.
  const [installed, setInstalled] = useQueryState('ac', parseAsStringLiteral(CONDUCTOR_SIZES))
  const [installedMat, setInstalledMat] = useQueryState(
    'acm',
    parseAsStringLiteral(SERVICE_MATERIALS).withDefault('copper'),
  )
  const [today] = useState(() => new Date())
  const projectInfo = useProjectInfo()

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

  /**
   * The comparison this calculator now leads with: the current the house actually
   * draws vs. what the conductor already between the meter and the panel can
   * carry. Insulation follows the acometida calculator's convention (THHN).
   */
  const serviceCheck: ServiceCheck | null = useMemo(() => {
    if (computation.kind !== 'ok' || !installed) return null
    try {
      const amps = computation.result[computation.result.governingMethod].amps
      const conductor = evaluateConductor(installed, {
        loadA: amps,
        material: installedMat,
        insulation: 'THHN',
      })
      // What the wire can carry, which is the lower of derating and terminals —
      // not protectionAmpacity, whose 240.4(D) cap is about breaker choice.
      const capacityA = Math.min(conductor.deratedAmpacity, conductor.terminationAmpacity)
      const headroomA = capacityA - amps
      const verdict: ServiceCheck['verdict'] = !conductor.satisfiesLoad
        ? 'short'
        : headroomA < amps * TIGHT_HEADROOM_FRACTION
          ? 'tight'
          : 'carries'
      return { conductor, amps, capacityA, headroomA, verdict }
    } catch {
      // A size with no Table 310.16 row for this material — nothing to compare.
      return null
    }
  }, [computation, installed, installedMat])

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

  const { project, client, responsible } = projectInfo
  const memoria = useMemo(
    () =>
      computation.kind === 'ok'
        ? buildCargaMemoria({
            areaM2,
            smallApplianceCircuits: sa,
            laundryCircuits: laundry,
            result: computation.result,
            today,
            m,
            ...(serviceCheck
              ? {
                  serviceCheck: {
                    size: serviceCheck.conductor.size,
                    materialLabel:
                      installedMat === 'copper' ? m.calibre.copper : m.calibre.aluminum,
                    capacityA: serviceCheck.capacityA,
                    headroomA: serviceCheck.headroomA,
                    verdict: serviceCheck.verdict,
                  },
                }
              : {}),
            ...(project ? { project } : {}),
            ...(client ? { client } : {}),
            ...(responsible ? { responsible } : {}),
          })
        : null,
    [
      computation,
      areaM2,
      sa,
      laundry,
      serviceCheck,
      installedMat,
      today,
      m,
      project,
      client,
      responsible,
    ],
  )

  return (
    <>
    <div className="grid gap-6 print:hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ------------------------------ inputs ------------------------------ */}
      <div className="space-y-4">
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
            {/* min={0}, not min={2}: houses here are routinely wired with one
                kitchen circuit or none, and the calculation should describe the
                house that exists. softMin carries what 120.52(A) asks for, and
                the engine marks the result «No cumple NEC». */}
            <div className="space-y-1.5">
              <Label className="text-xs">{m.carga.smallAppliance}</Label>
              <NumberField
                className="h-8 w-20 text-right tabular-nums"
                min={0}
                max={12}
                integer
                softMin={2}
                hint={m.carga.smallApplianceHint}
                value={sa}
                onChange={(v) => void setSa(v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{m.carga.laundry}</Label>
              <NumberField
                className="h-8 w-20 text-right tabular-nums"
                min={0}
                max={6}
                integer
                value={laundry}
                onChange={(v) => void setLaundry(v)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              <Term id="acometida">{m.carga.installedService}</Term>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={installed ?? NONE}
                onValueChange={(v) => void setInstalled(v === NONE ? null : (v as ConductorSize))}
              >
                <SelectTrigger className="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{m.carga.installedNone}</SelectItem>
                  {CONDUCTOR_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} AWG/kcmil
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={installedMat}
                onValueChange={(v) => void setInstalledMat(v as (typeof SERVICE_MATERIALS)[number])}
              >
                <SelectTrigger className="h-8 w-28 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copper">{m.calibre.copper}</SelectItem>
                  <SelectItem value="aluminum">{m.calibre.aluminum}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{m.carga.installedServiceHint}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{m.carga.devicesTitle}</Label>
            <p className="text-xs text-muted-foreground">{m.carga.verifyNameplate}</p>
            {rows.map((row, index) => (
              <div key={index} className="space-y-2 rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <NumberField
                    className="h-8 w-14 text-right tabular-nums"
                    min={1}
                    max={99}
                    integer
                    value={row.qty}
                    aria-label={m.carga.qty}
                    onChange={(v) => updateRow(index, { ...row, qty: v })}
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
                      <NumberField
                        className="h-8 w-24 text-right tabular-nums"
                        min={1}
                        max={50000}
                        value={row.va}
                        onChange={(v) => updateRow(index, { ...row, va: v })}
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

      <ProjectInfoFields info={projectInfo} />
      </div>

      {/* ------------------------------ results ----------------------------- */}
      <div className="space-y-4">
        {computation.kind === 'error' ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{m.calibre.engineErrorTitle}</AlertTitle>
            <AlertDescription>{computation.error.es}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <FileDown className="size-3.5" /> {m.jobs.exportPdf}
              </Button>
            </div>
            <CargaResults result={computation.result} serviceCheck={serviceCheck} />
          </>
        )}
        <Disclaimer />
      </div>
    </div>

    {memoria ? (
      <MemoriaDocument model={memoria} />
    ) : computation.kind === 'error' ? (
      // Prevents a blank printed page when the engine rejects the inputs.
      <p className="hidden text-sm print:block">
        {m.calibre.engineErrorTitle}: {computation.error.es}
      </p>
    ) : null}
    </>
  )
}

/**
 * «¿Alcanza su acometida?» — the calculated demand current, and when the user has
 * said what is installed, whether that conductor carries it and by how much.
 *
 * This is the calculator's headline because it is the question an electrician
 * standing in a finished house actually has. «Acometida sugerida» answers a
 * different one (what to run in a NEW service) and is a constant 100 A here.
 */
function VerdictCard({
  amps,
  check,
  nonCompliant,
}: {
  amps: number
  check: ServiceCheck | null
  nonCompliant: boolean
}) {
  const m = getMessages()
  const tone =
    check === null
      ? 'default'
      : check.verdict === 'short'
        ? 'warning'
        : check.verdict === 'tight'
          ? 'warning'
          : 'success'
  const verdictLabel =
    check === null
      ? null
      : check.verdict === 'short'
        ? m.carga.verdictShort
        : check.verdict === 'tight'
          ? m.carga.verdictTight
          : m.carga.verdictCarries

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-x-2 gap-y-1 space-y-0">
        <CardTitle className="min-w-0 flex-1 text-base">{m.carga.verdictTitle}</CardTitle>
        <span className="flex flex-wrap items-center justify-end gap-1">
          {verdictLabel ? (
            <Badge variant={tone === 'success' ? 'secondary' : 'warning'}>{verdictLabel}</Badge>
          ) : null}
          {nonCompliant ? <NonComplianceBadge /> : null}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            <Term id="factorDemanda">{m.carga.calculatedCurrent}</Term>
          </span>
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {fmtNumber(amps)} {m.common.amps}
          </span>
        </div>

        {check === null ? (
          <p className="text-xs text-muted-foreground">{m.carga.verdictPickPrompt}</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 border-t pt-2">
              <span className="text-sm text-muted-foreground">
                {m.carga.yourService} · {check.conductor.size} AWG/kcmil
              </span>
              <span
                className={`font-mono text-base font-semibold tabular-nums ${
                  check.verdict === 'short' ? 'text-warning' : ''
                }`}
              >
                {fmtNumber(check.capacityA)} {m.common.amps}
              </span>
            </div>
            <p className={`text-sm ${check.verdict === 'carries' ? 'text-success' : 'text-warning'}`}>
              {check.verdict === 'short'
                ? `${m.carga.verdictShort}: ${m.carga.verdictMissing} ${fmtNumber(Math.abs(check.headroomA))} ${m.common.amps}`
                : `${fmtNumber(check.headroomA)} ${m.common.amps} ${m.carga.verdictHeadroom}`}
            </p>
            {check.verdict === 'tight' ? (
              <p className="text-xs text-muted-foreground">{m.carga.verdictTightHint}</p>
            ) : null}
            <CitationChips keys={['nec2026.t310_16', 'nec2026.s110_14_c']} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MethodCard({
  method,
  title,
  governing,
}: {
  method: LoadMethodResult
  title: React.ReactNode
  governing: boolean
}) {
  const m = getMessages()
  return (
    <ResultsCard
      title={title}
      // The deviation is a property of the inputs, not of a method: stamping both
      // cards implied the two methods differed in compliance, and repeating the
      // badge three times on one screen just drowned out «Método que rige».
      badge={governing ? <Badge variant="secondary">{m.carga.governsBadge}</Badge> : undefined}
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

function CargaResults({
  result,
  serviceCheck,
}: {
  result: ResidentialLoadResult
  serviceCheck: ServiceCheck | null
}) {
  const m = getMessages()
  const governing = result[result.governingMethod]
  const nonCompliant = isNonCompliant(result)
  return (
    <>
      {/* Above the numbers: the reader must know the run is off-code before
          reading any figure from it. */}
      <DeviationsPanel deviations={result.deviations} />

      {/* Leads with the demand current, not the suggested service. The 230.79(C)
          floor pins «Acometida sugerida» at 100 A for essentially every dwelling
          here, so it is a constant, not an answer — while the current does move
          with the appliance list and is what tells you whether the conductor
          already in the wall holds. */}
      <VerdictCard
        amps={governing.amps}
        check={serviceCheck}
        nonCompliant={nonCompliant}
      />

      <Card>
        <CardContent className="flex flex-wrap items-baseline justify-between gap-2 py-4">
          <div>
            <p className="text-sm text-muted-foreground">{m.carga.codeMinimumTitle}</p>
            <p className="text-lg font-semibold">
              <span className="font-mono tabular-nums">{result.minServiceA} A</span>
              <span className="text-sm font-normal text-muted-foreground">
                {' · '}
                {m.carga.governsTitle}:{' '}
                {result.governingMethod === 'standard'
                  ? m.carga.governsStandard
                  : m.carga.governsOptional}
              </span>
            </p>
          </div>
          <p className="max-w-64 text-xs text-muted-foreground">{m.carga.governsDetail}</p>
          <div className="w-full basis-full">
            <LocalPracticeLine practiceKey="service-100a-floor" />
          </div>
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

      <div className="space-y-1">
        <Button asChild variant="outline" size="sm">
          <Link href={`/calculadoras/acometida/?a=${result.minServiceA}`}>
            {m.carga.chainAcometidaButton} <ArrowRight className="size-3.5" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">{m.carga.chainAcometidaHint}</p>
      </div>

      <AssumptionsPanel assumptions={result.assumptions} />
    </>
  )
}
