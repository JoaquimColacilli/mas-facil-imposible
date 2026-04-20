import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type {
  CommunityAuthor,
  CommunityPost,
  CommunityPostEmbed,
} from '@/lib/types'
import { ComunidadClient } from './comunidad-client'

type PostRow = {
  id: string
  user_id: string
  category: CommunityPost['category']
  title: string
  body: string
  embed: CommunityPostEmbed | null
  image_urls: string[] | null
  vote_count: number
  comment_count: number
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

type PublicProfileRow = {
  id: string
  username: string | null
  nickname: string | null
  avatar_url: string | null
  karma: number | null
}

const FALLBACK_AUTHOR: CommunityAuthor = {
  id: 'unknown',
  username: null,
  nickname: null,
  full_name: 'Usuario',
  avatar_url: null,
}

export default async function ComunidadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [postsRes, meRes, savesRes] = await Promise.all([
    supabase
      .from('community_posts')
      .select(
        'id, user_id, category, title, body, embed, image_urls, vote_count, comment_count, created_at, edited_at, deleted_at',
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('profiles')
      .select('id, username, nickname, full_name, avatar_url, karma')
      .eq('id', user.id)
      .single(),
    supabase
      .from('community_saves')
      .select('post_id')
      .eq('user_id', user.id),
  ])

  if (postsRes.error) {
    console.error('[comunidad] posts fetch error', {
      message: postsRes.error.message,
      code: postsRes.error.code,
      details: postsRes.error.details,
      hint: postsRes.error.hint,
    })
  }

  const rawPosts = (postsRes.data ?? []) as PostRow[]
  const postIds = rawPosts.map((p) => p.id)
  const authorIds = Array.from(new Set(rawPosts.map((p) => p.user_id)))

  const [votesRes, authorsRes] = await Promise.all([
    postIds.length
      ? supabase
          .from('community_votes')
          .select('target_id, value')
          .eq('user_id', user.id)
          .eq('target_kind', 'post')
          .in('target_id', postIds)
      : Promise.resolve({
          data: [] as { target_id: string; value: -1 | 1 }[],
          error: null,
        }),
    authorIds.length
      ? supabase
          .from('profiles_public')
          .select('id, username, nickname, avatar_url, karma')
          .in('id', authorIds)
      : Promise.resolve({ data: [] as PublicProfileRow[], error: null }),
  ])

  const voteMap = new Map<string, -1 | 1>()
  for (const v of (votesRes.data ?? []) as {
    target_id: string
    value: -1 | 1
  }[]) {
    voteMap.set(v.target_id, v.value)
  }
  const savedSet = new Set<string>(
    (savesRes.data ?? []).map((s) => s.post_id as string),
  )
  const authorMap = new Map<string, CommunityAuthor>()
  for (const p of (authorsRes.data ?? []) as PublicProfileRow[]) {
    authorMap.set(p.id, {
      id: p.id,
      username: p.username,
      nickname: p.nickname,
      full_name: null,
      avatar_url: p.avatar_url,
      karma: p.karma,
    })
  }
  // Ensure the current user's author shape uses full_name from their own
  // profile row (profiles_public does not expose full_name).
  if (meRes.data) {
    authorMap.set(user.id, {
      id: user.id,
      username: meRes.data.username,
      nickname: meRes.data.nickname,
      full_name: meRes.data.full_name,
      avatar_url: meRes.data.avatar_url,
      karma: meRes.data.karma ?? 0,
    })
  }

  const posts: CommunityPost[] = rawPosts.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    category: p.category,
    title: p.title,
    body: p.body,
    embed: p.embed,
    image_urls: p.image_urls ?? [],
    vote_count: p.vote_count,
    comment_count: p.comment_count,
    created_at: p.created_at,
    edited_at: p.edited_at,
    deleted_at: p.deleted_at,
    author: authorMap.get(p.user_id) ?? FALLBACK_AUTHOR,
    myVote: (voteMap.get(p.id) ?? 0) as -1 | 0 | 1,
    saved: savedSet.has(p.id),
  }))

  const meProfile = meRes.data
  const currentUser: CommunityAuthor = {
    id: user.id,
    username: meProfile?.username ?? null,
    nickname: meProfile?.nickname ?? null,
    full_name: meProfile?.full_name ?? null,
    avatar_url: meProfile?.avatar_url ?? null,
    karma: meProfile?.karma ?? 0,
  }

  return <ComunidadClient initialPosts={posts} currentUser={currentUser} />
}
