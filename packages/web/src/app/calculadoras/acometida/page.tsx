import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AcometidaCalculator } from '@/components/calculators/acometida-calculator'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Acometida y panel principal',
  description:
    'Conductor de acometida, térmico principal y conductor al electrodo de tierra (GEC) según la Tabla 250.66, con la tubería de protección de 250.64(B).',
}

export default function AcometidaPage() {
  const m = getMessages()
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{m.acometida.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.acometida.subtitle}</p>
      </div>
      <Suspense>
        <AcometidaCalculator />
      </Suspense>
    </div>
  )
}
