import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CargaCalculator } from '@/components/calculators/carga-calculator'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Cálculo de carga',
  description:
    'Calculadora interactiva de carga residencial según NEC 2026 Artículo 120 (ex-220): método estándar y opcional lado a lado, con la acometida sugerida.',
}

export default function CargaPage() {
  const m = getMessages()
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">{m.carga.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.carga.subtitle}</p>
      </div>
      <Suspense>
        <CargaCalculator />
      </Suspense>
    </div>
  )
}
