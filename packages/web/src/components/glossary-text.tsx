'use client'

import { Fragment, useMemo } from 'react'
import { matchGlossaryTerms } from '@/lib/glossary-match'
import { Term } from '@/components/term'

/**
 * Renders a plain-Spanish string with glossary terms wrapped in tappable <Term>
 * popovers. Use for text that arrives verbatim from the data package (template
 * labels, BOM item names, assumption prose) where hand-placing <Term> is not
 * possible without polluting data with UI concerns.
 */
export function GlossaryText({ text }: { text: string }) {
  const segments = useMemo(() => matchGlossaryTerms(text), [text])
  return (
    <>
      {segments.map((s, i) =>
        s.kind === 'term' ? (
          <Term key={i} id={s.id}>
            {s.text}
          </Term>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </>
  )
}
