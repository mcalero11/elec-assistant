import { Suspense } from 'react'
import type { Metadata } from 'next'
import { tomacorriente240vTemplate } from '@elec-assistant/data'
import { TemplateRunner } from '@/components/jobs/template-runner'

export const metadata: Metadata = {
  title: 'Tomacorriente 240 V (estufa / secadora)',
  description:
    'Planifique el circuito de 240 V para estufa o secadora: calibre, térmico GFCI, tomacorriente NEMA 14-30/14-50 y tubería con citas NEC, más la lista de materiales con precios.',
}

export default function Tomacorriente240vPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">{tomacorriente240vTemplate.name.es}</h1>
      </div>
      <Suspense>
        <TemplateRunner template={tomacorriente240vTemplate} />
      </Suspense>
    </div>
  )
}
