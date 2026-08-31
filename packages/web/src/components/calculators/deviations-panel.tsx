'use client'

import { TriangleAlert } from 'lucide-react'
import { localPracticeNote } from '@nec-assistant/data'
import type { Deviation } from '@nec-assistant/engine'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CitationChips } from '@/components/calculators/citation-chips'
import { GlossaryText } from '@/components/glossary-text'
import { getMessages } from '@/lib/i18n'

/**
 * «Fuera de norma NEC» — the calculation ran on what is actually installed and
 * these are the points where it departs from the code.
 *
 * Sibling to AssumptionsPanel rather than a variant of it, because it is a
 * different speech act: an assumption is an input the engine chose for you, a
 * deviation is a finding about the answer. It is therefore deliberately louder —
 * never collapsed, above the numbers instead of below them.
 *
 * The NEC prose comes verbatim from the engine (bilingual, country-neutral); the
 * El Salvador practice note is looked up per key in the data package and shown
 * underneath, so the engine never learns a country.
 */
export function DeviationsPanel({ deviations }: { deviations: readonly Deviation[] }) {
  const m = getMessages()
  if (deviations.length === 0) return null
  return (
    // One grouped alert, not N: a second «Fuera de norma» headline would out-shout
    // the template runner's own advisory alerts. role=status (not the baked-in
    // role=alert) because calculators recompute on every keystroke and an
    // assertive live region would re-announce the whole list each time.
    <Alert variant="warning" role="status" aria-live="polite">
      <TriangleAlert className="size-4" />
      <AlertTitle>
        {m.common.deviationsTitle} ({deviations.length})
      </AlertTitle>
      <AlertDescription>
        <p className="mb-2">{m.common.deviationsHint}</p>
        <ul className="list-disc space-y-2 pl-5">
          {deviations.map((d) => {
            const note = localPracticeNote(d.key)
            return (
              <li key={d.key}>
                <GlossaryText text={d.es} />
                {d.citations && d.citations.length > 0 ? (
                  <>
                    {' '}
                    <CitationChips keys={d.citations} />
                  </>
                ) : null}
                {note ? <LocalPracticeLine practiceKey={d.key} /> : null}
              </li>
            )
          })}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

/**
 * «Práctica local (El Salvador)» — what is commonly installed here, next to what
 * the NEC asks for. Usually rendered under a deviation, but also standing on its
 * own where a compliant code answer still disagrees with local reality (the
 * 100 A service floor on the load calculator).
 */
export function LocalPracticeLine({ practiceKey }: { practiceKey: string }) {
  const m = getMessages()
  const note = localPracticeNote(practiceKey)
  if (!note) return null
  return (
    <span className="mt-1.5 block border-l-2 border-warning/40 pl-2 text-xs text-muted-foreground">
      <span className="font-medium">{m.common.localPractice}: </span>
      <GlossaryText text={note.es} />
      {note.source ? <span className="opacity-70"> — {note.source.es}</span> : null}
    </span>
  )
}

/** The «No cumple NEC» stamp. Shown on every card carrying a number from an off-code run. */
export function NonComplianceBadge() {
  const m = getMessages()
  return <Badge variant="warning">{m.common.nonCompliantBadge}</Badge>
}
