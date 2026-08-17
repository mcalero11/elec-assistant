'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { glossary, type GlossaryEntry, type GlossaryId } from '@elec-assistant/data'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CitationChips } from '@/components/calculators/citation-chips'
import { getMessages } from '@/lib/i18n'

interface Row {
  id: GlossaryId
  entry: GlossaryEntry
  haystack: string
}

const ROWS: readonly Row[] = (Object.keys(glossary) as GlossaryId[])
  .map((id) => {
    const entry: GlossaryEntry = glossary[id]
    return {
      id,
      entry,
      haystack: [entry.es, entry.en, ...entry.synonyms].join(' ').toLowerCase(),
    }
  })
  .sort((a, b) => a.entry.es.localeCompare(b.entry.es, 'es'))

/**
 * Searchable glossary for whoever is starting out (PRD US-5, «never blocked by
 * a name»): filter by Spanish name, es-SV synonyms, or English name. Every card
 * shows the same content the inline <Term> popovers show, plus the NEC chips.
 */
export function GlossaryBrowser() {
  const m = getMessages()
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ROWS
    return ROWS.filter((r) => r.haystack.includes(q))
  }, [query])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.glosario.searchPlaceholder}
          className="pl-9"
          aria-label={m.glosario.searchPlaceholder}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{rows.length}</span> {m.glosario.resultCount}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {m.glosario.noResults}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ id, entry }) => (
            <Card key={id} className="py-4">
              <CardContent className="px-4">
                <p className="font-medium">{entry.es}</p>
                <p className="mt-1 text-sm text-muted-foreground">{entry.definition.es}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {m.glosario.also}: {entry.synonyms.join(', ')} · {m.glosario.inEnglish}:{' '}
                  {entry.en}
                </p>
                {entry.necArticles ? (
                  <span className="mt-2 block">
                    <CitationChips keys={entry.necArticles} />
                  </span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
