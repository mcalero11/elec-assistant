'use client'

import { useMemo } from 'react'
import { voltageDrop } from '@elec-assistant/engine'
import type { ConductorMaterial, ConductorSize } from '@elec-assistant/data'
import { citationLabel } from '@elec-assistant/data'
import { fmtPercent, getMessages } from '@/lib/i18n'

const W = 320
const H = 140
const PAD = { left: 34, right: 10, top: 10, bottom: 22 }

/**
 * Hand-rolled SVG: voltage drop vs distance for the selected conductor size.
 * The region beyond the recommended limit is shaded; a marker sits at the
 * current distance so slider motion is visible on the curve.
 */
export function DropChart({
  size,
  material,
  currentA,
  systemVoltage,
  phase,
  lengthM,
  maxDropPercent,
}: {
  size: ConductorSize
  material: ConductorMaterial
  currentA: number
  systemVoltage: number
  phase: 1 | 3
  lengthM: number
  maxDropPercent: number
}) {
  const m = getMessages()
  const maxX = Math.max(lengthM * 2, 20)

  const { points, yMax, currentDrop } = useMemo(() => {
    const samples = 60
    const pts: Array<{ x: number; y: number }> = []
    for (let i = 0; i <= samples; i++) {
      const x = (maxX * i) / samples
      const { dropPercent } = voltageDrop({
        currentA,
        lengthM: x,
        size,
        material,
        systemVoltage,
        phase,
      })
      pts.push({ x, y: dropPercent })
    }
    const current = voltageDrop({
      currentA,
      lengthM,
      size,
      material,
      systemVoltage,
      phase,
    }).dropPercent
    const top = Math.max(maxDropPercent * 1.5, (pts[pts.length - 1]?.y ?? 0) * 1.05, 0.1)
    return { points: pts, yMax: top, currentDrop: current }
  }, [size, material, currentA, systemVoltage, phase, lengthM, maxDropPercent, maxX])

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const sx = (x: number) => PAD.left + (x / maxX) * plotW
  const sy = (y: number) => PAD.top + plotH - (Math.min(y, yMax) / yMax) * plotH

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
  const limitY = sy(maxDropPercent)
  const overLimit = currentDrop > maxDropPercent

  return (
    <figure>
      <figcaption className="mb-1 text-xs font-medium text-muted-foreground">
        {m.calibre.dropChartTitle} — {size} AWG/kcmil
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={m.calibre.dropChartTitle}>
        {/* shaded region above the recommended limit */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={Math.max(limitY - PAD.top, 0)}
          className="fill-destructive/10"
        />
        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={limitY}
          y2={limitY}
          className="stroke-destructive/60"
          strokeDasharray="4 3"
          strokeWidth="1"
        />
        <text x={PAD.left + plotW} y={limitY - 3} textAnchor="end" className="fill-destructive text-[9px]">
          {maxDropPercent}% · {citationLabel('nec2026.in210_19_vd', 'es').split('—')[0]?.trim()}
        </text>
        {/* axes */}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH} className="stroke-border" strokeWidth="1" />
        <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} className="stroke-border" strokeWidth="1" />
        {[0, yMax / 2, yMax].map((v) => (
          <text key={v} x={PAD.left - 4} y={sy(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
            {v.toFixed(1)}%
          </text>
        ))}
        {[0, maxX / 2, maxX].map((v) => (
          <text key={v} x={sx(v)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[9px]">
            {Math.round(v)} m
          </text>
        ))}
        {/* drop curve */}
        <path d={path} fill="none" className="stroke-primary" strokeWidth="1.75" />
        {/* current-distance marker */}
        <circle
          cx={sx(lengthM)}
          cy={sy(currentDrop)}
          r="4"
          className={overLimit ? 'fill-destructive' : 'fill-primary'}
        />
        <text
          x={sx(lengthM)}
          y={sy(currentDrop) - 8}
          textAnchor="middle"
          className={`text-[9px] font-medium ${overLimit ? 'fill-destructive' : 'fill-foreground'}`}
        >
          {fmtPercent(currentDrop)}
        </text>
      </svg>
    </figure>
  )
}
