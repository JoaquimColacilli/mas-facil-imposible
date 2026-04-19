'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canonicalPair } from '@/lib/social/canonical-pair'
import { extractRpcCode, getSocialErrorMessage } from '@/lib/social/errors'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; code: string | null; error: string }

function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data }
}

function fail(code: string | null, fallback?: string): ActionResult<never> {
  return { ok: false, code, error: code ? getSocialErrorMessage(code) : (fallback ?? 'Algo salió mal.') }
}

// Aggressive cache invalidation: the topbar badge lives in the `(app)` layout,
// so every social action needs to bust the layout cache, not just /friends.
function bustCaches() {
  revalidatePath('/', 'layout')
}

// ─── send ───────────────────────────────────────────────────────────────────

export async function sendFriendRequest(targetUsername: string): Promise<ActionResult<{ requestId: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('send_friend_request', {
    target_username: targetUsername,
  })
  if (error) return fail(extractRpcCode(error))
  bustCaches()
  return ok({ requestId: data as string })
}

// ─── accept (with idempotency — Ajuste A) ───────────────────────────────────

export async function acceptFriendRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_friend_request', {
    request_id: requestId,
  })

  if (error) {
    const code = extractRpcCode(error)

    // Idempotency: if the RPC says "not_pending", the request might have been
    // accepted by a parallel tab (double-click). Verify the friendship exists;
    // if so, treat as success.
    if (code === 'not_pending') {
      const { data: req } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .eq('id', requestId)
        .maybeSingle()
      if (req && req.status === 'accepted') {
        const [a, b] = canonicalPair(req.sender_id, req.receiver_id)
        const { data: friendship } = await supabase
          .from('friendships')
          .select('user_a_id')
          .eq('user_a_id', a)
          .eq('user_b_id', b)
          .maybeSingle()
        if (friendship) {
          bustCaches()
          return ok()
        }
      }
    }
    return fail(code)
  }

  bustCaches()
  return ok()
}

// ─── reject ─────────────────────────────────────────────────────────────────

export async function rejectFriendRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  // RLS protege: solo el receiver puede UPDATE.
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
  if (error) return fail(null, 'No se pudo rechazar la solicitud.')
  bustCaches()
  return ok()
}

// ─── cancel (sender) ────────────────────────────────────────────────────────

export async function cancelFriendRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
  if (error) return fail(null, 'No se pudo cancelar la solicitud.')
  bustCaches()
  return ok()
}

// ─── remove friend ──────────────────────────────────────────────────────────

export async function removeFriend(friendId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('unauthenticated')

  const [a, b] = canonicalPair(user.id, friendId)
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_a_id', a)
    .eq('user_b_id', b)
  if (error) return fail(null, 'No se pudo eliminar la amistad.')
  bustCaches()
  return ok()
}

// ─── block / unblock ────────────────────────────────────────────────────────

export async function blockUser(targetId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('block_user', { target_id: targetId })
  if (error) return fail(extractRpcCode(error))
  bustCaches()
  return ok()
}

export async function unblockUser(targetId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('unauthenticated')
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetId)
  if (error) return fail(null, 'No se pudo desbloquear.')
  bustCaches()
  return ok()
}

// ─── notifications cleanup ──────────────────────────────────────────────────

export async function markFriendRequestNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('unauthenticated')

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)
    .contains('data', { type: 'friend_request_received' })
  if (error) return fail(null, 'No se pudo marcar como leídas.')
  return ok()
}
