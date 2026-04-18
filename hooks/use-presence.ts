'use client'

import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface UsePresenceArgs {
  /** Canal scope, típicamente `chat:${conversationId}`. Null → hook no-op. */
  channelKey: string | null
  /** Id del viewer (se usa como presence key). */
  viewerId: string
  /** Id del peer a observar. */
  peerId: string
  /** Si false, el hook no hace track ni subscribe (ej: blocked_by_me). */
  enabled: boolean
}

/**
 * Presence peer-a-peer sobre un canal compartido (ver use-typing para el
 * Broadcast sobre el mismo canal). No colisiona con `conversation:${id}` de
 * Fase 4 — ese canal corre postgres_changes en paralelo.
 *
 * Re-track en el callback SUBSCRIBED para tolerar reconnects: cuando el
 * websocket se cae y vuelve, channel re-subscribe automático pero el presence
 * state se pierde — hay que re-llamar track().
 */
export function usePresence({ channelKey, viewerId, peerId, enabled }: UsePresenceArgs) {
  const [peerOnline, setPeerOnline] = useState(false)

  useEffect(() => {
    if (!enabled || !channelKey) return
    const supabase = createClient()

    const channel: RealtimeChannel = supabase.channel(channelKey, {
      config: { presence: { key: viewerId } },
    })

    const syncPeer = () => {
      const state = channel.presenceState<{ online: boolean }>()
      const peerEntries = state[peerId]
      setPeerOnline(Boolean(peerEntries && peerEntries.length > 0))
    }

    channel
      .on('presence', { event: 'sync' }, syncPeer)
      .on('presence', { event: 'join' }, syncPeer)
      .on('presence', { event: 'leave' }, syncPeer)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ online: true }).then(() => {})
        }
      })

    return () => {
      channel.untrack().then(() => {
        supabase.removeChannel(channel)
      })
    }
  }, [channelKey, viewerId, peerId, enabled])

  return { peerOnline }
}
