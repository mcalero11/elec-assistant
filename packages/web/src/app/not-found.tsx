import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { getMessages } from '@/lib/i18n'

export default function NotFound() {
  const m = getMessages()
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-3 px-4 py-16">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-bold tracking-tight">{m.common.notFoundTitle}</h1>
      <p className="text-sm text-muted-foreground">{m.common.notFoundBody}</p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm transition-colors hover:border-primary/50 hover:bg-accent"
      >
        <LayoutDashboard className="size-4" aria-hidden />
        {m.common.backToPanel}
      </Link>
    </div>
  )
}
