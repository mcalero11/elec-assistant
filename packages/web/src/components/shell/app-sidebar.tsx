'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Box, Cable, Cylinder, Earth, House, LayoutDashboard, Search, Zap } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { getMessages } from '@/lib/i18n'
import { ALL_TEMPLATES, templateIcon, templateRoute } from '@/lib/templates'

export function AppSidebar() {
  const m = getMessages()
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname === href.replace(/\/$/, '')

  const calculadoras = [
    { href: '/calculadoras/calibre/', label: m.nav.calibre, icon: Cable },
    { href: '/calculadoras/tuberia/', label: m.nav.tuberia, icon: Cylinder },
    { href: '/calculadoras/tierra/', label: m.nav.tierra, icon: Earth },
    { href: '/calculadoras/cajas/', label: m.nav.cajas, icon: Box },
    { href: '/calculadoras/carga/', label: m.nav.carga, icon: House },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={m.common.appName}>
              <Link href="/">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Zap className="size-4" aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{m.common.appName}</span>
                  <span className="font-mono text-xs text-muted-foreground">NEC 2026 · es-SV</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/')} tooltip={m.nav.panel} className="min-h-11 md:min-h-8">
                  <Link href="/">
                    <LayoutDashboard aria-hidden />
                    <span>{m.nav.panel}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/glosario/')} tooltip={m.nav.glosario} className="min-h-11 md:min-h-8">
                  <Link href="/glosario/">
                    <BookOpen aria-hidden />
                    <span>{m.nav.glosario}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav.calculadoras}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {calculadoras.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label} className="min-h-11 md:min-h-8">
                    <Link href={item.href}>
                      <item.icon aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav.trabajos}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/trabajos/')} tooltip={m.nav.buscarTrabajo} className="min-h-11 md:min-h-8">
                  <Link href="/trabajos/">
                    <Search aria-hidden />
                    <span>{m.nav.buscarTrabajo}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {ALL_TEMPLATES.map((t) => {
                const Icon = templateIcon(t.id)
                return (
                  <SidebarMenuItem key={t.id}>
                    <SidebarMenuButton asChild isActive={isActive(templateRoute(t))} tooltip={t.name.es} className="min-h-11 md:min-h-8">
                      <Link href={templateRoute(t)}>
                        <Icon aria-hidden />
                        <span>{t.name.es}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
