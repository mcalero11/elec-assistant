import { presetCatalogs, type JobTemplate } from '@nec-assistant/data'
import type { TemplateRunInput } from '@nec-assistant/engine'

/**
 * Pure mapping from raw query-string values to a `runTemplate` input — kept
 * out of React so the URL back-compat contract is unit-testable. Keys come
 * from each question/option's `urlKey` (fallback: its id); preset questions
 * resolve to answer objects via the template's `sets` mapping, or from the
 * manual fields when the value is «manual». Absent or invalid values are
 * OMITTED so `resolveTemplateState` fills the template defaults (this is what
 * keeps the ambient-follows-location behavior working generically).
 */

export const MANUAL_PRESET = 'manual'

export type RawParams = Record<string, string | null | undefined>

const parseNumber = (raw: string | null | undefined): number | undefined => {
  if (raw == null || raw === '') return undefined
  const v = Number(raw)
  return Number.isFinite(v) ? v : undefined
}

export function urlStateToRunInput(template: JobTemplate, params: RawParams): TemplateRunInput {
  const answers: Record<string, unknown> = {}
  const options: Record<string, unknown> = {}

  for (const q of template.questions) {
    const raw = params[q.urlKey ?? q.id]
    if (q.type === 'preset') {
      const catalog = presetCatalogs[q.catalog]
      if (raw === MANUAL_PRESET) {
        const manual: Record<string, number> = {}
        for (const field of q.manualFields) {
          manual[field.id] = parseNumber(params[field.urlKey ?? field.id]) ?? field.default
        }
        answers[q.id] = manual
      } else {
        const preset = catalog.find((p) => p.id === raw) ?? catalog.find((p) => p.id === q.default)
        if (!preset) continue // template misconfiguration — let the engine report it
        const resolved: Record<string, unknown> = { id: preset.id }
        for (const [field, valueKey] of Object.entries(q.sets)) {
          resolved[field] = preset.values[valueKey]
        }
        answers[q.id] = resolved
      }
    } else if (q.type === 'number') {
      const v = parseNumber(raw)
      if (v !== undefined) answers[q.id] = v
    } else {
      if (raw != null && q.choices.some((c) => c.value === raw)) answers[q.id] = raw
    }
  }

  for (const opt of template.options) {
    const raw = params[opt.urlKey ?? opt.id]
    if (opt.type === 'number') {
      const v = parseNumber(raw)
      if (v !== undefined) options[opt.id] = v
    } else {
      if (raw != null && opt.choices.some((c) => c.value === raw)) options[opt.id] = raw
    }
  }

  return { answers, options }
}

/** The current preset selection for the picker widget ('manual', a preset id, or the default). */
export function presetSelection(
  template: JobTemplate,
  questionId: string,
  params: RawParams,
): string {
  const q = template.questions.find((x) => x.id === questionId)
  if (!q || q.type !== 'preset') return MANUAL_PRESET
  const raw = params[q.urlKey ?? q.id]
  if (raw === MANUAL_PRESET) return MANUAL_PRESET
  return presetCatalogs[q.catalog].some((p) => p.id === raw) ? (raw as string) : q.default
}
