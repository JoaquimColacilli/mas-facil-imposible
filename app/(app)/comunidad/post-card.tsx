'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { CommunityPost, CommunityAuthor } from '@/lib/types'
import { CATEGORY_BY_ID, CATEGORY_COLORS } from './categories'
import { MfiEmbed } from './mfi-embed'
import { ImageGrid } from './image-grid'
import { RichTextView } from './rich-text-view'
import { BadgePill } from './badge-pill'

function getInitials(author: CommunityAuthor) {
  const display = author.nickname || author.full_name || author.username || '?'
  return display
    .split(/\s+/)
    .map((s) => s[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function displayName(author: CommunityAuthor) {
  return author.nickname || author.full_name || author.username || 'Usuario'
}

const COUNT_FORMATTER = new Intl.NumberFormat('es-AR')

/** Formats a whole number using the es-AR thousands separator (`.`). */
export function fmtCount(n: number): string {
  return COUNT_FORMATTER.format(n)
}

function formatRelative(iso: string) {
  const rtf = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' })
  const diffMs = Date.now() - new Date(iso).getTime()
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return 'hace unos segundos'
  const min = Math.round(sec / 60)
  if (min < 60) return rtf.format(-min, 'minute')
  const h = Math.round(min / 60)
  if (h < 24) return rtf.format(-h, 'hour')
  const d = Math.round(h / 24)
  if (d < 30) return rtf.format(-d, 'day')
  const mo = Math.round(d / 30)
  if (mo < 12) return rtf.format(-mo, 'month')
  return rtf.format(-Math.round(mo / 12), 'year')
}

export function RelTime({ iso }: { iso: string }) {
  return (
    <time
      dateTime={iso}
      className="text-xs text-muted-foreground"
      title={new Date(iso).toLocaleString('es-AR')}
    >
      {formatRelative(iso)}
    </time>
  )
}

export function CatChip({
  id,
  size = 'sm',
}: {
  id: string
  size?: 'xs' | 'sm'
}) {
  const cat = CATEGORY_BY_ID[id]
  if (!cat) return null
  const color = CATEGORY_COLORS[cat.color]
  const Icon = cat.icon
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        pad,
      )}
      style={{
        color,
        background: `color-mix(in oklch, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in oklch, ${color} 22%, transparent)`,
      }}
    >
      <Icon className="w-3 h-3" strokeWidth={2} />
      {cat.label}
    </span>
  )
}

export function VoteBar({
  voteCount,
  myVote,
  onVote,
  orientation = 'vertical',
}: {
  voteCount: number
  myVote: -1 | 0 | 1
  onVote: (dir: 1 | -1) => void
  orientation?: 'vertical' | 'horizontal'
}) {
  const isVert = orientation === 'vertical'
  return (
    <div
      className={cn(
        'gap-0.5 select-none',
        isVert ? 'flex flex-col items-center' : 'flex items-center',
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onVote(1)
        }}
        className={cn(
          'w-8 h-8 rounded-lg grid place-items-center transition-colors active:scale-95',
          myVote === 1
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:bg-muted',
        )}
        aria-label="Votar positivo"
      >
        <ArrowBigUp
          className="w-4 h-4"
          strokeWidth={myVote === 1 ? 2.4 : 1.8}
        />
      </button>
      <span
        className={cn(
          'font-mono text-[12px] tabular-nums min-w-[24px] text-center',
          myVote === 1
            ? 'text-primary'
            : myVote === -1
              ? 'text-destructive'
              : 'text-foreground/85',
        )}
      >
        {fmtCount(voteCount)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onVote(-1)
        }}
        className={cn(
          'w-8 h-8 rounded-lg grid place-items-center transition-colors active:scale-95',
          myVote === -1
            ? 'text-destructive bg-destructive/10'
            : 'text-muted-foreground hover:bg-muted',
        )}
        aria-label="Votar negativo"
      >
        <ArrowBigDown
          className="w-4 h-4"
          strokeWidth={myVote === -1 ? 2.4 : 1.8}
        />
      </button>
    </div>
  )
}

interface PostCardProps {
  post: CommunityPost
  currentUserId?: string
  onVote: (dir: 1 | -1) => void
  onSave: () => void
  onEdit?: () => void
  onDelete?: () => void
  variant?: 'classic' | 'thread'
}

export function PostCard({
  post,
  currentUserId,
  onVote,
  onSave,
  onEdit,
  onDelete,
  variant = 'classic',
}: PostCardProps) {
  const voteCount = post.vote_count
  const myVote: -1 | 0 | 1 = post.myVote ?? 0
  const isThread = variant === 'thread'
  const isOwner = !!currentUserId && post.user_id === currentUserId

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const url = `${window.location.origin}/comunidad/${post.id}`
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success('Link copiado'))
      .catch(() => toast.error('No se pudo copiar'))
  }

  const body = (
    <>
      <div className="hidden sm:flex flex-col items-center py-3 px-2 border-r border-border shrink-0">
        <VoteBar voteCount={voteCount} myVote={myVote} onVote={onVote} />
      </div>
      <div className="flex-1 min-w-0 p-4 sm:pl-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="size-6">
            {post.author.avatar_url && (
              <AvatarImage src={post.author.avatar_url} alt="" />
            )}
            <AvatarFallback className="text-[10px] font-semibold">
              {getInitials(post.author)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground/85">
            {displayName(post.author)}
          </span>
          <BadgePill karma={post.author.karma} />
          {post.author.username && (
            <span className="font-mono text-[11px] text-muted-foreground hidden sm:inline">
              @{post.author.username}
            </span>
          )}
          <span>·</span>
          <RelTime iso={post.created_at} />
          {post.edited_at && (
            <span
              className="text-[11px] italic text-muted-foreground"
              title={`Editado: ${new Date(post.edited_at).toLocaleString('es-AR')}`}
            >
              (editado)
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <CatChip id={post.category} size="xs" />
            {isOwner && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                    className="w-7 h-7 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Más opciones"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onEdit()
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDelete()
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <h3
          className={cn(
            'mt-2 font-serif font-semibold leading-snug',
            isThread
              ? 'text-[22px] sm:text-[24px] tracking-tight'
              : 'text-[17px]',
          )}
          style={{ textWrap: 'pretty' }}
        >
          {post.title}
        </h3>
        {post.body && (
          <ExpandableBody body={post.body} isThread={isThread} />
        )}
        {post.image_urls.length > 0 && (
          <div className="mt-3">
            <ImageGrid urls={post.image_urls} />
          </div>
        )}
        {post.embed && (
          <div className="mt-3">
            <MfiEmbed
              data={post.embed}
              variant={isThread ? 'rich' : 'compact'}
            />
          </div>
        )}
        <div
          className={cn(
            'mt-3',
            isThread &&
              'pt-4 mt-5 border-t border-border/60',
          )}
        >
          <PostFooter
            post={post}
            voteCount={voteCount}
            myVote={myVote}
            onVote={onVote}
            onSave={onSave}
            onShare={handleShare}
          />
        </div>
      </div>
    </>
  )

  const card = (
    <div
      className={cn(
        'bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden',
        !isThread &&
          'transition-all hover:-translate-y-[1px] hover:border-primary/30',
      )}
    >
      <div className="flex">{body}</div>
    </div>
  )

  if (isThread) return card

  return (
    <Link
      href={`/comunidad/${post.id}`}
      className="block cursor-pointer animate-fade-in-up focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      {card}
    </Link>
  )
}

function PostFooter({
  post,
  voteCount,
  myVote,
  onVote,
  onSave,
  onShare,
}: {
  post: CommunityPost
  voteCount: number
  myVote: -1 | 0 | 1
  onVote: (dir: 1 | -1) => void
  onSave: () => void
  onShare: (e: React.MouseEvent) => void
}) {
  return (
    <div className="flex items-center gap-1 text-[13px]">
      <div className="sm:hidden flex items-center gap-1 rounded-lg bg-muted px-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onVote(1)
          }}
          className={cn(
            'w-7 h-7 grid place-items-center rounded-lg transition-colors',
            myVote === 1 ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-label="Votar positivo"
        >
          <ArrowBigUp
            className="w-4 h-4"
            strokeWidth={myVote === 1 ? 2.4 : 1.8}
          />
        </button>
        <span
          className={cn(
            'font-mono text-[12px] tabular-nums min-w-[22px] text-center',
            myVote === 1
              ? 'text-primary'
              : myVote === -1
                ? 'text-destructive'
                : '',
          )}
        >
          {fmtCount(voteCount)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onVote(-1)
          }}
          className={cn(
            'w-7 h-7 grid place-items-center rounded-lg transition-colors',
            myVote === -1 ? 'text-destructive' : 'text-muted-foreground',
          )}
          aria-label="Votar negativo"
        >
          <ArrowBigDown
            className="w-4 h-4"
            strokeWidth={myVote === -1 ? 2.4 : 1.8}
          />
        </button>
      </div>
      <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-muted-foreground font-medium">
        <MessageSquare className="w-4 h-4" strokeWidth={1.8} />
        <span className="font-mono text-xs tabular-nums">
          {fmtCount(post.comment_count)}
        </span>
        <span className="hidden sm:inline">comentarios</span>
      </span>
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-muted-foreground hover:bg-muted font-medium"
      >
        <Share2 className="w-4 h-4" strokeWidth={1.8} />
        <span className="hidden sm:inline">Compartir</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onSave()
        }}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg font-medium ml-auto',
          post.saved
            ? 'text-accent'
            : 'text-muted-foreground hover:bg-muted',
        )}
      >
        <Bookmark
          className="w-4 h-4"
          strokeWidth={post.saved ? 2.6 : 1.8}
          fill={post.saved ? 'currentColor' : 'none'}
        />
        <span className="hidden sm:inline">
          {post.saved ? 'Guardado' : 'Guardar'}
        </span>
      </button>
    </div>
  )
}

/**
 * Classic variant: wraps body in a collapsible container that measures the
 * rendered height and shows a "Ver más / Ver menos" toggle when content
 * overflows ~5 lines. Thread variant renders the body in full.
 *
 * Body may be HTML (Tiptap output) or legacy plain text — RichTextView
 * detects and renders accordingly.
 */
const COLLAPSED_MAX_PX = 120 // ~5 lines of 15px body copy

function ExpandableBody({
  body,
  isThread,
}: {
  body: string
  isThread: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)

  useEffect(() => {
    if (isThread) return
    const el = ref.current
    if (!el) return
    // Measure the FULL scrollHeight of the inner content. If it exceeds
    // the collapsed cap, show the toggle. Recomputes when the body changes
    // (edit flow) or when images inside the content load and reflow.
    setCanExpand(el.scrollHeight - COLLAPSED_MAX_PX > 2)
  }, [body, isThread])

  if (isThread) {
    return (
      <div className="mt-3">
        <RichTextView html={body} />
      </div>
    )
  }

  return (
    <div className="mt-1.5">
      <div
        ref={ref}
        className={cn(
          'overflow-hidden transition-[max-height] duration-150 ease-out',
          !expanded && 'max-h-[120px]',
          !expanded && canExpand &&
            '[mask-image:linear-gradient(to_bottom,black_60%,transparent)]',
        )}
        style={expanded ? { maxHeight: 'none' } : undefined}
      >
        <RichTextView html={body} variant="compact" />
      </div>
      {canExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setExpanded((v) => !v)
          }}
          className="mt-1 text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  )
}

export { displayName, getInitials }
