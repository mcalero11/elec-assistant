'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { searchTemplates } from '@/lib/job-search'
import { getMessages } from '@/lib/i18n'
import { ALL_TEMPLATES, templateIcon, templateRoute } from '@/lib/templates'

export function JobSearch() {
  const m = getMessages()
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchTemplates([...ALL_TEMPLATES], query), [query])

  return (
    <div className="space-y-4">
      <Input
        autoFocus
        placeholder={m.jobs.searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={m.jobs.searchPlaceholder}
      />
      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.jobs.noResults}</p>
      ) : (
        <ul className="grid gap-3">
          {results.map((t) => {
            const Icon = templateIcon(t.id)
            return (
              <li key={t.id}>
                <Link
                  href={templateRoute(t)}
                  className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <Icon className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                  <span>
                    <span className="block font-semibold">{t.name.es}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.synonyms.slice(0, 4).join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
