'use client'

import type { CitationKey } from '@nec-assistant/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CitationChips } from './citation-chips'

type ResultTone = 'default' | 'destructive' | 'warning'

/** A lookup rather than a ternary, so the set of tones stays flat as it grows. */
const TONE_CLASS: Record<ResultTone, string> = {
  default: '',
  destructive: 'text-destructive',
  warning: 'text-warning',
}

/** One output line: label, value, and its own NEC citations (PRD: cited on every line). */
export function ResultLine({
  label,
  value,
  detail,
  citations,
  tone = 'default',
}: {
  label: React.ReactNode
  value: React.ReactNode
  detail?: React.ReactNode
  citations?: readonly CitationKey[]
  tone?: ResultTone
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={`text-right font-mono text-base font-semibold tabular-nums ${TONE_CLASS[tone]}`}
        >
          {value}
        </span>
      </div>
      {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
      {citations && citations.length > 0 ? (
        <div className="mt-1">
          <CitationChips keys={citations} />
        </div>
      ) : null}
    </div>
  )
}

export function ResultsCard({
  title,
  badge,
  children,
  footer,
}: {
  title: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <Card>
      {/* The title shrinks and the badge group wraps to its own line rather than
          either one clipping: a badge cut off by the card edge is worse than a
          taller header, and «Método que rige» is the signal that tells two
          otherwise-identical cards apart. */}
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-x-2 gap-y-1 space-y-0">
        <CardTitle className="min-w-0 flex-1 text-base">{title}</CardTitle>
        {badge ? (
          <span className="flex flex-wrap items-center justify-end gap-1">{badge}</span>
        ) : null}
      </CardHeader>
      <CardContent className="divide-y">
        {children}
        {footer ? (
          <>
            <Separator className="my-2" />
            {footer}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
