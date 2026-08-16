import { TriangleAlert } from 'lucide-react'
import { getMessages } from '@/lib/i18n'

/** PRD requirement: every output (and PDF) carries the verification disclaimer. */
export function Disclaimer() {
  const m = getMessages()
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{m.common.disclaimer}</span>
    </p>
  )
}
