import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { acMinisplitTemplate } from '@elec-assistant/data'
import { JobRunner } from '@/components/jobs/job-runner'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Aire acondicionado mini-split',
  description:
    'Planifique la instalación eléctrica de un mini-split: calibre, térmico, desconectador y tubería con citas NEC, más la lista de materiales con precios.',
}

export default function AcMinisplitPage() {
  const m = getMessages()
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 print:hidden">
        <Link
          href="/trabajos"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> {m.jobs.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{acMinisplitTemplate.name.es}</h1>
      </div>
      <Suspense>
        <JobRunner />
      </Suspense>
    </main>
  )
}
