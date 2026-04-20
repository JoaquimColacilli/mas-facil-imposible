import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { PublicProfile } from '@/lib/types'
import { FriendsClient, type FriendRequestWithProfile } from './friends-client'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function FriendsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ── friends list ────────────────────────────────────────────────────────
  // Fetch friendship rows where I'm either side, then resolve the OTHER user's
  // public profile via friends_visible_profiles (which excludes mutual blocks).
  const { data: friendships = [] } = await supabase
    .from('friendships')
    .select('user_a_id, user_b_id, created_at')

  const friendIds = (friendships ?? []).map((f) =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id,
  )

  let friends: PublicProfile[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('friends_visible_profiles')
      .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
      .in('id', friendIds)
    friends = (data ?? []) as PublicProfile[]
  }

  // ── pending requests (received + sent) ──────────────────────────────────
  const { data: pendingReqs = [] } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at, updated_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const counterpartyIds = Array.from(
    new Set((pendingReqs ?? []).map((r) => (r.sender_id === user.id ? r.receiver_id : r.sender_id))),
  )

  // Resolve sender/receiver profiles via admin client. A pending request is an
  // explicit action directed at the viewer (or from the viewer), so filtering by
  // is_discoverable here is semantically wrong — we'd drop valid requests whose
  // counterparty has a hidden profile. No data leak: the viewer only sees
  // profiles of users they share a pending request with.
  let counterpartyProfiles: PublicProfile[] = []
  if (counterpartyIds.length > 0) {
    const admin = createAdminClient()
    const { data: profilesData } = await admin
      .from('profiles')
      .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
      .in('id', counterpartyIds)

    // Defense in depth: exclude bidirectional blocks even if friend_requests rows
    // leaked through (the block flow cancels pending requests, but an extra check
    // is cheap and prevents surfacing a blocked user in the Solicitudes tab).
    // Two queries — simpler than a nested .or() and easier to reason about.
    const [outBlocksRes, inBlocksRes] = await Promise.all([
      admin
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id)
        .in('blocked_id', counterpartyIds),
      admin
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', user.id)
        .in('blocker_id', counterpartyIds),
    ])

    const blockedIds = new Set<string>()
    for (const b of outBlocksRes.data ?? []) blockedIds.add(b.blocked_id)
    for (const b of inBlocksRes.data ?? []) blockedIds.add(b.blocker_id)

    counterpartyProfiles = ((profilesData ?? []) as PublicProfile[]).filter(
      (p) => !blockedIds.has(p.id),
    )
  }

  const profileById = new Map(counterpartyProfiles.map((p) => [p.id, p]))

  const received: FriendRequestWithProfile[] = (pendingReqs ?? [])
    .filter((r) => r.receiver_id === user.id)
    .map((r) => ({ ...r, profile: profileById.get(r.sender_id) ?? null }))
    // Drop requests where the counterparty was blocked (profile filtered out by view).
    .filter((r) => r.profile !== null)

  const sent: FriendRequestWithProfile[] = (pendingReqs ?? [])
    .filter((r) => r.sender_id === user.id)
    .map((r) => ({ ...r, profile: profileById.get(r.receiver_id) ?? null }))
    .filter((r) => r.profile !== null)

  // ── blocked users ───────────────────────────────────────────────────────
  // We fetch blocks via the user's normal client (RLS allows reading own blocks),
  // then resolve the blocked profiles via admin client. We CAN'T use
  // friends_visible_profiles (excludes blocked) nor profiles_public (filters out
  // non-discoverable). Admin bypass is the safe path for this server-only read.
  const { data: blocks = [] } = await supabase
    .from('blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false })

  let blocked: PublicProfile[] = []
  if ((blocks ?? []).length > 0) {
    const blockedIds = (blocks ?? []).map((b) => b.blocked_id)
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
      .in('id', blockedIds)
    blocked = (data ?? []) as PublicProfile[]
  }

  const params = await searchParams
  const initialTab =
    params.tab === 'requests' || params.tab === 'search' || params.tab === 'suggested'
      ? params.tab
      : 'friends'

  return (
    <FriendsClient
      userId={user.id}
      initialTab={initialTab}
      friends={friends}
      received={received}
      sent={sent}
      blocked={blocked}
    />
  )
}
