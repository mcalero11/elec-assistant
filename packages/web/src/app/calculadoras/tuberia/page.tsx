import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RellenoCalculator } from '@/components/calculators/relleno-calculator'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Relleno de tubería',
  description:
    'Calculadora interactiva de relleno de tubería según NEC Capítulo 9: diámetro mínimo o verificación de un diámetro para EMT, PVC y poliducto.',
}

export default function TuberiaPage() {
  const m = getMessages()
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{m.relleno.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.relleno.subtitle}</p>
      </div>
      <Suspense>
        <RellenoCalculator />
      </Suspense>
    </div>
  )
}
