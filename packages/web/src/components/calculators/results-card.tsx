'use client'

import type { CitationKey } from '@elec-assistant/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CitationChips } from './citation-chips'

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
  tone?: 'default' | 'destructive'
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={`text-right font-mono text-base font-semibold tabular-nums ${
            tone === 'destructive' ? 'text-destructive' : ''
          }`}
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {badge}
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
