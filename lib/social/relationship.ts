import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canonicalPair } from './canonical-pair'

export type RelationshipState =
  | 'stranger'
  | 'request_sent'       // viewer → target, pending
  | 'request_received'   // target → viewer, pending
  | 'friends'
  | 'blocked_by_me'
  | 'blocked_by_them'
  | 'self'

export interface Relationship {
  state: RelationshipState
  /** Present when state is request_sent or request_received. */
  requestId?: string
}

/**
 * Computes the relationship between the viewer and a target user.
 *
 * Uses an admin client to read `blocks` in BOTH directions. The viewer's normal
 * client cannot see blocks where they are the blocked party (RLS hides them on
 * purpose — that's the point of "silencioso"). To make a real decision, we
 * need to look at both sides, so we escalate.
 *
 * Returns 'blocked_by_them' so the caller can render notFound() and never
 * leak existence.
 */
export async function getRelationshipState(
  viewerId: string,
  targetId: string,
): Promise<Relationship> {
  if (viewerId === targetId) return { state: 'self' }

  // 1. Bidirectional block check via admin client (RLS would hide the other
  //    direction). NEVER expose admin client to the browser — this runs only
  //    on the server.
  const admin = createAdminClient()
  const { data: blocks } = await admin
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(
      `and(blocker_id.eq.${viewerId},blocked_id.eq.${targetId}),` +
        `and(blocker_id.eq.${targetId},blocked_id.eq.${viewerId})`,
    )

  if (blocks && blocks.length > 0) {
    const blockedByMe = blocks.some((b) => b.blocker_id === viewerId)
    const blockedByThem = blocks.some((b) => b.blocker_id === targetId)
    // If both, treat as blocked_by_them (safer — viewer can't undo).
    if (blockedByThem) return { state: 'blocked_by_them' }
    if (blockedByMe) return { state: 'blocked_by_me' }
  }

  // From here on the viewer's normal client is enough — RLS lets you see your
  // own friendships and friend_requests.
  const supabase = await createClient()

  const [user_a_id, user_b_id] = canonicalPair(viewerId, targetId)
  const { data: friendship } = await supabase
    .from('friendships')
    .select('user_a_id')
    .eq('user_a_id', user_a_id)
    .eq('user_b_id', user_b_id)
    .maybeSingle()
  if (friendship) return { state: 'friends' }

  const { data: request } = await supabase
    .from('friend_requests')
    .select('id, sender_id')
    .eq('status', 'pending')
    .or(
      `and(sender_id.eq.${viewerId},receiver_id.eq.${targetId}),` +
        `and(sender_id.eq.${targetId},receiver_id.eq.${viewerId})`,
    )
    .maybeSingle()

  if (request) {
    return {
      state: request.sender_id === viewerId ? 'request_sent' : 'request_received',
      requestId: request.id,
    }
  }

  return { state: 'stranger' }
}
