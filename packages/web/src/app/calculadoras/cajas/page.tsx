import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CajasCalculator } from '@/components/calculators/cajas-calculator'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Relleno de cajas',
  description:
    'Calculadora interactiva de relleno de cajas según NEC 314.16: caja mínima o verificación del volumen para conductores, dispositivos y tierras.',
}

export default function CajasPage() {
  const m = getMessages()
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{m.cajas.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.cajas.subtitle}</p>
      </div>
      <Suspense>
        <CajasCalculator />
      </Suspense>
    </div>
  )
}
