import {
  NEC_EDITION,
  presetCatalogs,
  type CitationKey,
  type JobTemplate,
} from '@nec-assistant/data'
import type {
  ResidentialLoadResult,
  ResolvedTemplateState,
  TemplateCallResult,
  TemplateRunInput,
  TemplateRunResult,
} from '@nec-assistant/engine'
import { fmtDate, fmtNumber, fmtPercent, type Messages } from './i18n'
import { RETAILER_LABELS, fmtUsd, type PricingSummary } from './pricing'
import type { Retailer } from '@nec-assistant/data'

/**
 * Pure assembly of the memoria de cálculo (PRD US-6): one serializable model
 * that a single print-only renderer turns into the document for both the job
 * flows and the load calculator. Kept out of React so the section structure,
 * default markers, price markers, and footnote numbering are unit-testable.
 */

/* --------------------------------- model --------------------------------- */

export interface MemoriaRow {
  label: string
  value: string
  /** Small print under the row: default markers, worked arithmetic, applied rules. */
  note?: string
  citations: readonly CitationKey[]
}

export interface MemoriaItem {
  text: string
  citations: readonly CitationKey[]
}

export interface MemoriaBomRow {
  name: string
  qty: string
  /** Formatted unit price; undefined renders «sin precio». */
  unitPrice?: string
  total?: string
  override: boolean
  stale: boolean
  citations: readonly CitationKey[]
  note?: string
}

export type MemoriaBlock =
  | { kind: 'keyValue'; title: string; rows: MemoriaRow[] }
  | { kind: 'list'; title: string; items: MemoriaItem[]; tone?: 'warning' }
  | {
      kind: 'bom'
      title: string
      retailerLabel: string
      rows: MemoriaBomRow[]
      tools: MemoriaBomRow[]
      subtotal: string
      unpricedCount: number
      hasOverrides: boolean
      hasStale: boolean
    }

export interface CitationIndex {
  /** Deduped keys in first-use document order. */
  ordered: CitationKey[]
  /** 1-based footnote number per key. */
  numberOf: ReadonlyMap<CitationKey, number>
}

export interface MemoriaModel {
  title: string
  appName: string
  /** «NEC 2026». */
  necEdition: string
  generatedOn: string
  project?: string
  client?: string
  responsible?: string
  blocks: MemoriaBlock[]
  citations: CitationIndex
  disclaimer: string
}

/* ------------------------------- citations ------------------------------- */

export function collectCitations(
  groups: Iterable<readonly CitationKey[]>,
): CitationIndex {
  const ordered: CitationKey[] = []
  const numberOf = new Map<CitationKey, number>()
  for (const group of groups) {
    for (const key of group) {
      if (!numberOf.has(key)) {
        ordered.push(key)
        numberOf.set(key, ordered.length)
      }
    }
  }
  return { ordered, numberOf }
}

const blockCitationGroups = (blocks: readonly MemoriaBlock[]): CitationKey[][] => {
  const groups: (readonly CitationKey[])[] = []
  for (const block of blocks) {
    if (block.kind === 'keyValue') for (const row of block.rows) groups.push(row.citations)
    else if (block.kind === 'list') for (const item of block.items) groups.push(item.citations)
    else for (const row of [...block.rows, ...block.tools]) groups.push(row.citations)
  }
  return groups as CitationKey[][]
}

export const necEditionLabel = (): string => NEC_EDITION.replace('nec-', 'NEC ')

/* ------------------------------ job memoria ------------------------------ */

const formatValue = (value: unknown, unit?: string): string =>
  `${typeof value === 'number' ? fmtNumber(value) : String(value)}${unit ? ` ${unit}` : ''}`

function answerRows(
  template: JobTemplate,
  runInput: TemplateRunInput,
  state: ResolvedTemplateState,
  m: Messages,
): MemoriaRow[] {
  const rows: MemoriaRow[] = []
  const defaultNote = (provided: boolean) => (provided ? {} : { note: m.memoria.defaultValue })

  for (const q of template.questions) {
    if (q.type === 'preset') {
      const answer = state.answers[q.id] as Record<string, unknown> | undefined
      const presetId = answer && typeof answer.id === 'string' ? answer.id : undefined
      const preset = presetId
        ? presetCatalogs[q.catalog].find((p) => p.id === presetId)
        : undefined
      if (preset) {
        rows.push({
          label: q.label.es,
          value: `${preset.label.es}${preset.detail ? ` — ${preset.detail.es}` : ''}`,
          citations: [],
        })
      } else {
        rows.push({ label: q.label.es, value: m.jobs.manualEntry, citations: [] })
        for (const f of q.manualFields) {
          rows.push({
            label: f.label.es,
            value: formatValue((answer as Record<string, number> | undefined)?.[f.id] ?? f.default, f.unit),
            citations: [],
          })
        }
      }
    } else if (q.type === 'number') {
      rows.push({
        label: q.label.es,
        value: formatValue(state.answers[q.id], q.unit),
        citations: [],
        ...defaultNote(runInput.answers[q.id] !== undefined),
      })
    } else {
      const value = state.answers[q.id]
      const choice = q.choices.find((c) => c.value === value)
      rows.push({
        label: q.label.es,
        value: choice?.label.es ?? String(value),
        citations: [],
        ...defaultNote(runInput.answers[q.id] !== undefined),
      })
    }
  }

  for (const o of template.options) {
    if (state.disabledOptionIds.includes(o.id)) continue
    const value = state.options[o.id]
    const provided = runInput.options?.[o.id] !== undefined
    if (o.type === 'choice') {
      const choice = o.choices.find((c) => c.value === value)
      rows.push({
        label: o.label.es,
        value: choice?.label.es ?? String(value),
        citations: [],
        ...defaultNote(provided),
      })
    } else {
      rows.push({
        label: o.label.es,
        value: formatValue(value, o.unit),
        citations: [],
        ...defaultNote(provided),
      })
    }
  }

  return rows
}

function parameterRows(template: JobTemplate, result: TemplateRunResult): MemoriaRow[] {
  return result.parameters.map((p) => {
    const def = template.parameters.find((tp) => tp.id === p.id)
    return {
      label: p.label.es,
      value:
        def?.format === 'percent' ? fmtPercent(p.value as number) : formatValue(p.value, p.unit),
      citations: p.citations,
    }
  })
}

function callDetailBlocks(calls: readonly TemplateCallResult[], m: Messages): MemoriaBlock[] {
  return calls.map((call): MemoriaBlock => {
    switch (call.fn) {
      case 'sizeCircuit': {
        const r = call.result
        const governed = {
          ampacity: m.calibre.governedAmpacity,
          'voltage-drop': m.calibre.governedVoltageDrop,
          protection: m.calibre.governedProtection,
        }[r.governedBy]
        const breakerNotes = [
          ...(r.breaker.nextSizeUpApplied ? [m.memoria.nextSizeUpNote] : []),
          ...(r.breaker.minBreakerApplied ? [m.memoria.minBreakerNote] : []),
        ]
        return {
          kind: 'keyValue',
          title: m.memoria.circuitTitle,
          rows: [
            {
              label: m.calibre.conductor,
              value: String(r.conductor.size),
              citations: r.conductor.citations,
            },
            {
              label: m.calibre.deratedAmpacity,
              value: `${fmtNumber(r.conductor.deratedAmpacity)} A`,
              citations: [],
            },
            {
              label: m.memoria.requiredTermination,
              value: `${fmtNumber(r.conductor.requiredTermination)} A (${r.conductor.terminalRatingC} °C)`,
              citations: [],
            },
            {
              label: m.calibre.breaker,
              value: `${fmtNumber(r.breaker.rating)} A`,
              ...(breakerNotes.length > 0 ? { note: breakerNotes.join(' · ') } : {}),
              citations: r.breaker.citations,
            },
            {
              label: m.calibre.voltageDrop,
              value: `${fmtNumber(r.voltageDrop.dropVolts)} V (${fmtPercent(r.voltageDrop.dropPercent)})`,
              citations: r.voltageDrop.citations,
            },
            { label: m.calibre.governedBy, value: governed, citations: [] },
            {
              label: m.memoria.minByAmpacity,
              value: String(r.ampacityMinimumSize),
              citations: [],
            },
          ],
        }
      }
      case 'egcSize': {
        const r = call.result
        return {
          kind: 'keyValue',
          title: m.memoria.egcTitle,
          rows: [
            {
              label: m.calibre.conductor,
              value: String(r.size),
              ...(r.upsized
                ? { note: `${m.tierra.tableValue}: ${r.tableSize} · ${m.tierra.upsizedBadge}` }
                : {}),
              citations: r.citations,
            },
          ],
        }
      }
      case 'gecSize': {
        const r = call.result
        return {
          kind: 'keyValue',
          title: m.memoria.gecTitle,
          rows: [
            {
              label: m.calibre.conductor,
              value: String(r.size),
              ...(r.rodCapApplied
                ? { note: `${m.tierra.tableValue}: ${r.tableSize} · ${m.memoria.rodCapNote}` }
                : {}),
              citations: r.citations,
            },
          ],
        }
      }
      case 'sizeConduit': {
        const r = call.result
        return {
          kind: 'keyValue',
          title: m.memoria.conduitTitle,
          rows: [
            {
              label: m.relleno.fillActual,
              value: `${r.conduitType.toUpperCase()} ${r.tradeSize}″ — ${fmtPercent(r.fillPercentActual)} (${m.relleno.fillLimit} ${r.fillPercentLimit} %)`,
              note: `${fmtNumber(r.conductorAreaMm2)} mm² / ${fmtNumber(r.totalAreaMm2)} mm² · ${r.conductorCount} conductores`,
              citations: r.citations,
            },
          ],
        }
      }
      case 'boxFill': {
        const r = call.result
        return {
          kind: 'keyValue',
          title: m.memoria.boxTitle,
          rows: [
            {
              label: r.boxLabel?.es ?? m.memoria.boxTitle,
              value: `${fmtNumber(r.requiredVolumeCm3)} cm³ / ${fmtNumber(r.boxVolumeCm3)} cm³ (${fmtPercent(r.fillPercent)})`,
              citations: r.citations,
            },
          ],
        }
      }
    }
  })
}

function bomBlock(summary: PricingSummary, retailer: Retailer, m: Messages): MemoriaBlock {
  const unitLabel = { unidad: m.jobs.unitEach, m: m.jobs.unitMeter, 'tramo-3m': m.jobs.unitStick }
  const toRow = (l: PricingSummary['lines'][number]): MemoriaBomRow => ({
    name: l.line.name.es,
    qty: `${fmtNumber(l.line.qty)} ${unitLabel[l.line.unit]}${
      l.line.computedMeters !== undefined
        ? ` (${fmtNumber(l.line.computedMeters)} m ${m.jobs.metersComputed})`
        : ''
    }`,
    ...(l.unitPriceUsd !== undefined ? { unitPrice: fmtUsd(l.unitPriceUsd) } : {}),
    ...(l.lineTotalUsd !== undefined ? { total: fmtUsd(l.lineTotalUsd) } : {}),
    override: l.overrideUsd !== undefined,
    stale: l.stale,
    citations: l.line.citations,
    ...(l.line.note ? { note: l.line.note.es } : {}),
  })

  const materials = summary.lines.filter((l) => l.line.category === 'material').map(toRow)
  const tools = summary.lines.filter((l) => l.line.category === 'herramienta').map(toRow)
  const all = [...materials, ...tools]
  return {
    kind: 'bom',
    title: m.jobs.bomTitle,
    retailerLabel: RETAILER_LABELS[retailer],
    rows: materials,
    tools,
    subtotal: fmtUsd(summary.subtotalUsd),
    unpricedCount: summary.unpricedCount,
    hasOverrides: all.some((r) => r.override),
    hasStale: all.some((r) => r.stale),
  }
}

export interface ProjectInfo {
  project?: string
  client?: string
  responsible?: string
}

export interface JobMemoriaArgs extends ProjectInfo {
  template: JobTemplate
  runInput: TemplateRunInput
  state: ResolvedTemplateState
  result: TemplateRunResult
  summary: PricingSummary
  retailer: Retailer
  today: Date
  m: Messages
}

export function buildJobMemoria(args: JobMemoriaArgs): MemoriaModel {
  const { template, runInput, state, result, summary, retailer, today, m } = args

  const blocks: MemoriaBlock[] = [
    { kind: 'keyValue', title: m.memoria.sectionInputs, rows: answerRows(template, runInput, state, m) },
    { kind: 'keyValue', title: m.memoria.sectionParameters, rows: parameterRows(template, result) },
    ...callDetailBlocks(result.calls, m),
    ...(result.warnings.length > 0
      ? [
          {
            kind: 'list',
            title: m.jobs.warningsTitle,
            items: result.warnings.map((w) => ({ text: w.text.es, citations: [] })),
            tone: 'warning',
          } satisfies MemoriaBlock,
        ]
      : []),
    bomBlock(summary, retailer, m),
    {
      kind: 'list',
      title: m.common.assumptions,
      items: result.assumptions.map((a) => ({ text: a.es, citations: a.citations ?? [] })),
    },
  ]

  return {
    title: `${m.memoria.title} — ${template.name.es}`,
    appName: m.common.appName,
    necEdition: necEditionLabel(),
    generatedOn: fmtDate(today),
    ...(args.project ? { project: args.project } : {}),
    ...(args.client ? { client: args.client } : {}),
    ...(args.responsible ? { responsible: args.responsible } : {}),
    blocks,
    citations: collectCitations(blockCitationGroups(blocks)),
    disclaimer: m.common.disclaimer,
  }
}

/* ----------------------------- carga memoria ----------------------------- */

export interface CargaMemoriaArgs extends ProjectInfo {
  areaM2: number
  smallApplianceCircuits: number
  laundryCircuits: number
  result: ResidentialLoadResult
  today: Date
  m: Messages
}

const CATEGORY_LABEL_KEYS = {
  range: 'catRange',
  dryer: 'catDryer',
  fixed: 'catFixed',
  motor: 'catMotor',
  ac: 'catAc',
  heat: 'catHeat',
  covered: 'catCovered',
} as const

function methodBlock(
  method: ResidentialLoadResult['standard'],
  title: string,
  m: Messages,
): MemoriaBlock {
  return {
    kind: 'keyValue',
    title,
    rows: [
      ...method.lines.map((line) => ({
        label: line.label.es,
        value: `${fmtNumber(line.demandVa)} VA`,
        note: `${fmtNumber(line.connectedVa)} ${m.carga.connectedSuffix}${
          line.detail ? ` · ${line.detail.es}` : ''
        }`,
        citations: line.citations,
      })),
      {
        label: m.carga.totalDemand,
        value: `${fmtNumber(method.totalDemandVa)} VA — ${fmtNumber(method.amps)} A`,
        citations: [],
      },
      {
        label: m.carga.suggestedService,
        value: `${fmtNumber(method.serviceA)} A`,
        ...(method.serviceFlooredTo100 ? { note: m.carga.floored100 } : {}),
        citations: method.citations,
      },
    ],
  }
}

export function buildCargaMemoria(args: CargaMemoriaArgs): MemoriaModel {
  const { result, m, today } = args

  const blocks: MemoriaBlock[] = [
    {
      kind: 'keyValue',
      title: m.memoria.sectionInputs,
      rows: [
        { label: m.carga.area, value: `${fmtNumber(args.areaM2)} m²`, citations: [] },
        {
          label: m.carga.smallAppliance,
          value: fmtNumber(args.smallApplianceCircuits),
          citations: [],
        },
        { label: m.carga.laundry, value: fmtNumber(args.laundryCircuits), citations: [] },
      ],
    },
    {
      kind: 'keyValue',
      title: m.memoria.deviceListTitle,
      rows: result.devices.map((d) => ({
        label: `${fmtNumber(d.qty)} × ${d.label.es}`,
        value: `${fmtNumber(d.va * d.qty)} VA`,
        note: m.carga[CATEGORY_LABEL_KEYS[d.category]],
        citations: [],
      })),
    },
    methodBlock(result.standard, m.memoria.methodStandardTitle, m),
    methodBlock(result.optional, m.memoria.methodOptionalTitle, m),
    {
      kind: 'keyValue',
      title: m.memoria.resultTitle,
      rows: [
        {
          label: m.carga.governsTitle,
          value:
            result.governingMethod === 'standard'
              ? m.carga.governsStandard
              : m.carga.governsOptional,
          note: m.carga.governsDetail,
          citations: [],
        },
        {
          label: m.carga.suggestedService,
          value: `${fmtNumber(result.minServiceA)} A`,
          citations: result.citations,
        },
      ],
    },
    {
      kind: 'list',
      title: m.common.assumptions,
      items: result.assumptions.map((a) => ({ text: a.es, citations: a.citations ?? [] })),
    },
  ]

  return {
    title: `${m.memoria.title} — ${m.carga.title}`,
    appName: m.common.appName,
    necEdition: necEditionLabel(),
    generatedOn: fmtDate(today),
    ...(args.project ? { project: args.project } : {}),
    ...(args.client ? { client: args.client } : {}),
    ...(args.responsible ? { responsible: args.responsible } : {}),
    blocks,
    citations: collectCitations(blockCitationGroups(blocks)),
    disclaimer: m.common.disclaimer,
  }
}
