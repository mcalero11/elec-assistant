import { Suspense } from 'react'
import type { Metadata } from 'next'
import { circuitoRamalTemplate } from '@elec-assistant/data'
import { TemplateRunner } from '@/components/jobs/template-runner'

export const metadata: Metadata = {
  title: 'Tomacorrientes o iluminación adicional',
  description:
    'Planifique un circuito nuevo de tomas o luces: calibre, térmico, cajas y tubería con citas NEC (incluye verificación de relleno de caja 314.16), más la lista de materiales con precios.',
}

export default function CircuitoRamalPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">{circuitoRamalTemplate.name.es}</h1>
      </div>
      <Suspense>
        <TemplateRunner template={circuitoRamalTemplate} />
      </Suspense>
    </div>
  )
}
