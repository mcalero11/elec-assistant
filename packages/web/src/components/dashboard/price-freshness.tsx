'use client'

import { useEffect, useState } from 'react'
import { priceEntries } from '@nec-assistant/data'
import { isStale } from '@/lib/pricing'
import { getMessages } from '@/lib/i18n'

/**
 * Stale-price count depends on "today", so it's computed after mount — the
 * server/build render shows a dash and never disagrees with the client.
 */
export function PriceFreshness() {
  const m = getMessages()
  const [staleCount, setStaleCount] = useState<number | null>(null)
  useEffect(() => {
    setStaleCount(priceEntries.filter((e) => isStale(e, new Date())).length)
  }, [])
  if (staleCount === null) return <span aria-hidden>—</span>
  return (
    <span className={staleCount > 0 ? 'text-warning' : undefined}>
      {staleCount} {m.home.staleToVerify}
    </span>
  )
}
