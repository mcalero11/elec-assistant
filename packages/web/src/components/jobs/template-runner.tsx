'use client'

import { useMemo, useState } from 'react'
import { parseAsString, parseAsStringLiteral, useQueryState, useQueryStates } from 'nuqs'
import { FileDown, TriangleAlert } from 'lucide-react'
import {
  RETAILERS,
  presetCatalogs,
  type JobTemplate,
  type TemplateOption,
  type TemplateQuestion,
} from '@nec-assistant/data'
import {
  EngineError,
  isNonCompliant,
  resolveTemplateState,
  runTemplate,
  type ResolvedTemplateState,
  type TemplateRunResult,
} from '@nec-assistant/engine'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Disclaimer } from '@/components/disclaimer'
import { GlossaryText } from '@/components/glossary-text'
import { Term } from '@/components/term'
import { AssumptionsPanel } from '@/components/calculators/assumptions-panel'
import { CitationChips } from '@/components/calculators/citation-chips'
import {
  DeviationsPanel,
  NonComplianceBadge,
} from '@/components/calculators/deviations-panel'
import { InputSlider } from '@/components/calculators/input-slider'
import { NumberField } from '@/components/calculators/number-field'
import { ResultLine, ResultsCard } from '@/components/calculators/results-card'
import { BomTable } from './bom-table'
import { MemoriaDocument } from '@/components/memoria/memoria-document'
import { ProjectInfoFields, useProjectInfo } from '@/components/memoria/project-info-fields'
import { fmtNumber, fmtPercent, getMessages } from '@/lib/i18n'
import { buildJobMemoria } from '@/lib/memoria'
import { priceBom } from '@/lib/pricing'
import { MANUAL_PRESET, presetSelection, urlStateToRunInput, type RawParams } from '@/lib/template-url'

/**
 * Schema-driven runner: widgets, URL keys, defaults, and disabled states all
 * come from the JobTemplate — no per-template code. Everything downstream of
 * runTemplate (warnings, parameters, priced BOM, assumptions, print) is shared.
 * The keys in RESERVED_RUNNER_KEYS (`r`, `pj`, `cl`, `rp`) are runner-owned;
 * template urlKeys must avoid them (test-enforced). Printing renders ONLY the
 * MemoriaDocument — the on-screen grid is print-hidden.
 */

type Computation = { ok: true; result: TemplateRunResult } | { ok: false; error: EngineError }

const urlKeys = (template: JobTemplate): string[] => {
  const keys: string[] = []
  for (const q of template.questions) {
    keys.push(q.urlKey ?? q.id)
    if (q.type === 'preset') for (const f of q.manualFields) keys.push(f.urlKey ?? f.id)
  }
  for (const o of template.options) keys.push(o.urlKey ?? o.id)
  return keys
}

export function TemplateRunner({ template }: { template: JobTemplate }) {
  const m = getMessages()

  const keyMap = useMemo(
    () => Object.fromEntries(urlKeys(template).map((k) => [k, parseAsString])),
    [template],
  )
  const [params, setParams] = useQueryStates(keyMap)
  const [retailer, setRetailer] = useQueryState('r', parseAsStringLiteral(RETAILERS).withDefault('vidri'))

  const [overrides, setOverrides] = useState<Map<string, number>>(new Map())
  const [today] = useState(() => new Date())
  const projectInfo = useProjectInfo()

  const runInput = useMemo(() => urlStateToRunInput(template, params as RawParams), [template, params])

  const computation: Computation = useMemo(() => {
    try {
      return { ok: true, result: runTemplate(template, runInput) }
    } catch (e) {
      if (e instanceof EngineError) return { ok: false, error: e }
      throw e
    }
  }, [template, runInput])

  // Effective values for untouched inputs + disabled options (shared engine logic).
  const state: ResolvedTemplateState = useMemo(
    () => resolveTemplateState(template, runInput),
    [template, runInput],
  )

  const summary = useMemo(
    () => (computation.ok ? priceBom(computation.result.bom, retailer, overrides, today) : null),
    [computation, retailer, overrides, today],
  )

  const setParam = (key: string, value: string | null) => void setParams({ [key]: value })

  const setOverride = (itemId: string, value: number) =>
    setOverrides((prev) => new Map(prev).set(itemId, value))
  const resetOverride = (itemId: string) =>
    setOverrides((prev) => {
      const next = new Map(prev)
      next.delete(itemId)
      return next
    })

  const numberOptions = template.options.filter((o) => o.type === 'number')
  const choiceOptions = template.options.filter((o) => o.type === 'choice')

  const { project, client, responsible } = projectInfo
  const memoria = useMemo(
    () =>
      computation.ok && summary
        ? buildJobMemoria({
            template,
            runInput,
            state,
            result: computation.result,
            summary,
            retailer,
            today,
            m,
            ...(project ? { project } : {}),
            ...(client ? { client } : {}),
            ...(responsible ? { responsible } : {}),
          })
        : null,
    [computation, summary, template, runInput, state, retailer, today, m, project, client, responsible],
  )

  return (
    <>
    <div className="grid gap-6 print:hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ------------------------------ inputs (hidden on print) ------------------------------ */}
      <div className="space-y-4 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{m.jobs.questionsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.questions.map((q) => (
              <QuestionWidget
                key={q.id}
                question={q}
                template={template}
                params={params as RawParams}
                state={state}
                setParam={setParam}
              />
            ))}
          </CardContent>
        </Card>

        {template.options.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{m.jobs.optionsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {choiceOptions.map((o) => (
                <OptionChoiceWidget key={o.id} option={o} state={state} setParam={setParam} />
              ))}
              {numberOptions.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {numberOptions.map((o) => (
                    <OptionNumberWidget key={o.id} option={o} state={state} setParam={setParam} />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <ProjectInfoFields info={projectInfo} />
      </div>

      {/* ------------------------------ results ------------------------------ */}
      <div className="space-y-4">
        {!computation.ok ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{m.calibre.engineErrorTitle}</AlertTitle>
            <AlertDescription>{computation.error.es}</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Compliance findings first, then the template's practical advice.
                A warning tagged with a severity is promoted into `deviations` by
                the engine, so it also appears above — the two channels are
                deliberately distinct: «Fuera de norma» vs «Avisos». */}
            <DeviationsPanel deviations={computation.result.deviations} />
            {computation.result.warnings.map((w) => (
              <Alert key={w.id}>
                <TriangleAlert className="size-4" />
                <AlertTitle>{m.jobs.warningsTitle}</AlertTitle>
                <AlertDescription>
                  <GlossaryText text={w.text.es} />
                  {w.citations.length > 0 ? (
                    <>
                      {' '}
                      <CitationChips keys={w.citations} />
                    </>
                  ) : null}
                </AlertDescription>
              </Alert>
            ))}

            <ResultsCard
              title={m.jobs.parametersTitle}
              badge={isNonCompliant(computation.result) ? <NonComplianceBadge /> : undefined}
            >
              {computation.result.parameters.map((p) => {
                const def = template.parameters.find((tp) => tp.id === p.id)
                return (
                  <ResultLine
                    key={p.id}
                    label={<GlossaryText text={p.label.es} />}
                    value={
                      def?.format === 'percent'
                        ? fmtPercent(p.value as number)
                        : `${typeof p.value === 'number' ? fmtNumber(p.value) : String(p.value)}${p.unit ? ` ${p.unit}` : ''}`
                    }
                    citations={p.citations}
                  />
                )
              })}
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

    {memoria ? (
      <MemoriaDocument model={memoria} />
    ) : !computation.ok ? (
      // Prevents a blank printed page when the engine rejects the inputs.
      <p className="hidden text-sm print:block">
        {m.calibre.engineErrorTitle}: {computation.error.es}
      </p>
    ) : null}
    </>
  )
}

/* ------------------------------- widgets ------------------------------- */

function LabelWithTerm({ termId, text }: { termId?: string; text: string }) {
  return termId ? (
    // icon mode: safe inside interactive parents; ids are compile-time checked in the schema.
    <Term id={termId as Parameters<typeof Term>[0]['id']} icon>
      {text}
    </Term>
  ) : (
    <>{text}</>
  )
}

function QuestionWidget({
  question: q,
  template,
  params,
  state,
  setParam,
}: {
  question: TemplateQuestion
  template: JobTemplate
  params: RawParams
  state: ResolvedTemplateState
  setParam: (key: string, value: string | null) => void
}) {
  const m = getMessages()
  const key = q.urlKey ?? q.id

  if (q.type === 'preset') {
    const catalog = presetCatalogs[q.catalog]
    const selection = presetSelection(template, q.id, params)
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">
          <LabelWithTerm termId={q.termId} text={q.label.es} />
        </Label>
        <Select value={selection} onValueChange={(v) => setParam(key, v)}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {catalog.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label.es}
                {p.detail ? ` — ${p.detail.es}` : ''}
              </SelectItem>
            ))}
            <SelectItem value={MANUAL_PRESET}>{m.jobs.manualEntry}</SelectItem>
          </SelectContent>
        </Select>
        {selection !== MANUAL_PRESET ? (
          q.presetNote ? (
            <p className="text-[11px] text-muted-foreground">{q.presetNote.es}</p>
          ) : null
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {q.manualFields.map((f) => {
              const fieldKey = f.urlKey ?? f.id
              const answer = state.answers[q.id] as Record<string, number> | undefined
              return (
                <div key={f.id} className="space-y-1">
                  <Label className="text-[11px]">{f.label.es}</Label>
                  {/* Was `v > 0`, which ignored f.min/f.max entirely. */}
                  <NumberField
                    className="h-8"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={answer?.[f.id] ?? f.default}
                    onChange={(v) => setParam(fieldKey, String(v))}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (q.type === 'number') {
    const value = state.answers[q.id] as number
    if ((q.ui ?? 'slider') === 'slider') {
      return (
        <InputSlider
          label={<LabelWithTerm termId={q.termId} text={q.label.es} />}
          value={value}
          onChange={(v) => setParam(key, String(v))}
          min={q.min}
          max={q.max}
          step={q.step}
          unit={q.unit}
        />
      )
    }
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">
          <LabelWithTerm termId={q.termId} text={q.label.es} />
        </Label>
        <NumberField
          className="h-8 w-24 text-right tabular-nums"
          min={q.min}
          max={q.max}
          step={q.step}
          value={value}
          onChange={(v) => setParam(key, String(v))}
        />
      </div>
    )
  }

  const value = state.answers[q.id] as string
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        <LabelWithTerm termId={q.termId} text={q.label.es} />
      </Label>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        className="w-full"
        value={value}
        onValueChange={(v) => v && setParam(key, v)}
      >
        {/* min-w-0 and wrapping text: with three longish choices the labels ran
            into each other and spilled past the group's edge. */}
        {q.choices.map((c) => (
          <ToggleGroupItem
            key={c.value}
            value={c.value}
            className="min-w-0 flex-1 whitespace-normal text-center leading-tight"
          >
            {c.termId ? <Term id={c.termId}>{c.label.es}</Term> : c.label.es}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

function OptionChoiceWidget({
  option: o,
  state,
  setParam,
}: {
  option: Extract<TemplateOption, { type: 'choice' }>
  state: ResolvedTemplateState
  setParam: (key: string, value: string | null) => void
}) {
  const key = o.urlKey ?? o.id
  const disabled = state.disabledOptionIds.includes(o.id)
  const value = state.options[o.id] as string
  return (
    <div className="space-y-1.5">
      <Label className={`text-xs ${disabled ? 'opacity-50' : ''}`}>
        <LabelWithTerm termId={o.termId} text={o.label.es} />
      </Label>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        className="w-full"
        value={value}
        disabled={disabled}
        onValueChange={(v) => v && setParam(key, v)}
      >
        {o.choices.map((c) => (
          <ToggleGroupItem key={c.value} value={c.value} className="flex-1">
            {c.termId ? <Term id={c.termId}>{c.label.es}</Term> : c.label.es}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

function OptionNumberWidget({
  option: o,
  state,
  setParam,
}: {
  option: Extract<TemplateOption, { type: 'number' }>
  state: ResolvedTemplateState
  setParam: (key: string, value: string | null) => void
}) {
  const key = o.urlKey ?? o.id
  const disabled = state.disabledOptionIds.includes(o.id)
  const value = state.options[o.id] as number
  return (
    <div className="space-y-1.5">
      <Label className={`text-xs ${disabled ? 'opacity-50' : ''}`}>
        <LabelWithTerm termId={o.termId} text={o.label.es} />
        {o.unit ? ` (${o.unit})` : ''}
      </Label>
      <NumberField
        className="h-8"
        min={o.min}
        max={o.max}
        step={o.step}
        disabled={disabled}
        value={value}
        onChange={(v) => setParam(key, String(v))}
      />
    </div>
  )
}
