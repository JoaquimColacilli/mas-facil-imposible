'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getRelationshipState, type RelationshipState } from '@/lib/social/relationship'
import { getPublicStreak } from '@/lib/social/public-stats'
import { isOnlineFromLastSeen } from '@/lib/social/presence'
import type { PublicProfile } from '@/lib/types'

export interface UserCardData {
  profile: PublicProfile & { full_name: string | null }
  relationshipState: RelationshipState
  requestId: string | null
  peerOnline: boolean
  streak: number | null
  karma: number | null
  mutualFriendsCount: number
}

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/**
 * Fetches everything the UserHoverCard needs in a single server roundtrip.
 * Accepts either userId or username — resolves the other internally.
 *
 * Returns `not_found` for:
 *   - target doesn't exist
 *   - target is not discoverable to viewer AND not friends AND not self
 *   - target has blocked the viewer (silent — must look like not_found)
 */
export async function fetchUserCard(
  input: { userId?: string; username?: string },
): Promise<Result<UserCardData>> {
  const supabase = await createClient()
  const { data: { user: viewer } } = await supabase.auth.getUser()
  if (!viewer) return { ok: false, error: 'No autenticado' }

  // 1. Resolve target to a full profiles_public row. profiles_public already
  //    filters by is_discoverable OR self OR friend-visibility — so if nothing
  //    comes back, the viewer has no business seeing this user.
  // last_seen_at is NOT in profiles_public by design (fase 7 — don't expose
  // presence to anon). Fetched separately below.
  let profileQuery = supabase
    .from('profiles_public')
    .select('id, username, nickname, avatar_url, bio, show_streak, show_badges, is_discoverable, created_at')
    .limit(1)

  if (input.userId) profileQuery = profileQuery.eq('id', input.userId)
  else if (input.username) profileQuery = profileQuery.ilike('username', input.username)
  else return { ok: false, error: 'Falta userId o username' }

  const { data: profileRow } = await profileQuery.maybeSingle()
  if (!profileRow) return { ok: false, error: 'not_found' }

  const targetId = profileRow.id as string

  // 2. Relationship state (handles bidirectional blocks via admin client).
  const relationship = await getRelationshipState(viewer.id, targetId)
  if (relationship.state === 'blocked_by_them') {
    return { ok: false, error: 'not_found' }
  }

  // 3. full_name is not in profiles_public (privacy). Fetch from profiles for
  //    self or friends (RLS allows it). For strangers, null is fine.
  let fullName: string | null = null
  if (relationship.state === 'self' || relationship.state === 'friends') {
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', targetId)
      .maybeSingle()
    fullName = (fullProfile?.full_name as string | null) ?? null
  }

  // 4. Presence: last_seen_at isn't on profiles_public. Query profiles directly —
  //    RLS on profiles allows discoverable/friends/self reads.
  const { data: presenceRow } = await supabase
    .from('profiles')
    .select('last_seen_at')
    .eq('id', targetId)
    .maybeSingle()
  const peerOnline = isOnlineFromLastSeen(presenceRow?.last_seen_at ?? null)

  // 5. Streak (null when show_streak=false).
  const streak = profileRow.show_streak ? await getPublicStreak(targetId) : null

  // 6. Karma — only when show_badges=true. Read via admin to bypass RLS on the
  //    `karma` column (profiles table exposes it only to self by default).
  let karma: number | null = null
  if (profileRow.show_badges) {
    const admin = createAdminClient()
    const { data: karmaRow } = await admin
      .from('profiles')
      .select('karma')
      .eq('id', targetId)
      .maybeSingle()
    karma = (karmaRow?.karma as number | null) ?? 0
  }

  // 7. Mutual friends count — viewer can't read target's friendships via RLS,
  //    so compute via admin. Cheap for reasonable graph sizes; iterate later
  //    with a DB function if this ever gets slow.
  let mutualFriendsCount = 0
  if (relationship.state !== 'self') {
    const admin = createAdminClient()
    const [myRes, theirRes] = await Promise.all([
      admin
        .from('friendships')
        .select('user_a_id, user_b_id')
        .or(`user_a_id.eq.${viewer.id},user_b_id.eq.${viewer.id}`),
      admin
        .from('friendships')
        .select('user_a_id, user_b_id')
        .or(`user_a_id.eq.${targetId},user_b_id.eq.${targetId}`),
    ])
    const mine = new Set(
      (myRes.data ?? []).map((r) => (r.user_a_id === viewer.id ? r.user_b_id : r.user_a_id)) as string[],
    )
    for (const r of theirRes.data ?? []) {
      const other = r.user_a_id === targetId ? r.user_b_id : r.user_a_id
      if (mine.has(other)) mutualFriendsCount++
    }
  }

  const profile: UserCardData['profile'] = {
    id: profileRow.id as string,
    username: (profileRow.username as string | null) ?? null,
    nickname: (profileRow.nickname as string | null) ?? null,
    avatar_url: (profileRow.avatar_url as string | null) ?? null,
    bio: (profileRow.bio as string | null) ?? null,
    show_streak: !!profileRow.show_streak,
    show_badges: !!profileRow.show_badges,
    is_discoverable: !!profileRow.is_discoverable,
    last_seen_at: (presenceRow?.last_seen_at as string | null) ?? null,
    created_at: profileRow.created_at as string,
    full_name: fullName,
  }

  return {
    ok: true,
    data: {
      profile,
      relationshipState: relationship.state,
      requestId: relationship.requestId ?? null,
      peerOnline,
      streak,
      karma,
      mutualFriendsCount,
    },
  }
}
