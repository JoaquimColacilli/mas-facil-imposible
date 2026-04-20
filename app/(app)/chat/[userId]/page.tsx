import { notFound, redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getRelationshipState } from '@/lib/social/relationship'
import type { Message, PublicProfile, ReplyToSnapshot } from '@/lib/types'
import { ConversationClient } from './conversation-client'
import { PAGE_SIZE } from '@/hooks/use-messages'

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function ConversationPage({ params }: PageProps) {
  const { userId: peerId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (peerId === user.id) notFound()

  const relationship = await getRelationshipState(user.id, peerId)

  // Silencioso: blocked_by_them → 404 como si el user no existiera.
  if (relationship.state === 'blocked_by_them') notFound()

  // Peer profile lookup. Friends go through the scoped view; non-friends that
  // still have a prior conversation (ex-friends, blocked_by_me) need the admin
  // client because profiles_public only exposes discoverable profiles and
  // friends_visible_profiles excludes blocks.
  let peer: PublicProfile | null = null
  if (relationship.state === 'friends') {
    const { data } = await supabase
      .from('friends_visible_profiles')
      .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
      .eq('id', peerId)
      .maybeSingle()
    peer = data
      ? ({ ...(data as PublicProfile), show_streak: false, show_badges: false })
      : null
  } else {
    // Admin client: ex-friend / blocked_by_me profiles are hidden from
    // friends_visible_profiles but still need to render in a read-only view
    // when a historical conversation exists.
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('id, username, nickname, avatar_url, bio, is_discoverable, show_streak, show_badges, last_seen_at, created_at')
      .eq('id', peerId)
      .maybeSingle()
    peer = (data as PublicProfile | null) ?? null
  }

  if (!peer) notFound()

  // For friends, ensure_conversation creates the row if missing (so Realtime
  // can subscribe from the start). For ex-friends / blocked_by_me, the RPC
  // returns the existing conversation id; if no prior conversation exists,
  // we 404 (there's no way to start without friendship).
  let conversationId: string | null = null
  if (relationship.state === 'friends') {
    const { data: cid, error } = await supabase.rpc('ensure_conversation', { peer_id: peerId })
    if (error || !cid) notFound()
    conversationId = cid as string
  } else {
    // Look up an existing conversation only; don't create.
    const [a, b] = user.id < peerId ? [user.id, peerId] : [peerId, user.id]
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_a_id', a)
      .eq('user_b_id', b)
      .maybeSingle()
    if (!existing) notFound()
    conversationId = existing.id as string
  }

  // Initial page of messages (newest-first from DB → reversed to chronological).
  // `reply_to:reply_to_message_id(...)` embeds the quoted message snapshot in a
  // single round-trip; safe because Supabase does LEFT JOIN automatically and
  // messages_pkey is indexed. Keeps reply renders free of N+1.
  const { data: pageRaw = [] } = await supabase
    .from('messages')
    .select(
      'id, conversation_id, sender_id, body, created_at, deleted_at, edited_at, read_at, reply_to_message_id, reply_to:reply_to_message_id (id, sender_id, body, deleted_at)',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  // Normalize reply_to shape (Supabase typed embed infers array; at runtime
  // a 1:1 FK returns a single object). See comment in chat/actions.ts.
  const initialMessages = ((pageRaw ?? []) as unknown as Array<
    Omit<Message, 'reply_to'> & { reply_to: ReplyToSnapshot | ReplyToSnapshot[] | null }
  >)
    .map((row) => {
      const rt = row.reply_to
      const resolved = Array.isArray(rt) ? (rt[0] ?? null) : (rt ?? null)
      return { ...row, reply_to: resolved } as Message
    })
    .slice()
    .reverse()

  // Mark as read on arrival (best-effort; rpc returns {data, error} — no throw).
  // A client-side effect also re-runs when new messages arrive while the tab is open.
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })

  return (
    <ConversationClient
      viewerId={user.id}
      peer={peer}
      conversationId={conversationId}
      initialMessages={initialMessages}
      relationshipState={relationship.state}
    />
  )
}
