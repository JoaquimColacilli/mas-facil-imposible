'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { channelNameFor, type SocialEventType } from '@/lib/social/broadcast'

/**
 * Global social realtime subscription. Mount once per session via
 * `<SocialRealtimeMount />` in `app/(app)/layout.tsx`.
 *
 * Listens on `user_social:${viewerId}` for 7 event types (Fase 7).
 * For each event:
 *   - Always: `mutate` the relevant SWR keys so badges in the topbar
 *     update regardless of what route the viewer is on.
 *   - Conditionally: `router.refresh()` the current route when the
 *     event affects data displayed there. Scoped by pathname to avoid
 *     re-SSR of unrelated routes.
 *
 * Event table (payload shapes):
 *   friend_request_received    { from_user_id }
 *   friend_request_accepted    { by_user_id }
 *   friend_request_rejected    { by_user_id }
 *   friend_request_cancelled   { from_user_id }
 *   linked_loan_request_received  { loan_id?, debt_id?, from_user_id }
 *   linked_loan_request_accepted  { by_user_id }
 *   conversation_read_peer     { conversation_id, by_user_id }
 */
export function useSocialRealtime(viewerId: string) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!viewerId) return
    const supabase = createClient()
    const channel = supabase.channel(channelNameFor(viewerId))

    // Chat inbox realtime: global subscription to `messages` INSERTs so the
    // inbox preview + topbar badge refresh even when no conversation is open.
    // RLS on `messages` already scopes events to conversations where the
    // viewer is a participant; filter by sender to ignore our own sends
    // (those are handled by the conversation-level hook in use-messages.ts).
    //
    // Separate channel so the postgres_changes binding and the broadcast
    // binding don't collide on subscribe lifecycle.
    const inboxChannel = supabase
      .channel(`chat-inbox:${viewerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id?: string } | null
          if (!msg) return
          if (msg.sender_id === viewerId) return
          mutate(`chat-unread-count-${viewerId}`)
          // Refresh the inbox list when the viewer is looking at it (picks up
          // the new preview, timestamp, unread count for the affected row).
          // Inside an open conversation (`/chat/[userId]`), use-messages.ts
          // handles the INSERT locally; we skip the refresh to avoid noise.
          if (pathname === '/chat') router.refresh()
        },
      )
      .subscribe()

    channel
      .on('broadcast', { event: 'social_event' }, (msg) => {
        const payload = (msg.payload ?? {}) as { type?: SocialEventType }
        const type = payload.type
        if (!type) return

        switch (type) {
          case 'friend_request_received':
          case 'friend_request_cancelled': {
            mutate(`friend-requests-pending-${viewerId}`)
            mutate(`notifications-${viewerId}`)
            if (pathname?.startsWith('/friends')) router.refresh()
            break
          }
          case 'friend_request_accepted': {
            mutate(`friend-requests-pending-${viewerId}`)
            mutate(`notifications-${viewerId}`)
            if (pathname?.startsWith('/friends') || pathname?.startsWith('/chat')) {
              router.refresh()
            }
            break
          }
          case 'friend_request_rejected': {
            mutate(`friend-requests-pending-${viewerId}`)
            mutate(`notifications-${viewerId}`)
            if (pathname?.startsWith('/friends')) router.refresh()
            break
          }
          case 'linked_loan_request_received':
          case 'linked_loan_request_accepted': {
            mutate(`notifications-${viewerId}`)
            if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/friends')) {
              router.refresh()
            }
            break
          }
          case 'conversation_read_peer': {
            // Updates the unread badge in the topbar and the inbox list.
            // The chat feed itself updates via postgres_changes UPDATE
            // (enabled by REPLICA IDENTITY FULL in migration 021).
            mutate(`chat-unread-count-${viewerId}`)
            if (pathname === '/chat') router.refresh()
            break
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(inboxChannel)
    }
  }, [viewerId, pathname, router])
}
