import { Suspense } from 'react'
import type { Metadata } from 'next'
import { TierraCalculator } from '@/components/calculators/tierra-calculator'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Puesta a tierra',
  description:
    'Conductor de puesta a tierra de equipos según la Tabla 250.122 del NEC, con el aumento proporcional de 250.122(B) para conductores agrandados.',
}

export default function TierraPage() {
  const m = getMessages()
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{m.tierra.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.tierra.subtitle}</p>
      </div>
      <Suspense>
        <TierraCalculator />
      </Suspense>
    </div>
  )
}
