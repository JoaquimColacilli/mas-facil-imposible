'use client'

import { useEffect, useState } from 'react'
import { parseDolarResponse, type DolarQuote } from '@/lib/dolar-cotizacion'

const CACHE_KEY = 'mfi-usd-cache'
const TTL_MS = 5 * 60 * 1000 // 5 min, same as the topbar widget

interface CachedQuotes {
  data: { mep: DolarQuote; blue: DolarQuote }
  timestamp: number
}

interface UsdRate {
  /** ARS per USD (uses MEP venta). 0 when unavailable — UI should show
   *  a graceful fallback (no totals collapse). */
  rate: number
  loading: boolean
  stale: boolean
}

/** Lightweight wrapper around dolarapi.com with a 5-min sessionStorage
 *  cache shared with the topbar widget. We don't need polling here — the
 *  hero refreshes when the user revisits the page or the cache TTL expires. */
export function useUsdRate(): UsdRate {
  const [state, setState] = useState<UsdRate>({ rate: 0, loading: true, stale: false })

  useEffect(() => {
    let cancelled = false

    function applyData(d: { mep: DolarQuote; blue: DolarQuote }, stale: boolean) {
      if (cancelled) return
      setState({
        rate: d.mep.venta > 0 ? d.mep.venta : 0,
        loading: false,
        stale,
      })
    }

    // Try cache first.
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as CachedQuotes
        const fresh = Date.now() - cached.timestamp < TTL_MS
        if (cached.data?.mep) {
          applyData(cached.data, !fresh)
          if (fresh) return
        }
      }
    } catch {
      // ignore — fall through to fetch
    }

    fetch('https://dolarapi.com/v1/dolares')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        const parsed = parseDolarResponse(json)
        if (!parsed) throw new Error('Parse error')
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: parsed, timestamp: Date.now() } satisfies CachedQuotes),
          )
        } catch {
          // quota — ignore
        }
        applyData(parsed, false)
      })
      .catch(() => {
        if (cancelled) return
        setState({ rate: 0, loading: false, stale: true })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
