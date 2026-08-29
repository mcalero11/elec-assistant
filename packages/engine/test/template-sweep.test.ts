import { describe, expect, it } from 'vitest'
import { allTemplates, presetCatalogs } from '@elec-assistant/data'
import { runTemplate } from '@elec-assistant/engine'

/**
 * Reachability sweep: for every template, run the full cross-product of preset
 * ids and choice values (questions AND options) with numeric inputs at their
 * DEFAULTS, asserting runTemplate never throws — this catches BOM map-table
 * holes the static catalog lint cannot see (an engine output combination with
 * no item assigned).
 *
 * Numeric extremes and preset manual-entry are deliberately NOT swept: odd
 * manual nameplates may legitimately land on ratings/sizes with no local
 * item, where the honest bilingual «sin artículo asignado» error is the
 * designed behavior (mini-split precedent).
 */

interface Combo {
  answers: Record<string, unknown>
  options: Record<string, unknown>
}

function combos(template: (typeof allTemplates)[number]): Combo[] {
  let result: Combo[] = [{ answers: {}, options: {} }]

  for (const q of template.questions) {
    if (q.type === 'preset') {
      const catalog = presetCatalogs[q.catalog]
      result = result.flatMap((combo) =>
        catalog.map((preset) => {
          const resolved: Record<string, unknown> = { id: preset.id }
          for (const [field, key] of Object.entries(q.sets)) resolved[field] = preset.values[key]
          return { ...combo, answers: { ...combo.answers, [q.id]: resolved } }
        }),
      )
    } else if (q.type === 'choice') {
      result = result.flatMap((combo) =>
        q.choices.map((c) => ({ ...combo, answers: { ...combo.answers, [q.id]: c.value } })),
      )
    }
    // number questions: left absent → template default.
  }

  for (const opt of template.options) {
    if (opt.type === 'choice') {
      result = result.flatMap((combo) =>
        opt.choices.map((c) => ({ ...combo, options: { ...combo.options, [opt.id]: c.value } })),
      )
    }
  }

  return result
}

for (const template of allTemplates) {
  describe(`${template.id} reachability sweep`, () => {
    const all = combos(template)
    it(`every preset × choice combination runs clean (${all.length} combos, numbers at defaults)`, () => {
      for (const combo of all) {
        expect(
          () => runTemplate(template, combo),
          `${template.id} ${JSON.stringify(combo)}`,
        ).not.toThrow()
      }
    })
  })
}
