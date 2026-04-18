'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const INTERVAL_MS = 60_000

/**
 * Heartbeat global: llama al RPC touch_last_seen() cada 60s mientras el user
 * esté autenticado y la pestaña esté visible. Montar UNA sola vez en
 * app/(app)/layout.tsx. La columna profiles.last_seen_at se usa para derivar
 * presence en listas (friend-card, inbox, perfil público) con threshold de 90s.
 *
 * No hace track inmediato en mount porque la SSR ya corrió justo antes —
 * pero se puede cambiar si el threshold se endurece.
 */
export function useHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const supabase = createClient()

    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      supabase.rpc('touch_last_seen').then(() => {})
    }

    // Primer tick inmediato: la columna puede estar vieja desde la última sesión.
    tick()
    const interval = setInterval(tick, INTERVAL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])
}
