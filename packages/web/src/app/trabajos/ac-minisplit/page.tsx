import { Suspense } from 'react'
import type { Metadata } from 'next'
import { acMinisplitTemplate } from '@elec-assistant/data'
import { TemplateRunner } from '@/components/jobs/template-runner'

export const metadata: Metadata = {
  title: 'Aire acondicionado mini-split',
  description:
    'Planifique la instalación eléctrica de un mini-split: calibre, térmico, desconectador y tubería con citas NEC, más la lista de materiales con precios.',
}

export default function AcMinisplitPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">{acMinisplitTemplate.name.es}</h1>
      </div>
      <Suspense>
        <TemplateRunner template={acMinisplitTemplate} />
      </Suspense>
    </div>
  )
}
