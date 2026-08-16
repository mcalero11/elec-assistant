import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Asistente Eléctrico</h1>
      <p className="mt-2 text-muted-foreground">
        Calculadoras NEC en español, hechas para el trabajo real.
      </p>
      <div className="mt-8 grid gap-4">
        <Link
          href="/trabajos"
          className="rounded-lg border p-4 transition-colors hover:bg-accent"
        >
          <h2 className="font-semibold">Trabajos</h2>
          <p className="text-sm text-muted-foreground">
            Escriba «aire», conteste 4 preguntas y obtenga la lista de materiales con precios.
          </p>
        </Link>
        <Link
          href="/calculadoras/calibre"
          className="rounded-lg border p-4 transition-colors hover:bg-accent"
        >
          <h2 className="font-semibold">Calibre de conductor</h2>
          <p className="text-sm text-muted-foreground">
            Ampacidad, caída de tensión y térmico — con citas del NEC en cada resultado.
          </p>
        </Link>
      </div>
    </main>
  )
}
