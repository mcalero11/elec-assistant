'use client'

import { ChevronDown } from 'lucide-react'
import type { Assumption } from '@elec-assistant/engine'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { getMessages } from '@/lib/i18n'

/**
 * «Supuestos» — every default/simplification the engine relied on, verbatim from
 * the result's assumptions array. This panel is the UI contract for the engine's
 * provenance API: nothing is filtered or rewritten.
 */
export function AssumptionsPanel({ assumptions }: { assumptions: readonly Assumption[] }) {
  const m = getMessages()
  if (assumptions.length === 0) return null
  return (
    <Collapsible defaultOpen className="rounded-lg border bg-muted/30 px-4 py-3">
      <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
        {m.common.assumptions} ({assumptions.length})
        <ChevronDown className="size-4 transition-transform [[data-state=open]_&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {assumptions.map((a) => (
            <li key={a.key}>{a.es}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
