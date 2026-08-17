'use client'

import { glossary, type GlossaryEntry, type GlossaryId } from '@elec-assistant/data'
import { CitationChips } from '@/components/calculators/citation-chips'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Wraps a technical term with a glossary tooltip: plain-Spanish definition,
 * regional synonyms, English name, and related NEC articles. PRD: «never
 * blocked by a name». `id` is compile-time checked against the data glossary.
 */
export function Term({ id, children }: { id: GlossaryId; children: React.ReactNode }) {
  // Widen from the per-entry literal type so optional fields are accessible.
  const entry: GlossaryEntry = glossary[id]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <p className="font-medium">{entry.es}</p>
        <p className="mt-1">{entry.definition.es}</p>
        <p className="mt-1 text-xs opacity-80">
          También: {entry.synonyms.join(', ')} · en inglés: {entry.en}
        </p>
        {entry.necArticles ? (
          <span className="mt-1.5 block">
            <CitationChips keys={entry.necArticles} />
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
