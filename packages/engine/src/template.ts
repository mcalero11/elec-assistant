import {
  catalogItems,
  type BomRule,
  type CatalogItem,
  type CitationKey,
  type Condition,
  type JobTemplate,
  type TemplateLabel,
} from '@elec-assistant/data'
import { sizeCircuit } from './circuit.js'
import { sizeConduit } from './conduit-fill.js'
import { egcSize } from './egc.js'
import {
  EngineError,
  mergeAssumptions,
  mergeCitations,
  type Assumption,
  type WithProvenance,
} from './types.js'

/**
 * Interpreter for declarative job templates (questions → engine-call graph →
 * BOM assembly rules). Templates are data; this module is the fixed vocabulary
 * that evaluates them. Pricing deliberately stays out of the engine — the web
 * layer joins BomLines against the price catalog.
 */

/* --------------------------------- context --------------------------------- */

export interface TemplateRunInput {
  /** Resolved answers by question id. Preset questions receive the resolved object (e.g. {mcaA, mocpA}). */
  answers: Record<string, unknown>
  /** Option values by option id; omitted options fall back to template defaults. */
  options?: Record<string, unknown>
}

interface RunContext {
  answers: Record<string, unknown>
  options: Record<string, unknown>
  calls: Record<string, unknown>
  derived: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getPath(ctx: RunContext, path: string): unknown {
  let current: unknown = ctx
  for (const segment of path.split('.')) {
    if (!isRecord(current) || !(segment in current)) {
      throw new EngineError(
        `Template reference not found: ${path}`,
        `Referencia de plantilla no encontrada: ${path}`,
      )
    }
    current = current[segment]
  }
  return current
}

function evalCondition(cond: Condition, ctx: RunContext): boolean {
  const value = getPath(ctx, cond.ref)
  if ('eq' in cond) return value === cond.eq
  if ('in' in cond) return cond.in.includes(value as string | number)
  return typeof value === 'number' && value >= cond.gte
}

/** Deep-resolve a spec: {$ref}/{$cond} nodes are replaced anywhere in the structure. */
function resolveDeep(spec: unknown, ctx: RunContext): unknown {
  if (Array.isArray(spec)) return spec.map((item) => resolveDeep(item, ctx))
  if (isRecord(spec)) {
    if (typeof spec['$ref'] === 'string') return getPath(ctx, spec['$ref'])
    if (isRecord(spec['$cond'])) {
      const c = spec['$cond'] as { if: Condition; then: unknown; else: unknown }
      return evalCondition(c.if, ctx) ? resolveDeep(c.then, ctx) : resolveDeep(c.else, ctx)
    }
    return Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, resolveDeep(v, ctx)]))
  }
  return spec
}

function resolveNumber(spec: unknown, ctx: RunContext, what: string): number {
  const value = resolveDeep(spec, ctx)
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new EngineError(
      `Template value for ${what} is not a number`,
      `El valor de plantilla para ${what} no es un número`,
    )
  }
  return value
}

/** Kill float noise (15 × 1.1 × 2 = 33.000000000000004) before ceiling. */
const ceilExact = (n: number): number => Math.ceil(Number(n.toFixed(6)))

/* ------------------------------- call registry ------------------------------- */

type EngineFn = (input: never) => WithProvenance & Record<string, unknown>

const CALL_REGISTRY: Record<string, EngineFn> = {
  sizeCircuit: sizeCircuit as unknown as EngineFn,
  sizeConduit: sizeConduit as unknown as EngineFn,
  egcSize: egcSize as unknown as EngineFn,
}

/* --------------------------------- results --------------------------------- */

export interface ResolvedParameter {
  id: string
  label: TemplateLabel
  value: string | number | boolean
  unit?: string
  citations: CitationKey[]
}

export interface BomLine {
  ruleId: string
  itemId: string
  name: TemplateLabel
  unit: CatalogItem['unit']
  category: CatalogItem['category']
  /** Purchasable quantity in the item's unit (sticks for tramo-3m, whole meters for m). */
  qty: number
  /** Raw computed meters, kept for display when the unit rounds (e.g. «16.5 m → 6 tramos»). */
  computedMeters?: number
  optional: boolean
  citations: CitationKey[]
  note?: TemplateLabel
}

export interface ResolvedWarning {
  id: string
  text: TemplateLabel
}

export interface TemplateRunResult extends WithProvenance {
  parameters: ResolvedParameter[]
  bom: BomLine[]
  warnings: ResolvedWarning[]
}

/* -------------------------------- interpreter -------------------------------- */

const itemsById = new Map<string, CatalogItem>(catalogItems.map((item) => [item.id, item]))

function resolveBomItem(rule: BomRule, ctx: RunContext): CatalogItem {
  let itemId: string
  if ('itemId' in rule.item) {
    itemId = rule.item.itemId
  } else {
    const key = rule.item.map.keys.map((ref) => String(getPath(ctx, ref))).join('|')
    const mapped = rule.item.map.table[key]
    if (!mapped) {
      throw new EngineError(
        `BOM rule ${rule.id} has no item mapping for key "${key}"`,
        `La regla de materiales ${rule.id} no tiene artículo asignado para la combinación "${key}"`,
      )
    }
    itemId = mapped
  }
  const item = itemsById.get(itemId)
  if (!item) {
    throw new EngineError(
      `BOM rule ${rule.id} references unknown catalog item ${itemId}`,
      `La regla de materiales ${rule.id} usa un artículo desconocido: ${itemId}`,
    )
  }
  return item
}

function computeQty(rule: BomRule, item: CatalogItem, ctx: RunContext): { qty: number; computedMeters?: number } {
  const q = rule.qty
  if ('fixed' in q) return { qty: q.fixed }
  if ('ref' in q) return { qty: resolveNumber({ $ref: q.ref }, ctx, `${rule.id}.qty`) }
  if ('perInterval' in q) {
    const lengthM = resolveNumber({ $ref: q.perInterval.lengthM }, ctx, `${rule.id}.lengthM`)
    const count = ceilExact(lengthM / q.perInterval.intervalM) + (q.perInterval.plus ?? 0)
    return { qty: Math.max(0, count) }
  }
  const spec = q.lengthWithWastage
  const lengthM = resolveNumber({ $ref: spec.lengthM }, ctx, `${rule.id}.lengthM`)
  const wastage = resolveNumber({ $ref: spec.wastagePercent }, ctx, `${rule.id}.wastage`)
  const meters = lengthM * (1 + wastage / 100) * (spec.multiplier ?? 1)
  if (item.unit === 'tramo-3m') return { qty: ceilExact(meters / 3.05), computedMeters: meters }
  if (item.unit === 'm') return { qty: ceilExact(meters), computedMeters: meters }
  return { qty: ceilExact(meters) }
}

export function runTemplate(template: JobTemplate, run: TemplateRunInput): TemplateRunResult {
  const ctx: RunContext = { answers: {}, options: {}, calls: {}, derived: {} }

  // Answers: template defaults fill numbers/choices; preset answers must arrive resolved.
  for (const q of template.questions) {
    const provided = run.answers[q.id]
    if (q.type === 'preset') {
      if (!isRecord(provided)) {
        throw new EngineError(
          `Answer "${q.id}" must be provided as a resolved object (preset questions are resolved by the caller)`,
          `La respuesta "${q.id}" debe llegar resuelta como objeto (las preguntas de catálogo se resuelven fuera del motor)`,
        )
      }
      ctx.answers[q.id] = provided
    } else {
      ctx.answers[q.id] = provided ?? q.default
    }
  }

  // Options: fall back to defaults; a disabled option is forced back to its default
  // so stale URL state cannot smuggle in an inapplicable choice.
  for (const opt of template.options) {
    ctx.options[opt.id] = run.options?.[opt.id] ?? opt.default
  }
  for (const opt of template.options) {
    if (opt.type === 'choice' && opt.disabledWhen && evalCondition(opt.disabledWhen, ctx)) {
      ctx.options[opt.id] = opt.default
    }
  }

  // Engine-call graph, in declaration order.
  for (const call of template.calls) {
    const fn = CALL_REGISTRY[call.fn]
    if (!fn) {
      throw new EngineError(
        `Template calls unknown engine function "${call.fn}"`,
        `La plantilla llama una función desconocida del motor: "${call.fn}"`,
      )
    }
    const input = resolveDeep(call.input, ctx) as never
    ctx.calls[call.id] = fn(input)
  }

  // Derived rules.
  for (const rule of template.derived) {
    const atLeast = resolveNumber(rule.atLeast, ctx, `derived.${rule.id}`)
    const rating = [...rule.ratings].sort((a, b) => a - b).find((r) => r >= atLeast)
    if (rating === undefined) {
      throw new EngineError(
        `No rating in [${rule.ratings.join(', ')}] covers ${atLeast} A for ${rule.id}`,
        `Ningún valor de [${rule.ratings.join(', ')}] cubre ${atLeast} A para ${rule.id}`,
      )
    }
    ctx.derived[rule.id] = {
      rating,
      citations: rule.citations,
      assumptions: rule.assumption ? [rule.assumption] : [],
    }
  }

  // Display parameters, each with its citations.
  const parameters: ResolvedParameter[] = template.parameters.map((p) => {
    const value = resolveDeep(p.value, ctx)
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      throw new EngineError(
        `Parameter ${p.id} did not resolve to a displayable value`,
        `El parámetro ${p.id} no se resolvió a un valor mostrable`,
      )
    }
    const fromResult = p.citationsFrom ? getPath(ctx, p.citationsFrom) : undefined
    const inherited =
      isRecord(fromResult) && Array.isArray(fromResult['citations'])
        ? (fromResult['citations'] as CitationKey[])
        : []
    return {
      id: p.id,
      label: p.label,
      value,
      ...(p.unit ? { unit: p.unit } : {}),
      citations: mergeCitations(inherited, p.citations ?? []),
    }
  })

  // BOM assembly.
  const bom: BomLine[] = []
  for (const rule of template.bom) {
    if (rule.when && !rule.when.every((cond) => evalCondition(cond, ctx))) continue
    const item = resolveBomItem(rule, ctx)
    const { qty, computedMeters } = computeQty(rule, item, ctx)
    if (qty <= 0) continue
    bom.push({
      ruleId: rule.id,
      itemId: item.id,
      name: item.name,
      unit: item.unit,
      category: item.category,
      qty,
      ...(computedMeters !== undefined ? { computedMeters } : {}),
      optional: rule.optional ?? false,
      citations: rule.citations ?? [],
      ...(rule.note ? { note: rule.note } : {}),
    })
  }

  const warnings: ResolvedWarning[] = template.warnings
    .filter((w) => evalCondition(w.when, ctx))
    .map((w) => ({ id: w.id, text: w.text }))

  const callResults = template.calls.map((c) => ctx.calls[c.id] as WithProvenance)
  const derivedResults = template.derived.map(
    (d) => ctx.derived[d.id] as { citations: CitationKey[]; assumptions: Assumption[] },
  )

  return {
    parameters,
    bom,
    warnings,
    citations: mergeCitations(
      ...callResults.map((r) => r.citations),
      ...derivedResults.map((r) => r.citations),
      ...parameters.map((p) => p.citations),
      ...bom.map((line) => line.citations),
    ),
    assumptions: mergeAssumptions(
      ...callResults.map((r) => r.assumptions),
      ...derivedResults.map((r) => r.assumptions),
    ),
  }
}
