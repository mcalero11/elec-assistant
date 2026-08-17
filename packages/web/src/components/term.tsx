'use client'

import { CircleHelp } from 'lucide-react'
import { glossary, type GlossaryEntry, type GlossaryId } from '@elec-assistant/data'
import { CitationChips } from '@/components/calculators/citation-chips'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Wraps a technical term with a glossary popover: plain-Spanish definition,
 * regional synonyms, English name, and related NEC articles. PRD: «never
 * blocked by a name». `id` is compile-time checked against the data glossary.
 *
 * A popover (click/tap-toggled) instead of a hover tooltip so definitions are
 * reachable on touch devices — hover-only tooltips were invisible on mobile.
 *
 * Two trigger modes:
 * - default: the term text itself is the trigger (static text — labels, prose).
 * - `icon`: the text renders plain and a small «?» icon opens the popover.
 *   Use inside interactive parents (toggle buttons, menu items) where tapping
 *   the text must keep its original meaning (select the option).
 */
export function Term({
  id,
  icon = false,
  children,
}: {
  id: GlossaryId
  icon?: boolean
  children: React.ReactNode
}) {
  // Widen from the per-entry literal type so optional fields are accessible.
  const entry: GlossaryEntry = glossary[id]
  return (
    <Popover>
      {icon ? (
        <>
          {children}
          <PopoverTrigger
            onClick={(e) => e.stopPropagation()}
            className="ml-1 inline-flex shrink-0 cursor-help align-middle text-muted-foreground"
            aria-label={`¿Qué es ${entry.es}?`}
          >
            <CircleHelp className="size-3.5" aria-hidden />
          </PopoverTrigger>
        </>
      ) : (
        <PopoverTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.currentTarget.click()
              }
            }}
            className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4"
          >
            {children}
          </span>
        </PopoverTrigger>
      )}
      {/* Same inverted surface as the base tooltip pill, so glossary popups keep
          one look everywhere and the chip recolor stays correct (both themes). */}
      <PopoverContent className="w-auto max-w-72 border-transparent bg-foreground px-3 py-2 text-xs text-background">
        <p className="font-medium">{entry.es}</p>
        <p className="mt-1">{entry.definition.es}</p>
        <p className="mt-1 text-xs opacity-80">
          También: {entry.synonyms.join(', ')} · en inglés: {entry.en}
        </p>
        {entry.necArticles ? (
          <span className="mt-1.5 block">
            <CitationChips
              keys={entry.necArticles}
              chipClassName="border-background/40 text-background"
            />
          </span>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
