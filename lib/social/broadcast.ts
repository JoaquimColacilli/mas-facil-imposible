'use client'

import { createClient } from '@/lib/supabase/client'

// ─── Event taxonomy (Fase 7) ──────────────────────────────────────────────
// 7 event types, covering the critical realtime surface for social graph +
// linked loans/debts + chat read receipts. Non-critical surfaces
// (friendship_removed, user_blocked_me, user_unblocked_me,
// linked_loan_request_rejected, linked_loan_settled_propagate) are covered
// by SWR poll 30s + next-nav refresh — see §11bis.11 of the plan.

export type SocialEventType =
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'friend_request_rejected'
  | 'friend_request_cancelled'
  | 'linked_loan_request_received'
  | 'linked_loan_request_accepted'
  | 'conversation_read_peer'

export interface SocialEventPayload {
  type: SocialEventType
  // Free-form additional keys by event — consumers cast based on type.
  [key: string]: unknown
}

export function channelNameFor(userId: string): string {
  return `user_social:${userId}`
}

/**
 * Emit a social event to the target user's broadcast channel.
 *
 * The sender creates an ephemeral channel just to emit — subscribe,
 * send, remove. Fire-and-forget: on any failure (offline, websocket
 * hiccup, target offline) we swallow silently so the primary mutation
 * isn't blocked. SWR poll 30s is the fallback for lost events.
 *
 * Channel uses `private: false` with a UUID-scoped name — attacker
 * needs the exact target UUID to subscribe, low severity. Migrating
 * to `private: true` is a v2.1 follow-up (see §13.14 of the plan).
 */
export async function broadcastSocialEvent(
  targetUserId: string,
  type: SocialEventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = createClient()
    const channel = supabase.channel(channelNameFor(targetUserId))
    // Wait for SUBSCRIBED before send — otherwise send may no-op silently.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('subscribe timeout')), 3000)
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout)
          reject(new Error(`channel status: ${status}`))
        }
      })
    })
    await channel.send({
      type: 'broadcast',
      event: 'social_event',
      payload: { type, ...payload, emitted_at: Date.now() },
    })
    await supabase.removeChannel(channel)
  } catch (err) {
    // Fire-and-forget. The SWR poll is the safety net.
    if (typeof console !== 'undefined') {
      console.warn('[broadcast] failed', { type, targetUserId, err: (err as Error).message })
    }
  }
}
