'use client'

import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { fmtNumber, getMessages } from '@/lib/i18n'

/**
 * Numeric entry that never silently swallows a keystroke.
 *
 * The pattern this replaces was `if (inRange) setState(v)` with no `else`, which
 * made an out-of-range value look like a broken keyboard — typing `1` into a
 * `min={2}` field simply did nothing, with no explanation. Here every edit
 * commits something, and says so when it had to clamp.
 *
 * Two kinds of bound, deliberately separated:
 *  - `min`/`max` are SANITY bounds (a quantity of 0, a 9-digit VA). Clamped, but
 *    visibly: «Se limitó a N».
 *  - `softMin`/`softMax` are CODE bounds (120.52(A)'s two kitchen circuits, the
 *    3% voltage-drop recommendation). NOT clamped — the value is accepted and the
 *    hint turns amber, because the code is guidance the tool explains rather than
 *    a rule it enforces. The engine then marks the result off-code.
 */

interface ClampedNumberOptions {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  /** Round to whole numbers on commit rather than rejecting a decimal. */
  integer?: boolean
  softMin?: number
  softMax?: number
}

/**
 * The commit/clamp behavior, separated from layout so a control that puts its
 * hint somewhere other than directly under the input (InputSlider) can reuse it.
 */
export function useClampedNumber({
  value,
  onChange,
  min,
  max,
  integer = false,
  softMin,
  softMax,
}: ClampedNumberOptions) {
  // While the field is being edited we show exactly what was typed. Without this
  // a clamp fights the user mid-entry: typing "15" into a min=2 field would
  // rewrite the "1" to "2" before the "5" ever arrives.
  const [draft, setDraft] = useState<string | null>(null)
  const [clampedTo, setClampedTo] = useState<number | null>(null)

  const commit = (raw: string) => {
    setDraft(raw)
    if (raw.trim() === '') return // let the field be cleared without destroying state
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return // keep the draft; don't write garbage upstream
    const rounded = integer ? Math.round(parsed) : parsed
    const clamped = Math.min(max, Math.max(min, rounded))
    setClampedTo(clamped !== parsed ? clamped : null)
    onChange(clamped)
  }

  const reset = () => {
    setDraft(null)
    setClampedTo(null)
  }

  return {
    /** Non-null while the last edit had to be clamped, so the UI can say so. */
    clampedTo,
    /** True when the value is legal to model but outside what the NEC asks for. */
    outOfCodeRange:
      (softMin !== undefined && value < softMin) || (softMax !== undefined && value > softMax),
    displayValue: draft ?? value,
    commit,
    reset,
  }
}

/** The clamp feedback line, or the hint, or nothing. */
export function NumberFieldHint({
  id,
  clampedTo,
  outOfCodeRange,
  hint,
}: {
  id: string
  clampedTo: number | null
  outOfCodeRange: boolean
  hint?: React.ReactNode
}) {
  const m = getMessages()
  if (clampedTo !== null) {
    return (
      <p id={id} className="text-xs text-warning">
        {m.common.valueLimited} {fmtNumber(clampedTo)}
      </p>
    )
  }
  if (!hint) return null
  return (
    <p id={id} className={`text-xs ${outOfCodeRange ? 'text-warning' : 'text-muted-foreground'}`}>
      {hint}
    </p>
  )
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  integer = false,
  softMin,
  softMax,
  hint,
  className = 'h-8 w-24 text-right font-mono tabular-nums',
  id: idProp,
  'aria-label': ariaLabel,
  disabled,
}: ClampedNumberOptions & {
  step?: number
  hint?: React.ReactNode
  className?: string
  id?: string
  'aria-label'?: string
  disabled?: boolean
}) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const hintId = `${id}-hint`
  const { clampedTo, outOfCodeRange, displayValue, commit, reset } = useClampedNumber({
    value,
    onChange,
    min,
    max,
    integer,
    softMin,
    softMax,
  })
  const describedBy = hint || clampedTo !== null ? hintId : undefined

  return (
    <>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        className={className}
        value={displayValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        onChange={(e) => commit(e.target.value)}
        onBlur={reset}
      />
      <NumberFieldHint
        id={hintId}
        clampedTo={clampedTo}
        outOfCodeRange={outOfCodeRange}
        hint={hint}
      />
    </>
  )
}
