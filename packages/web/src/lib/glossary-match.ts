import { glossary, type GlossaryId } from '@elec-assistant/data'

/**
 * Pure tokenizer that finds glossary terms inside plain-Spanish strings coming
 * from the data package (template labels, BOM item names, assumption prose) so
 * the UI can wrap them in <Term> popovers without touching the source strings.
 *
 * Matching rules:
 * - Longest variant first (so «caída de tensión» beats «tensión»).
 * - Unicode word boundaries — no matches inside words or numbers.
 * - Variants containing an uppercase letter (acronyms/codes: MCA, THWN-2, EMT)
 *   match case-sensitively; everything else is case-insensitive.
 * - Only the FIRST occurrence of each term per text is linked, to keep prose
 *   from drowning in dotted underlines.
 */
export type GlossarySegment =
  | { kind: 'text'; text: string }
  | { kind: 'term'; text: string; id: GlossaryId }

interface Variant {
  text: string
  lower: string
  id: GlossaryId
  caseSensitive: boolean
  /** True when this spelling is the entry's own name (not a synonym). */
  isName: boolean
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const VARIANTS: readonly Variant[] = (Object.keys(glossary) as GlossaryId[])
  .flatMap((id) => {
    const entry = glossary[id]
    return [entry.es, ...entry.synonyms].map((text, i) => ({
      text,
      lower: text.toLowerCase(),
      id,
      caseSensitive: /\p{Lu}/u.test(text),
      isName: i === 0,
    }))
  })
  // Very short tokens are ambiguity magnets; 3 chars keeps AWG/BTU/MCM.
  .filter((v) => v.text.length >= 3)
  .sort((a, b) => b.text.length - a.text.length)

// On duplicate spellings across entries, an entry's OWN NAME beats another
// entry's synonym («AWG» → the awg entry, not calibre's synonym); ties keep
// the first seen.
const VARIANT_BY_LOWER = new Map<string, Variant>()
for (const v of VARIANTS) {
  const existing = VARIANT_BY_LOWER.get(v.lower)
  if (!existing || (v.isName && !existing.isName)) VARIANT_BY_LOWER.set(v.lower, v)
}

const TERM_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${VARIANTS.map((v) => escapeRegExp(v.text)).join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
)

export function matchGlossaryTerms(text: string): GlossarySegment[] {
  const segments: GlossarySegment[] = []
  const seen = new Set<GlossaryId>()
  let cursor = 0

  TERM_PATTERN.lastIndex = 0
  for (let m = TERM_PATTERN.exec(text); m !== null; m = TERM_PATTERN.exec(text)) {
    const matched = m[1] ?? m[0]
    const variant = VARIANT_BY_LOWER.get(matched.toLowerCase())
    // Acronyms/codes must match exactly; «mca» in prose is not the MCA rating.
    if (!variant || (variant.caseSensitive && matched !== variant.text) || seen.has(variant.id)) {
      continue
    }
    seen.add(variant.id)
    if (m.index > cursor) segments.push({ kind: 'text', text: text.slice(cursor, m.index) })
    segments.push({ kind: 'term', text: matched, id: variant.id })
    cursor = m.index + matched.length
  }

  if (cursor === 0) return [{ kind: 'text', text }]
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) })
  return segments
}
