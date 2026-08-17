import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/** Compact KPI tile: mono value, quiet label. Every value must be real package data. */
export function StatTile({
  icon: Icon,
  value,
  label,
  detail,
}: {
  icon: LucideIcon
  value: React.ReactNode
  label: React.ReactNode
  detail?: React.ReactNode
}) {
  return (
    <Card className="gap-0 py-3">
      <CardContent className="flex items-center gap-3 px-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-mono text-base font-semibold tabular-nums">{value}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {label}
            {detail ? <> · {detail}</> : null}
          </span>
        </span>
      </CardContent>
    </Card>
  )
}
