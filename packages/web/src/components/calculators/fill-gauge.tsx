'use client'

import { fmtPercent, getMessages } from '@/lib/i18n'

/**
 * Horizontal fill meter: actual conductor area vs the Table 1 / Note 4 limit.
 * The scale tops out past the limit so an over-full conduit is visibly over the line.
 */
export function FillGauge({
  fillPercentActual,
  fillPercentLimit,
  fits,
}: {
  fillPercentActual: number
  fillPercentLimit: number
  fits: boolean
}) {
  const m = getMessages()
  const labels = { title: m.relleno.fillActual, limit: m.relleno.fillLimit }
  const maxScale = Math.max(fillPercentLimit * 1.5, fillPercentActual * 1.1, 60)
  const w = 320
  const h = 56
  const barY = 18
  const barH = 16
  const x = (pct: number) => (Math.min(pct, maxScale) / maxScale) * w
  const limitX = x(fillPercentLimit)
  const valueW = x(fillPercentActual)

  return (
    <figure>
      <figcaption className="mb-2 text-sm font-medium">{labels.title}</figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label={`${labels.title}: ${fmtPercent(fillPercentActual)} · ${labels.limit}: ${fmtPercent(fillPercentLimit)}`}
      >
        <rect x="0" y={barY} width={w} height={barH} rx="4" className="fill-muted" />
        <rect
          x="0"
          y={barY}
          width={valueW}
          height={barH}
          rx="4"
          className={`${fits ? 'fill-success' : 'fill-destructive'} transition-[width] duration-200`}
        />
        <line
          x1={limitX}
          x2={limitX}
          y1={barY - 6}
          y2={barY + barH + 6}
          strokeDasharray="3 3"
          className="stroke-foreground"
          strokeWidth="1.5"
        />
        <text
          x={limitX}
          y={barY - 9}
          textAnchor={limitX > w - 60 ? 'end' : 'middle'}
          className="fill-muted-foreground font-mono text-[10px]"
        >
          {labels.limit} {fmtPercent(fillPercentLimit)}
        </text>
        <text
          x={Math.min(Math.max(valueW, 24), w - 4)}
          y={barY + barH + 14}
          textAnchor="end"
          className={`font-mono text-[11px] font-semibold ${fits ? 'fill-foreground' : 'fill-destructive'}`}
        >
          {fmtPercent(fillPercentActual)}
        </text>
      </svg>
    </figure>
  )
}
