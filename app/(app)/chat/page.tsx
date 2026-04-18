import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ConversationSummary, PublicProfile } from '@/lib/types'
import { ChatInboxClient, type InboxItem } from './chat-inbox-client'

export default async function ChatInboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Conversations with at least one message, newest-first.
  const { data: summaries = [] } = await supabase
    .from('conversation_summaries')
    .select('id, user_a_id, user_b_id, last_message_at, created_at, peer_id, my_last_read_at, unread_count, last_message')
    .not('last_message_at', 'is', null)
    .order('last_message_at', { ascending: false })

  const rows = (summaries ?? []) as ConversationSummary[]

  if (rows.length === 0) {
    return <ChatInboxClient items={[]} userId={user.id} />
  }

  // Resolve peer profiles. Ex-friends are hidden from friends_visible_profiles
  // but still need to render in the inbox for historical conversations, so we
  // fall back to the admin client for the missing ones. Same pattern used by
  // /friends for the blocked users section.
  const peerIds = Array.from(new Set(rows.map((r) => r.peer_id)))

  const { data: visible = [] } = await supabase
    .from('friends_visible_profiles')
    .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
    .in('id', peerIds)

  const profileById = new Map<string, PublicProfile>()
  for (const p of (visible ?? []) as PublicProfile[]) {
    profileById.set(p.id, { ...p, show_streak: false, show_badges: false })
  }

  // Admin client: ex-friend profiles are hidden from friends_visible_profiles
  // but still need to be rendered in the inbox for historical conversations.
  // Blocked-by-them profiles will NOT make it here — their conversation's
  // /chat/[userId] route 404s before it can even be listed (we also hide via
  // relationship state below, as a defense in depth).
  const missingIds = peerIds.filter((id) => !profileById.has(id))
  if (missingIds.length > 0) {
    const admin = createAdminClient()
    const { data: recovered } = await admin
      .from('profiles')
      .select('id, username, nickname, avatar_url, bio, is_discoverable, show_streak, show_badges, last_seen_at, created_at')
      .in('id', missingIds)
    for (const p of (recovered ?? []) as PublicProfile[]) {
      profileById.set(p.id, p)
    }
  }

  // Filter out rows where viewer is blocked by the peer. We compute this
  // cheaply with a single blocks query (admin client) instead of hitting the
  // relationship RPC per row.
  const admin = createAdminClient()
  const { data: blockingMe = [] } = await admin
    .from('blocks')
    .select('blocker_id')
    .eq('blocked_id', user.id)
    .in('blocker_id', peerIds)
  const blockedByIds = new Set((blockingMe ?? []).map((b) => b.blocker_id))

  const items: InboxItem[] = rows
    .filter((r) => !blockedByIds.has(r.peer_id))
    .map((r) => ({
      summary: r,
      peer: profileById.get(r.peer_id) ?? null,
    }))
    .filter((it) => it.peer !== null)

  return <ChatInboxClient items={items} userId={user.id} />
}
