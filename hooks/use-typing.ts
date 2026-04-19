'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface UseTypingArgs {
  channelKey: string | null
  viewerId: string
  peerId: string
  /**
   * Si false (ex-amigo, blocked_by_me, self), el hook no envía ni escucha —
   * el composer está read-only y no tiene sentido señalar typing.
   */
  enabled: boolean
}

interface UseTypingResult {
  /** True si el peer está escribiendo. Auto-hides a los 4s sin refresh (failsafe). */
  peerTyping: boolean
  /** Llamar on keystroke del composer. Throttle 2s interno. */
  notifyTyping: () => void
  /** Llamar on blur, on empty, on unmount. Envía stop inmediato. */
  notifyStop: () => void
}

const SEND_THROTTLE_MS = 2_000
const STOP_AFTER_IDLE_MS = 3_000
const PEER_FAILSAFE_HIDE_MS = 4_000

export function useTyping({
  channelKey,
  viewerId,
  peerId,
  enabled,
}: UseTypingArgs): UseTypingResult {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastSentRef = useRef(0)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peerHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [peerTyping, setPeerTyping] = useState(false)

  // ── subscribe ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !channelKey) return
    const supabase = createClient()

    const channel: RealtimeChannel = supabase.channel(channelKey)

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as { userId: string; typing: boolean }
        if (!data || data.userId !== peerId) return
        if (data.typing) {
          setPeerTyping(true)
          if (peerHideTimerRef.current) clearTimeout(peerHideTimerRef.current)
          peerHideTimerRef.current = setTimeout(() => setPeerTyping(false), PEER_FAILSAFE_HIDE_MS)
        } else {
          setPeerTyping(false)
          if (peerHideTimerRef.current) {
            clearTimeout(peerHideTimerRef.current)
            peerHideTimerRef.current = null
          }
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (peerHideTimerRef.current) clearTimeout(peerHideTimerRef.current)
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      // Best-effort: notificar stop antes de cerrar. No podemos await en cleanup.
      channel
        .send({ type: 'broadcast', event: 'typing', payload: { userId: viewerId, typing: false } })
        .catch(() => {})
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [channelKey, viewerId, peerId, enabled])

  const send = useCallback(
    (typing: boolean) => {
      const ch = channelRef.current
      if (!ch) return
      ch.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: viewerId, typing },
      }).catch(() => {})
    },
    [viewerId],
  )

  const notifyTyping = useCallback(() => {
    if (!enabled) return
    const now = Date.now()
    if (now - lastSentRef.current >= SEND_THROTTLE_MS) {
      send(true)
      lastSentRef.current = now
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(() => {
      send(false)
      lastSentRef.current = 0
    }, STOP_AFTER_IDLE_MS)
  }, [enabled, send])

  const notifyStop = useCallback(() => {
    if (!enabled) return
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
    send(false)
    lastSentRef.current = 0
  }, [enabled, send])

  // ── cleanup adicional (ajuste A del owner): blur + visibility ────────────
  // Cubre los 2 escapes típicos de composer con typing sin flush:
  //   - user cambia de tab → visibilitychange hidden
  //   - user saca foco del textarea sin enviar → blur del textarea
  // El blur lo maneja el composer (llama notifyStop on blur). Acá solo
  // la visibilidad global.
  useEffect(() => {
    if (!enabled) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') notifyStop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [enabled, notifyStop])

  return { peerTyping, notifyTyping, notifyStop }
}
