'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMessages } from '@/lib/i18n'

/**
 * Stateless toggle: flips the `dark` class and persists the choice. The icon swap is
 * pure CSS (`dark:` variants), so server and client render identical markup.
 */
export function ThemeToggle() {
  const m = getMessages()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      aria-label={`${m.nav.temaClaro} / ${m.nav.temaOscuro}`}
      onClick={() => {
        const root = document.documentElement
        const nowDark = root.classList.toggle('dark')
        try {
          localStorage.setItem('ea-theme', nowDark ? 'dark' : 'light')
        } catch {
          /* private mode: theme just won't persist */
        }
      }}
    >
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </Button>
  )
}
