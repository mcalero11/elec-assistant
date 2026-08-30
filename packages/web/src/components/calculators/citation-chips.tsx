'use client'

import { citationLabel, citationReason, type CitationKey } from '@nec-assistant/data'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * PRD: NEC citation on every output line — but chips lead with the plain-Spanish
 * REASON («ajuste por agrupamiento»), not the article number: the app serves
 * beginners, and a bare «Tabla 310.15(C)(1)» helps no one (user feedback). The
 * full citation opens on tap/click (hover-only titles were unreachable on touch).
 * `chipClassName` recolors the chips on non-default surfaces (e.g. the inverted
 * glossary popover, where the outline badge's text-foreground would be invisible).
 */
export function CitationChips({
  keys,
  chipClassName,
}: {
  keys: readonly CitationKey[]
  chipClassName?: string
}) {
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {keys.map((key) => (
        <Popover key={key}>
          <Badge asChild variant="outline" className={cn('font-normal text-[10px]', chipClassName)}>
            <PopoverTrigger
              onClick={(e) => e.stopPropagation()}
              className="cursor-help"
              aria-label={citationLabel(key, 'es')}
            >
              {citationReason(key, 'es')}
            </PopoverTrigger>
          </Badge>
          <PopoverContent className="w-auto max-w-72 px-3 py-2 text-xs">
            {citationLabel(key, 'es')}
          </PopoverContent>
        </Popover>
      ))}
    </span>
  )
}
