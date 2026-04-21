'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  Reply,
  EyeOff,
  Eye,
  CornerDownRight,
  X,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  ImagePlus,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { UserHoverCard } from '@/components/user-hover-card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type {
  CommunityAuthor,
  CommunityComment,
  CommunityPost,
} from '@/lib/types'
import {
  PostCard,
  RelTime,
  fmtCount,
  getInitials,
  displayName,
} from '../post-card'
import { ComposerDialog } from '../composer-dialog'
import { ImageGrid } from '../image-grid'
import { uploadCommunityImage, deleteCommunityImageByUrl } from '../upload-image'
import { BadgePill } from '../badge-pill'
import { InlineEditor } from '../inline-editor'
import { RichTextView } from '../rich-text-view'

/** True when HTML has no visible text / inline content (only empty paragraphs). */
function isHtmlEmpty(html: string): boolean {
  const stripped = html.replace(/<[^>]+>/g, '').trim()
  return stripped.length === 0
}

interface Props {
  initialPost: CommunityPost
  initialComments: CommunityComment[]
  currentUser: CommunityAuthor
}

const MAX_DEPTH = 3

function buildTree(flat: CommunityComment[]): CommunityComment[] {
  const byId = new Map<string, CommunityComment>()
  flat.forEach((c) => byId.set(c.id, { ...c, children: [] }))
  const roots: CommunityComment[] = []
  byId.forEach((c) => {
    if (c.parent_comment_id && byId.has(c.parent_comment_id)) {
      const parent = byId.get(c.parent_comment_id)!
      parent.children = parent.children ?? []
      parent.children.push(c)
    } else {
      roots.push(c)
    }
  })
  return roots
}

/** Walk up the tree from `commentId` to find its effective parent such that
 *  the reply lands at depth < MAX_DEPTH. */
function resolveReplyParent(
  flat: CommunityComment[],
  commentId: string,
): string | null {
  const byId = new Map(flat.map((c) => [c.id, c]))
  // depth of `commentId` itself (0-based)
  let depth = 0
  let cursor: CommunityComment | undefined = byId.get(commentId)
  while (cursor?.parent_comment_id) {
    depth++
    cursor = byId.get(cursor.parent_comment_id)
  }
  // depth of a reply as child of `commentId` is depth+1. Allowed: depth+1 <= MAX_DEPTH - 1.
  if (depth + 1 <= MAX_DEPTH - 1) return commentId
  // Walk up until the reply-depth is within bounds.
  let parentId: string | null = commentId
  let parentDepth = depth
  while (parentId !== null && parentDepth + 1 > MAX_DEPTH - 1) {
    const parent = byId.get(parentId)
    if (!parent) return null
    parentId = parent.parent_comment_id
    parentDepth--
  }
  return parentId
}

export function ThreadClient({
  initialPost,
  initialComments,
  currentUser,
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [post, setPost] = useState(initialPost)
  const [comments, setComments] = useState(initialComments)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deletingPost, setDeletingPost] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  )
  const [busy, setBusy] = useState(false)

  const tree = useMemo(() => buildTree(comments), [comments])
  const liveCount = comments.filter((c) => !c.pending && !c.failed).length

  const votePost = async (dir: 1 | -1) => {
    const prev: -1 | 0 | 1 = post.myVote ?? 0
    const next: -1 | 0 | 1 = prev === dir ? 0 : dir
    const delta = next - prev
    setPost((p) => ({ ...p, myVote: next, vote_count: p.vote_count + delta }))
    try {
      if (next === 0) {
        const { error } = await supabase
          .from('community_votes')
          .delete()
          .match({
            user_id: currentUser.id,
            target_kind: 'post',
            target_id: post.id,
          })
        if (error) throw error
      } else {
        const { error } = await supabase.from('community_votes').upsert(
          {
            user_id: currentUser.id,
            target_kind: 'post',
            target_id: post.id,
            value: next,
          },
          { onConflict: 'user_id,target_kind,target_id' },
        )
        if (error) throw error
      }
    } catch (err) {
      setPost((p) => ({
        ...p,
        myVote: prev,
        vote_count: p.vote_count - delta,
      }))
      toast.error('No se pudo registrar el voto', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const toggleSave = async () => {
    const next = !post.saved
    setPost((p) => ({ ...p, saved: next }))
    try {
      if (next) {
        const { error } = await supabase
          .from('community_saves')
          .insert({ user_id: currentUser.id, post_id: post.id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('community_saves')
          .delete()
          .match({ user_id: currentUser.id, post_id: post.id })
        if (error) throw error
      }
    } catch (err) {
      setPost((p) => ({ ...p, saved: !next }))
      toast.error('No se pudo guardar', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const voteComment = async (commentId: string, dir: 1 | -1) => {
    const current = comments.find((c) => c.id === commentId)
    if (!current) return
    const prev: -1 | 0 | 1 = current.myVote ?? 0
    const next: -1 | 0 | 1 = prev === dir ? 0 : dir
    const delta = next - prev
    setComments((cs) =>
      cs.map((c) =>
        c.id === commentId
          ? { ...c, myVote: next, vote_count: c.vote_count + delta }
          : c,
      ),
    )
    try {
      if (next === 0) {
        const { error } = await supabase
          .from('community_votes')
          .delete()
          .match({
            user_id: currentUser.id,
            target_kind: 'comment',
            target_id: commentId,
          })
        if (error) throw error
      } else {
        const { error } = await supabase.from('community_votes').upsert(
          {
            user_id: currentUser.id,
            target_kind: 'comment',
            target_id: commentId,
            value: next,
          },
          { onConflict: 'user_id,target_kind,target_id' },
        )
        if (error) throw error
      }
    } catch (err) {
      setComments((cs) =>
        cs.map((c) =>
          c.id === commentId
            ? { ...c, myVote: prev, vote_count: c.vote_count - delta }
            : c,
        ),
      )
      toast.error('No se pudo registrar el voto', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const submitReply = async (
    text: string,
    replyTo: string | null,
    imageUrls: string[],
  ) => {
    const body = isHtmlEmpty(text) ? '' : text
    if (!body && imageUrls.length === 0) return
    const parent_comment_id = replyTo
      ? resolveReplyParent(comments, replyTo)
      : null
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: CommunityComment = {
      id: tempId,
      post_id: post.id,
      parent_comment_id,
      user_id: currentUser.id,
      body,
      image_urls: imageUrls,
      vote_count: 0,
      created_at: new Date().toISOString(),
      deleted_at: null,
      author: currentUser,
      myVote: 0,
      pending: true,
      children: [],
    }
    setComments((cs) => [...cs, optimistic])
    setReplyingToId(null)

    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: post.id,
        parent_comment_id,
        user_id: currentUser.id,
        body,
        image_urls: imageUrls,
      })
      .select(
        'id, post_id, parent_comment_id, user_id, body, image_urls, vote_count, created_at, deleted_at',
      )
      .single()

    if (error || !data) {
      setComments((cs) =>
        cs.map((c) =>
          c.id === tempId ? { ...c, pending: false, failed: true } : c,
        ),
      )
      toast.error('No se pudo enviar', { description: error?.message })
      return
    }

    const real: CommunityComment = {
      ...data,
      parent_comment_id: data.parent_comment_id ?? null,
      image_urls: (data as { image_urls?: string[] | null }).image_urls ?? [],
      author: currentUser,
      myVote: 0,
      children: [],
    } as CommunityComment

    setComments((cs) => cs.map((c) => (c.id === tempId ? real : c)))
    setPost((p) => ({ ...p, comment_count: p.comment_count + 1 }))
  }

  const confirmDeletePost = async () => {
    setBusy(true)
    const { error } = await supabase
      .from('community_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', post.id)
      .eq('user_id', currentUser.id)
    setBusy(false)
    if (error) {
      toast.error('No se pudo eliminar', { description: error.message })
      return
    }
    toast.success('Publicación eliminada')
    router.push('/comunidad')
  }

  const confirmDeleteComment = async () => {
    if (!deletingCommentId) return
    setBusy(true)
    const { error } = await supabase
      .from('community_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deletingCommentId)
      .eq('user_id', currentUser.id)
    setBusy(false)
    if (error) {
      toast.error('No se pudo eliminar', { description: error.message })
      return
    }
    setComments((cs) => cs.filter((c) => c.id !== deletingCommentId))
    setPost((p) => ({
      ...p,
      comment_count: Math.max(0, p.comment_count - 1),
    }))
    toast.success('Comentario eliminado')
    setDeletingCommentId(null)
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 sm:px-6 py-6">
      <Link
        href="/comunidad"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al feed
      </Link>

      <PostCard
        post={post}
        currentUserId={currentUser.id}
        variant="thread"
        onVote={votePost}
        onSave={toggleSave}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeletingPost(true)}
      />

      <div className="mt-5">
        <ReplyComposer
          currentUser={currentUser}
          onSubmit={(text, imgs) => submitReply(text, null, imgs)}
          placeholder="Escribí tu respuesta…"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-serif font-semibold text-base">
          {fmtCount(liveCount)}{' '}
          {liveCount === 1 ? 'comentario' : 'comentarios'}
        </h3>
      </div>

      <div className="mt-4 space-y-4">
        {tree.length === 0 ? (
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 text-center text-sm text-muted-foreground">
            Todavía no hay comentarios. Sé el primero en responder.
          </div>
        ) : (
          tree.map((c) => (
            <div
              key={c.id}
              className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-4"
            >
              <CommentNode
                comment={c}
                depth={0}
                currentUser={currentUser}
                replyingToId={replyingToId}
                setReplyingToId={setReplyingToId}
                onVote={voteComment}
                onSubmitReply={submitReply}
                onDelete={(id) => setDeletingCommentId(id)}
              />
            </div>
          ))
        )}
      </div>

      <ComposerDialog
        open={editing}
        onOpenChange={setEditing}
        currentUser={currentUser}
        editing={editing ? post : null}
        onUpdate={(updated) => {
          setPost((p) => ({ ...p, ...updated }))
          setEditing(false)
        }}
      />

      <AlertDialog
        open={deletingPost}
        onOpenChange={(open) => {
          if (!open && !busy) setDeletingPost(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a ocultar del feed. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDeletePost()
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingCommentId}
        onOpenChange={(open) => {
          if (!open && !busy) setDeletingCommentId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar comentario?</AlertDialogTitle>
            <AlertDialogDescription>
              El comentario y sus respuestas se quitan del hilo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDeleteComment()
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CommentNode({
  comment,
  depth,
  currentUser,
  replyingToId,
  setReplyingToId,
  onVote,
  onSubmitReply,
  onDelete,
}: {
  comment: CommunityComment
  depth: number
  currentUser: CommunityAuthor
  replyingToId: string | null
  setReplyingToId: (id: string | null) => void
  onVote: (id: string, dir: 1 | -1) => void
  onSubmitReply: (text: string, replyTo: string, images: string[]) => void
  onDelete: (commentId: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [childrenHidden, setChildrenHidden] = useState(
    depth >= MAX_DEPTH - 1 && (comment.children?.length ?? 0) > 0,
  )
  const myVote: -1 | 0 | 1 = comment.myVote ?? 0
  const author = comment.author
  const children = comment.children ?? []
  const canShowChildren = depth < MAX_DEPTH - 1
  const isOwner = comment.user_id === currentUser.id && !comment.pending

  return (
    <div className="relative">
      <div className="flex gap-3">
        <UserHoverCard
          userId={author.id}
          username={author.username ?? undefined}
          disabled={author.id === 'unknown'}
        >
          <Avatar className="size-7 shrink-0 cursor-pointer">
            {author.avatar_url && (
              <AvatarImage src={author.avatar_url} alt="" />
            )}
            <AvatarFallback className="text-[10px] font-semibold">
              {getInitials(author)}
            </AvatarFallback>
          </Avatar>
        </UserHoverCard>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <UserHoverCard
              userId={author.id}
              username={author.username ?? undefined}
              disabled={author.id === 'unknown'}
            >
              <span className="inline-flex items-center gap-2 cursor-pointer">
                <span className="font-medium text-foreground/90">
                  {displayName(author)}
                </span>
                <BadgePill karma={author.karma} />
                {author.username && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    @{author.username}
                  </span>
                )}
              </span>
            </UserHoverCard>
            <span className="text-muted-foreground">·</span>
            <RelTime iso={comment.created_at} />
            {comment.pending && (
              <span className="text-[11px] text-muted-foreground italic">
                enviando…
              </span>
            )}
            {comment.failed && (
              <span className="text-[11px] text-destructive">no enviado</span>
            )}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto w-6 h-6 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Más opciones"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(comment.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {!collapsed ? (
            <>
              {comment.body && (
                <div className="mt-1">
                  <RichTextView html={comment.body} variant="compact" />
                </div>
              )}
              {comment.image_urls?.length > 0 && (
                <div className="mt-2">
                  <ImageGrid urls={comment.image_urls} />
                </div>
              )}
              <div className="mt-1.5 flex items-center gap-1 -ml-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onVote(comment.id, 1)}
                  disabled={comment.pending}
                  className={cn(
                    'inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-mono transition-colors',
                    myVote === 1
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-primary hover:bg-muted',
                  )}
                >
                  <ArrowBigUp
                    className="w-3.5 h-3.5"
                    strokeWidth={myVote === 1 ? 2.4 : 1.8}
                  />
                  {fmtCount(comment.vote_count)}
                </button>
                <button
                  type="button"
                  onClick={() => onVote(comment.id, -1)}
                  disabled={comment.pending}
                  className={cn(
                    'w-7 h-7 grid place-items-center rounded-lg transition-colors',
                    myVote === -1
                      ? 'text-destructive'
                      : 'text-muted-foreground hover:text-destructive hover:bg-muted',
                  )}
                  aria-label="Votar negativo"
                >
                  <ArrowBigDown
                    className="w-3.5 h-3.5"
                    strokeWidth={myVote === -1 ? 2.4 : 1.8}
                  />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setReplyingToId(
                      replyingToId === comment.id ? null : comment.id,
                    )
                  }
                  disabled={comment.pending}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" strokeWidth={2} />
                  Responder
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <EyeOff className="w-3.5 h-3.5" strokeWidth={2} />
                  Ocultar
                </button>
              </div>

              {replyingToId === comment.id && (
                <div className="mt-3">
                  <ReplyComposer
                    currentUser={currentUser}
                    replyingTo={author}
                    onCancel={() => setReplyingToId(null)}
                    onSubmit={(text, imgs) =>
                      onSubmitReply(text, comment.id, imgs)
                    }
                    placeholder={`Respondiendo a ${displayName(author)}…`}
                  />
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="text-xs text-primary font-medium mt-1 inline-flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Mostrar comentario
            </button>
          )}

          {!collapsed &&
            canShowChildren &&
            !childrenHidden &&
            children.length > 0 && (
              <div className="mt-4 space-y-4 pl-3 border-l border-border">
                {children.map((child) => (
                  <CommentNode
                    key={child.id}
                    comment={child}
                    depth={depth + 1}
                    currentUser={currentUser}
                    replyingToId={replyingToId}
                    setReplyingToId={setReplyingToId}
                    onVote={onVote}
                    onSubmitReply={onSubmitReply}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}

          {!collapsed &&
            canShowChildren &&
            childrenHidden &&
            children.length > 0 && (
              <button
                type="button"
                onClick={() => setChildrenHidden(false)}
                className="mt-3 text-xs font-medium text-primary inline-flex items-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Ver {children.length}{' '}
                {children.length === 1 ? 'respuesta' : 'respuestas'} más
              </button>
            )}

          {!collapsed && !canShowChildren && children.length > 0 && (
            <button
              type="button"
              onClick={() => {
                toast.info(
                  'Las respuestas anidadas profundas se muestran en la cima del hilo.',
                )
              }}
              className="mt-3 text-xs font-medium text-muted-foreground inline-flex items-center gap-1"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              {children.length}{' '}
              {children.length === 1 ? 'respuesta' : 'respuestas'} más
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReplyComposer({
  currentUser,
  replyingTo,
  onCancel,
  onSubmit,
  placeholder,
}: {
  currentUser: CommunityAuthor
  replyingTo?: CommunityAuthor
  onCancel?: () => void
  onSubmit: (text: string, images: string[]) => void
  placeholder?: string
}) {
  const supabase = createClient()
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const submit = () => {
    const empty = isHtmlEmpty(text)
    if (empty && images.length === 0) return
    onSubmit(empty ? '' : text, images)
    setText('')
    setImages([])
  }

  const handleFilesPicked = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (images.length >= 1) {
      toast.error('Solo se puede adjuntar 1 imagen por comentario.')
      return
    }
    setUploading(true)
    const res = await uploadCommunityImage(supabase, currentUser.id, file)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!res.ok) {
      toast.error(res.reason)
      return
    }
    setImages((prev) => [...prev, res.url])
  }

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url))
    void deleteCommunityImageByUrl(supabase, url)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      {replyingTo && onCancel && (
        <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <CornerDownRight className="w-3.5 h-3.5" />
          Respondiendo a{' '}
          <span className="font-medium text-foreground/80">
            {displayName(replyingTo)}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto p-0.5 rounded hover:bg-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex gap-3">
        <Avatar className="size-7 shrink-0">
          {currentUser.avatar_url && (
            <AvatarImage src={currentUser.avatar_url} alt="" />
          )}
          <AvatarFallback className="text-[10px] font-semibold">
            {getInitials(currentUser)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <InlineEditor
            value={text}
            onChange={setText}
            onSubmit={(html) => {
              if (!html.trim() && images.length === 0) return
              onSubmit(html, images)
              setText('')
              setImages([])
            }}
            placeholder={placeholder}
            minHeight={64}
          />
          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((url) => (
                <div
                  key={url}
                  className="relative w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-background/90 border border-border hover:bg-background"
                    aria-label="Quitar imagen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 pt-2 border-t border-border/60">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleFilesPicked(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || images.length >= 1}
              className="inline-flex items-center gap-1 h-7 px-2 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" strokeWidth={2} />
              )}
              Imagen
            </button>
            <div className="ml-auto flex items-center gap-2">
              {onCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button
                size="sm"
                onClick={submit}
                disabled={uploading || (isHtmlEmpty(text) && images.length === 0)}
              >
                {replyingTo ? 'Responder' : 'Comentar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
