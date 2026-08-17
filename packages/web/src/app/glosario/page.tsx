import type { Metadata } from 'next'
import { GlossaryBrowser } from '@/components/glossary/glossary-browser'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Glosario',
  description:
    'Glosario del oficio eléctrico en lenguaje llano: términos, sinónimos salvadoreños, nombre en inglés y artículos NEC relacionados.',
}

export default function GlosarioPage() {
  const m = getMessages()
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{m.glosario.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.glosario.subtitle}</p>
      </div>
      <GlossaryBrowser />
    </div>
  )
}
