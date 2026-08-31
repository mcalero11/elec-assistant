'use client'

import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { NumberFieldHint, useClampedNumber } from '@/components/calculators/number-field'

/**
 * Live control: slider + synced numeric field + unit suffix. Works entirely in
 * display units — the caller converts to metric before hitting the engine.
 *
 * The numeric half is a NumberField, so a typed out-of-range value is clamped
 * *visibly* instead of vanishing. There is deliberately no `allowOutOfRange`:
 * the slider is bounded by construction, and letting the thumb and the number
 * disagree about the selected value would be a worse bug than the one that
 * fixes. Where a bound came from the NEC rather than from sanity, widen
 * `min`/`max` at the call site and pass `softMin`/`softMax` instead.
 */
export function InputSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  softMin,
  softMax,
  hint,
}: {
  label: React.ReactNode
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit: string
  /** Code-derived recommendation — not clamped; drives the hint tone only. */
  softMin?: number
  softMax?: number
  hint?: React.ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const { clampedTo, outOfCodeRange, displayValue, commit, reset } = useClampedNumber({
    value: Number.isInteger(value) ? value : Number(value.toFixed(1)),
    onChange,
    min,
    max,
    softMin,
    softMax,
  })
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
            value={displayValue}
            min={min}
            max={max}
            step={step}
            aria-describedby={hint || clampedTo !== null ? hintId : undefined}
            onChange={(e) => commit(e.target.value)}
            onBlur={reset}
          />
          <span className="w-6 text-sm text-muted-foreground">{unit}</span>
        </span>
      </div>
      {/* Below the row, not inside it: the row is a flex line for input + unit. */}
      <NumberFieldHint
        id={hintId}
        clampedTo={clampedTo}
        outOfCodeRange={outOfCodeRange}
        hint={hint}
      />
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
