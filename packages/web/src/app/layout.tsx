import type { Metadata, Viewport } from 'next'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/shell/app-sidebar'
import { AppHeader } from '@/components/shell/app-header'

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

/* Dark is the server-rendered default; this runs before paint and only
   removes it for users who chose light, so neither theme flashes. */
const THEME_INIT = `(function(){try{if(localStorage.getItem('ea-theme')==='light')document.documentElement.classList.remove('dark')}catch(e){}})()`

export const metadata: Metadata = {
  title: {
    default: 'Asistente Eléctrico',
    template: '%s · Asistente Eléctrico',
  },
  description:
    'Calculadoras eléctricas NEC en español: calibre de conductor, relleno de tubería y listas de materiales para El Salvador.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#12151f' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={cn("dark font-sans", geist.variable, geistMono.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <NuqsAdapter>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <AppHeader />
                {children}
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
