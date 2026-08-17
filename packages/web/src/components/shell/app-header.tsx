'use client'

import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { AppBreadcrumb } from './app-breadcrumb'
import { ThemeToggle } from './theme-toggle'

export function AppHeader() {
  return (
    <header
      data-slot="app-header"
      className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden"
    >
      <SidebarTrigger className="-ml-1 size-9 md:size-7" />
      <Separator orientation="vertical" className="mr-1 !h-4" />
      <AppBreadcrumb />
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  )
}
