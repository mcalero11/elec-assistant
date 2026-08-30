import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { allTemplates } from '@nec-assistant/data'
import { runTemplate } from '@nec-assistant/engine'

/**
 * Registry-driven golden runner: every template in `allTemplates` MUST have a
 * hand-verified fixture file test/golden/template-<id>.json (≥2 cases per the
 * PRD), and every template-*.json must correspond to a registered template —
 * a template without goldens fails CI, as does an orphaned fixture.
 */

interface GoldenCase {
  name: string
  answers: Record<string, unknown>
  options?: Record<string, unknown>
  expected: {
    parameters: Record<string, string | number | boolean>
    dropPercent?: number
    bom: Array<{ ruleId: string; itemId: string; qty: number; optional?: boolean }>
    assumptionKeys: string[]
    absentAssumptionKeys: string[]
    warningCount: number
  }
}

const goldenDir = fileURLToPath(new URL('./golden/', import.meta.url))

describe('template golden coverage (1:1 with the registry)', () => {
  it('every registered template has a golden fixture, and vice versa', () => {
    const fixtureIds = readdirSync(goldenDir)
      .filter((f) => f.startsWith('template-') && f.endsWith('.json'))
      .map((f) => f.slice('template-'.length, -'.json'.length))
      .sort()
    const templateIds = allTemplates.map((t) => t.id).sort()
    expect(fixtureIds).toEqual(templateIds)
  })

  it('every golden fixture has at least 2 hand-verified cases (PRD §4 Quality)', () => {
    for (const template of allTemplates) {
      const golden = loadGolden(template.id)
      expect(golden.cases.length, template.id).toBeGreaterThanOrEqual(2)
    }
  })
})

function loadGolden(id: string): { note: string; cases: GoldenCase[] } {
  return JSON.parse(readFileSync(join(goldenDir, `template-${id}.json`), 'utf8'))
}

for (const template of allTemplates) {
  describe(`runTemplate ${template.id} (golden)`, () => {
    for (const c of loadGolden(template.id).cases) {
      it(c.name, () => {
        const result = runTemplate(template, { answers: c.answers, options: c.options ?? {} })

        const byId = new Map(result.parameters.map((p) => [p.id, p]))
        for (const [id, value] of Object.entries(c.expected.parameters)) {
          expect(byId.get(id)?.value, `parameter ${id}`).toBe(value)
        }
        if (c.expected.dropPercent !== undefined) {
          expect(byId.get('drop')?.value as number).toBeCloseTo(c.expected.dropPercent, 3)
        }

        // Every parameter line must carry at least one citation (PRD: cited outputs).
        for (const p of result.parameters) {
          expect(p.citations.length, `citations of ${p.id}`).toBeGreaterThan(0)
        }

        expect(
          result.bom.map((line) => ({
            ruleId: line.ruleId,
            itemId: line.itemId,
            qty: line.qty,
            ...(line.optional ? { optional: true } : {}),
          })),
        ).toEqual(c.expected.bom)

        const keys = new Set(result.assumptions.map((a) => a.key))
        for (const k of c.expected.assumptionKeys) {
          expect(keys.has(k), `assumption ${k}`).toBe(true)
        }
        for (const k of c.expected.absentAssumptionKeys) {
          expect(keys.has(k), `assumption ${k} should be absent`).toBe(false)
        }
        expect(result.warnings.length).toBe(c.expected.warningCount)
      })
    }
  })
}
