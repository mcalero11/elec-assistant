'use client'

import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

/**
 * Live control: slider + synced numeric field + unit suffix. Works entirely in
 * display units — the caller converts to metric before hitting the engine.
 */
export function InputSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: React.ReactNode
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit: string
}) {
  const id = useId()
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <span className="flex items-center gap-1">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            className="h-8 w-20 text-right font-mono tabular-nums"
            value={Number.isInteger(value) ? value : Number(value.toFixed(1))}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
            }}
          />
          <span className="w-6 text-sm text-muted-foreground">{unit}</span>
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => {
          if (v !== undefined) onChange(v)
        }}
        aria-label={typeof label === 'string' ? label : undefined}
      />
    </div>
  )
}
