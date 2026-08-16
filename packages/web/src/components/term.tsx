'use client'

import { GLOSSARY } from '@/lib/glossary'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Wraps a technical term with a glossary tooltip: plain-Spanish definition,
 * regional synonyms, and the English name. PRD: «never blocked by a name».
 */
export function Term({ id, children }: { id: keyof typeof GLOSSARY; children: React.ReactNode }) {
  const entry = GLOSSARY[id]
  if (!entry) return <>{children}</>
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
      </TooltipContent>
    </Tooltip>
  )
}
