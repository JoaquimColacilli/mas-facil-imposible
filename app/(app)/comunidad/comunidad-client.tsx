'use client'

import { useMemo, useState } from 'react'
import {
  Users,
  Plus,
  Clock,
  TrendingUp,
  Flame,
  MessagesSquare,
  Sparkles,
  BookOpen,
  Bookmark,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
  CommunityCategoryId,
  CommunityPost,
} from '@/lib/types'
import {
  TOP_LEVEL_CATEGORIES,
  COMMUNITY_RULES,
  CATEGORY_COLORS,
} from './categories'
import { PostCard, fmtCount, getInitials, displayName } from './post-card'
import { ComposerDialog } from './composer-dialog'
import { SearchBox } from './search-box'

type SortOption = 'recientes' | 'votados' | 'comentados'
type ActiveCategory = CommunityCategoryId | 'todo'

interface Props {
  initialPosts: CommunityPost[]
  currentUser: CommunityAuthor
}

export function ComunidadClient({ initialPosts, currentUser }: Props) {
  const supabase = createClient()
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>('todo')
  const [sort, setSort] = useState<SortOption>('recientes')
  const [savedOnly, setSavedOnly] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null)
  const [deletingPost, setDeletingPost] = useState<CommunityPost | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    let list = posts
    if (savedOnly) {
      list = list.filter((p) => p.saved)
    }
    if (activeCategory !== 'todo') {
      list = list.filter((p) => p.category === activeCategory)
    }
    if (sort === 'votados') {
      list = [...list].sort((a, b) => b.vote_count - a.vote_count)
    } else if (sort === 'comentados') {
      list = [...list].sort((a, b) => b.comment_count - a.comment_count)
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    }
    return list
  }, [posts, activeCategory, sort, savedOnly])

  const vote = async (postId: string, dir: 1 | -1) => {
    const current = posts.find((p) => p.id === postId)
    if (!current) return
    const prevVote: -1 | 0 | 1 = current.myVote ?? 0
    const nextVote: -1 | 0 | 1 = prevVote === dir ? 0 : dir
    const delta = nextVote - prevVote

    setPosts((ps) =>
      ps.map((p) =>
        p.id === postId
          ? { ...p, myVote: nextVote, vote_count: p.vote_count + delta }
          : p,
      ),
    )

    try {
      if (nextVote === 0) {
        const { error } = await supabase
          .from('community_votes')
          .delete()
          .match({
            user_id: currentUser.id,
            target_kind: 'post',
            target_id: postId,
          })
        if (error) throw error
      } else {
        const { error } = await supabase.from('community_votes').upsert(
          {
            user_id: currentUser.id,
            target_kind: 'post',
            target_id: postId,
            value: nextVote,
          },
          { onConflict: 'user_id,target_kind,target_id' },
        )
        if (error) throw error
      }
    } catch (err) {
      setPosts((ps) =>
        ps.map((p) =>
          p.id === postId
            ? { ...p, myVote: prevVote, vote_count: p.vote_count - delta }
            : p,
        ),
      )
      toast.error('No se pudo registrar el voto', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const toggleSave = async (postId: string) => {
    const current = posts.find((p) => p.id === postId)
    if (!current) return
    const nextSaved = !current.saved
    setPosts((ps) =>
      ps.map((p) => (p.id === postId ? { ...p, saved: nextSaved } : p)),
    )
    try {
      if (nextSaved) {
        const { error } = await supabase
          .from('community_saves')
          .insert({ user_id: currentUser.id, post_id: postId })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('community_saves')
          .delete()
          .match({ user_id: currentUser.id, post_id: postId })
        if (error) throw error
      }
    } catch (err) {
      setPosts((ps) =>
        ps.map((p) =>
          p.id === postId ? { ...p, saved: !nextSaved } : p,
        ),
      )
      toast.error('No se pudo guardar', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const handlePublish = (post: CommunityPost) => {
    setPosts((ps) => [post, ...ps])
  }

  const handleUpdated = (updated: CommunityPost) => {
    setPosts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)))
    setEditingPost(null)
  }

  const confirmDelete = async () => {
    if (!deletingPost) return
    setDeleting(true)
    const { error } = await supabase
      .from('community_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deletingPost.id)
      .eq('user_id', currentUser.id)
    setDeleting(false)
    if (error) {
      toast.error('No se pudo eliminar', { description: error.message })
      return
    }
    setPosts((ps) => ps.filter((p) => p.id !== deletingPost.id))
    toast.success('Publicación eliminada')
    setDeletingPost(null)
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Feed */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="font-serif font-semibold text-[28px] leading-tight tracking-tight">
                  Comunidad
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Compartí y aprendé con otros.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">
                  {fmtCount(posts.length)}
                </span>
                publicaciones
              </div>
            </div>

            {/* Composer trigger */}
            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-2.5 flex items-center gap-3">
              <Avatar className="size-9">
                {currentUser.avatar_url && (
                  <AvatarImage src={currentUser.avatar_url} alt="" />
                )}
                <AvatarFallback className="text-xs font-semibold">
                  {getInitials(currentUser)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="flex-1 h-10 rounded-lg border border-border bg-muted/40 px-3 text-left text-sm text-muted-foreground hover:border-primary/40 transition-colors"
              >
                ¿Qué querés compartir,{' '}
                {displayName(currentUser).split(' ')[0]}?
              </button>
              <Button
                onClick={() => setComposerOpen(true)}
                className="hidden sm:inline-flex"
              >
                <Plus className="w-4 h-4" />
                Publicar
              </Button>
            </div>

            {/* Search */}
            <SearchBox posts={posts} />

            {/* Category chips */}
            <CategoryChips
              active={activeCategory}
              onChange={setActiveCategory}
            />

            {/* Sort + saved filter + count */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <SortToggle sort={sort} setSort={setSort} />
                <button
                  type="button"
                  onClick={() => setSavedOnly((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-medium border transition-colors',
                    savedOnly
                      ? 'bg-accent/15 text-accent border-accent/40'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
                  )}
                  aria-pressed={savedOnly}
                >
                  <Bookmark
                    className="w-3.5 h-3.5"
                    strokeWidth={savedOnly ? 2.4 : 1.8}
                    fill={savedOnly ? 'currentColor' : 'none'}
                  />
                  Guardadas
                </button>
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                <span className="font-mono tabular-nums">
                  {fmtCount(filtered.length)}
                </span>{' '}
                {filtered.length === 1 ? 'publicación' : 'publicaciones'}
              </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <EmptyState
                hasPosts={posts.length > 0}
                savedOnly={savedOnly}
                onCompose={() => setComposerOpen(true)}
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    currentUserId={currentUser.id}
                    onVote={(dir) => vote(p.id, dir)}
                    onSave={() => toggleSave(p.id)}
                    onEdit={() => setEditingPost(p)}
                    onDelete={() => setDeletingPost(p)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="hidden xl:block w-[300px] shrink-0 space-y-4">
            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2">
                <BookOpen
                  className="w-4 h-4 text-primary"
                  strokeWidth={2.2}
                />
                <h3 className="font-serif font-semibold">
                  Reglas de la comunidad
                </h3>
              </div>
              <ol className="mt-3 space-y-2 text-[13px] text-foreground/80">
                {COMMUNITY_RULES.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-5 pt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ textWrap: 'pretty' }}>{r}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-accent" strokeWidth={2.2} />
                <h3 className="font-serif font-semibold">Actividad</h3>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between py-1">
                  <span>Publicaciones</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {fmtCount(posts.length)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Tus publicaciones</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {fmtCount(
                      posts.filter((p) => p.user_id === currentUser.id).length,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Guardadas</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {fmtCount(posts.filter((p) => p.saved).length)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        currentUser={currentUser}
        onPublish={handlePublish}
      />

      <ComposerDialog
        open={!!editingPost}
        onOpenChange={(open) => {
          if (!open) setEditingPost(null)
        }}
        currentUser={currentUser}
        editing={editingPost}
        onUpdate={handleUpdated}
      />

      <AlertDialog
        open={!!deletingPost}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletingPost(null)
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
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function CategoryChips({
  active,
  onChange,
}: {
  active: ActiveCategory
  onChange: (id: ActiveCategory) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-2 px-2 pb-2">
      {TOP_LEVEL_CATEGORIES.map((cat) => {
        const isActive = cat.id === active
        const Icon = cat.icon
        const color = CATEGORY_COLORS[cat.color]
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id as ActiveCategory)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-medium border transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground/80 hover:border-primary/40',
            )}
            style={
              !isActive && cat.id !== 'todo'
                ? {
                    color,
                    borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
                  }
                : undefined
            }
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}

function SortToggle({
  sort,
  setSort,
}: {
  sort: SortOption
  setSort: (s: SortOption) => void
}) {
  const opts: { id: SortOption; label: string; icon: typeof Clock }[] = [
    { id: 'recientes', label: 'Recientes', icon: Clock },
    { id: 'votados', label: 'Más votados', icon: TrendingUp },
    { id: 'comentados', label: 'Comentados', icon: Flame },
  ]
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted border border-border">
      {opts.map((o) => {
        const active = sort === o.id
        const Icon = o.icon
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setSort(o.id)}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12.5px] font-medium transition-colors',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function EmptyState({
  hasPosts,
  savedOnly,
  onCompose,
}: {
  hasPosts: boolean
  savedOnly: boolean
  onCompose: () => void
}) {
  if (savedOnly) {
    return (
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-10 grid place-items-center text-center">
        <div className="w-14 h-14 rounded-2xl border border-border grid place-items-center bg-muted/40 mb-4">
          <Bookmark
            className="w-6 h-6 text-accent"
            strokeWidth={1.8}
          />
        </div>
        <h3 className="font-serif font-semibold text-lg">
          Todavía no guardaste ninguna publicación.
        </h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Tocá el marcador en cualquier publicación para volver a encontrarla acá.
        </p>
      </div>
    )
  }
  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-10 grid place-items-center text-center">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-2xl border border-border grid place-items-center bg-muted/40">
          <MessagesSquare
            className="w-7 h-7 text-primary"
            strokeWidth={1.8}
          />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full border border-border bg-background grid place-items-center">
          <Sparkles className="w-3 h-3 text-accent" strokeWidth={2.2} />
        </div>
      </div>
      <h3 className="font-serif font-semibold text-lg">
        {hasPosts
          ? 'No hay publicaciones en esta categoría.'
          : 'Todavía no hay publicaciones acá.'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {hasPosts
          ? 'Probá con otra categoría o sé el primero en compartir algo acá.'
          : 'Sé el primero en compartir. Contá una jugada, una pregunta o una meta — alguien la está buscando.'}
      </p>
      <div className="mt-5">
        <Button onClick={onCompose}>
          <Plus className="w-4 h-4" />
          Crear publicación
        </Button>
      </div>
    </div>
  )
}
