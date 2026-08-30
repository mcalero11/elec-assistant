import type { JobTemplate } from '@nec-assistant/data'

/**
 * Accent-stripped, lowercase scoring over template names + synonyms.
 * Deliberately not a fuzzy-search library: with one template, exact > prefix >
 * substring is fully predictable and unit-testable. Revisit (Fuse.js or similar)
 * once the seed set reaches ~5 templates and substring starts misfiring.
 */
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

function score(query: string, candidate: string): number {
  const c = normalize(candidate)
  if (c === query) return 3
  if (c.startsWith(query)) return 2
  if (c.includes(query)) return 1
  return 0
}

export function searchTemplates(templates: readonly JobTemplate[], rawQuery: string): JobTemplate[] {
  const query = normalize(rawQuery)
  if (query === '') return [...templates]
  return templates
    .map((t) => ({
      t,
      s: Math.max(
        score(query, t.name.es),
        score(query, t.name.en),
        ...t.synonyms.map((syn) => score(query, syn)),
      ),
    }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ t }) => t)
}
