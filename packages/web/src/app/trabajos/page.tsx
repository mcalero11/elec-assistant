import type { Metadata } from 'next'
import { JobSearch } from '@/components/jobs/job-search'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Trabajos',
  description:
    'Flujos de trabajo guiados: conteste unas preguntas y obtenga parámetros con cita NEC y una lista de materiales con precios.',
}

export default function TrabajosPage() {
  const m = getMessages()
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">{m.jobs.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{m.jobs.subtitle}</p>
      <div className="mt-6">
        <JobSearch />
      </div>
    </div>
  )
}
