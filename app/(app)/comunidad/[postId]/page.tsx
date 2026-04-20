import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type {
  CommunityAuthor,
  CommunityComment,
  CommunityPost,
  CommunityPostEmbed,
} from '@/lib/types'
import { ThreadClient } from './thread-client'

type CommentRow = {
  id: string
  post_id: string
  parent_comment_id: string | null
  user_id: string
  body: string
  image_urls: string[] | null
  vote_count: number
  created_at: string
  deleted_at: string | null
}

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
}

const FALLBACK_AUTHOR: CommunityAuthor = {
  id: 'unknown',
  username: null,
  nickname: null,
  full_name: 'Usuario',
  avatar_url: null,
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const postRes = await supabase
    .from('community_posts')
    .select(
      'id, user_id, category, title, body, embed, image_urls, vote_count, comment_count, created_at, edited_at, deleted_at',
    )
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle()

  if (postRes.error) {
    console.error('[comunidad] thread post fetch error', {
      message: postRes.error.message,
      code: postRes.error.code,
      details: postRes.error.details,
      hint: postRes.error.hint,
    })
  }
  if (!postRes.data) notFound()
  const postRow = postRes.data as PostRow

  const [commentsRes, meRes, saveRes, postVoteRes] = await Promise.all([
    supabase
      .from('community_comments')
      .select(
        'id, post_id, parent_comment_id, user_id, body, image_urls, vote_count, created_at, deleted_at',
      )
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, username, nickname, full_name, avatar_url')
      .eq('id', user.id)
      .single(),
    supabase
      .from('community_saves')
      .select('post_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle(),
    supabase
      .from('community_votes')
      .select('value')
      .eq('user_id', user.id)
      .eq('target_kind', 'post')
      .eq('target_id', postId)
      .maybeSingle(),
  ])

  const flatComments = (commentsRes.data ?? []) as CommentRow[]
  const commentIds = flatComments.map((c) => c.id)
  const authorIds = Array.from(
    new Set([postRow.user_id, ...flatComments.map((c) => c.user_id)]),
  )

  const [commentVotesRes, authorsRes] = await Promise.all([
    commentIds.length
      ? supabase
          .from('community_votes')
          .select('target_id, value')
          .eq('user_id', user.id)
          .eq('target_kind', 'comment')
          .in('target_id', commentIds)
      : Promise.resolve({
          data: [] as { target_id: string; value: -1 | 1 }[],
          error: null,
        }),
    authorIds.length
      ? supabase
          .from('profiles_public')
          .select('id, username, nickname, avatar_url')
          .in('id', authorIds)
      : Promise.resolve({ data: [] as PublicProfileRow[], error: null }),
  ])

  const commentVoteMap = new Map<string, -1 | 1>()
  for (const v of (commentVotesRes.data ?? []) as {
    target_id: string
    value: -1 | 1
  }[]) {
    commentVoteMap.set(v.target_id, v.value)
  }
  const authorMap = new Map<string, CommunityAuthor>()
  for (const p of (authorsRes.data ?? []) as PublicProfileRow[]) {
    authorMap.set(p.id, {
      id: p.id,
      username: p.username,
      nickname: p.nickname,
      full_name: null,
      avatar_url: p.avatar_url,
    })
  }
  // Enrich own author with full_name from profiles.
  if (meRes.data) {
    authorMap.set(user.id, {
      id: user.id,
      username: meRes.data.username,
      nickname: meRes.data.nickname,
      full_name: meRes.data.full_name,
      avatar_url: meRes.data.avatar_url,
    })
  }

  const comments: CommunityComment[] = flatComments.map((c) => ({
    id: c.id,
    post_id: c.post_id,
    parent_comment_id: c.parent_comment_id,
    user_id: c.user_id,
    body: c.body,
    image_urls: c.image_urls ?? [],
    vote_count: c.vote_count,
    created_at: c.created_at,
    deleted_at: c.deleted_at,
    author: authorMap.get(c.user_id) ?? FALLBACK_AUTHOR,
    myVote: (commentVoteMap.get(c.id) ?? 0) as -1 | 0 | 1,
    children: [],
  }))

  const post: CommunityPost = {
    id: postRow.id,
    user_id: postRow.user_id,
    category: postRow.category,
    title: postRow.title,
    body: postRow.body,
    embed: postRow.embed,
    image_urls: postRow.image_urls ?? [],
    vote_count: postRow.vote_count,
    comment_count: postRow.comment_count,
    created_at: postRow.created_at,
    edited_at: postRow.edited_at,
    deleted_at: postRow.deleted_at,
    author: authorMap.get(postRow.user_id) ?? FALLBACK_AUTHOR,
    myVote: ((postVoteRes.data?.value as -1 | 1 | undefined) ?? 0) as
      | -1
      | 0
      | 1,
    saved: !!saveRes.data,
  }

  const meProfile = meRes.data
  const currentUser: CommunityAuthor = {
    id: user.id,
    username: meProfile?.username ?? null,
    nickname: meProfile?.nickname ?? null,
    full_name: meProfile?.full_name ?? null,
    avatar_url: meProfile?.avatar_url ?? null,
  }

  return (
    <ThreadClient
      initialPost={post}
      initialComments={comments}
      currentUser={currentUser}
    />
  )
}
