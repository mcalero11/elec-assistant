'use client'

import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { getMessages } from '@/lib/i18n'
import { ALL_TEMPLATES } from '@/lib/templates'

/** Panel › sección › página, derived from the URL. Hidden on the dashboard itself. */
export function AppBreadcrumb() {
  const m = getMessages()
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const leafLabels: Record<string, string> = {
    calibre: m.nav.calibre,
    tuberia: m.nav.tuberia,
    tierra: m.nav.tierra,
    cajas: m.nav.cajas,
    carga: m.nav.carga,
  }
  for (const t of ALL_TEMPLATES) leafLabels[t.id] = t.name.es

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:block">
          <BreadcrumbLink href="/">{m.nav.panel}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden sm:block" />
        {segments[0] === 'calculadoras' ? (
          <>
            {/* No index page for /calculadoras — plain crumb, not a link. */}
            <BreadcrumbItem>{m.nav.calculadoras}</BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        ) : segments.length > 1 ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href="/trabajos/">{m.nav.trabajos}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        ) : null}
        <BreadcrumbItem>
          <BreadcrumbPage>
            {leafLabels[segments[segments.length - 1] ?? ''] ??
              (segments[0] === 'trabajos' ? m.nav.trabajos : segments[segments.length - 1])}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
