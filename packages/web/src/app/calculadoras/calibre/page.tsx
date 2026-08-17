import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CalibreCalculator } from '@/components/calculators/calibre-calculator'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Calibre de conductor',
  description:
    'Calculadora interactiva de calibre de conductor según NEC: ampacidad con derrateo, caída de tensión y térmico, con citas y supuestos.',
}

export default function CalibrePage() {
  const m = getMessages()
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{m.calibre.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.calibre.subtitle}</p>
      </div>
      <Suspense>
        <CalibreCalculator />
      </Suspense>
    </div>
  )
}
