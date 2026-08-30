import { es } from './es'
import { en } from './en'
import type { Messages } from './es'

export type Locale = 'es' | 'en'
export type { Messages }

export const messages: Record<Locale, Messages> = { es, en }

/** v1 ships Spanish-first with no visible locale switcher; the dictionary keeps English ready. */
export const DEFAULT_LOCALE: Locale = 'es'

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return messages[locale]
}

const numberFormat = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 2 })
const percentFormat = new Intl.NumberFormat('es-SV', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

export function fmtNumber(value: number): string {
  return numberFormat.format(value)
}

/** Formats an already-scaled percentage value (e.g. 1.22 → «1,22 %»). */
export function fmtPercent(value: number): string {
  return `${percentFormat.format(value)} %`
}

const dateFormat = new Intl.DateTimeFormat('es-SV', { dateStyle: 'long' })

/** Long-form es-SV date («30 de agosto de 2026») for document headers. */
export function fmtDate(value: Date): string {
  return dateFormat.format(value)
}
