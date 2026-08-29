import { Suspense } from 'react'
import type { Metadata } from 'next'
import { alimentadorBodegaTemplate } from '@elec-assistant/data'
import { TemplateRunner } from '@/components/jobs/template-runner'

export const metadata: Metadata = {
  title: 'Alimentador a bodega o anexo',
  description:
    'Planifique el alimentador de 240 V a una construcción separada: cobre o aluminio, caída de tensión en tramos largos, subpanel y varillas de tierra con citas NEC, más la lista de materiales con precios.',
}

export default function AlimentadorBodegaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">{alimentadorBodegaTemplate.name.es}</h1>
      </div>
      <Suspense>
        <TemplateRunner template={alimentadorBodegaTemplate} />
      </Suspense>
    </div>
  )
}
