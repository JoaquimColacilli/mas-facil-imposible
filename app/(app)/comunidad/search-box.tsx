'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, useEffect } from 'react'
import { Search, X, ArrowBigUp, MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { CommunityPost } from '@/lib/types'
import { CatChip, displayName, getInitials } from './post-card'

interface Props {
  posts: CommunityPost[]
}

const MAX_RESULTS = 8

function scoreMatch(post: CommunityPost, needle: string): number {
  // Matches in title weigh more than body, and an exact substring in title
  // trumps everything. Returns 0 if no match — caller filters those out.
  const n = needle.toLowerCase()
  const title = post.title.toLowerCase()
  const body = post.body.toLowerCase()
  const name = displayName(post.author).toLowerCase()
  const handle = (post.author.username ?? '').toLowerCase()

  let score = 0
  if (title.startsWith(n)) score += 60
  if (title.includes(n)) score += 30
  if (body.includes(n)) score += 8
  if (name.includes(n) || handle.includes(n)) score += 20
  return score
}

export function SearchBox({ posts }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const results = useMemo(() => {
    const q = query.trim()
    if (q.length < 2) return []
    const ranked = posts
      .map((p) => ({ post: p, score: scoreMatch(p, q) }))
      .filter((x) => x.score > 0)
      // Boost by upvotes so a popular fuzzy hit beats an obscure exact hit
      .sort(
        (a, b) =>
          b.score + Math.log10(Math.max(1, b.post.vote_count + 1)) * 5 -
          (a.score + Math.log10(Math.max(1, a.post.vote_count + 1)) * 5),
      )
      .slice(0, MAX_RESULTS)
    return ranked.map((r) => r.post)
  }, [posts, query])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const showResults = open && query.trim().length >= 2

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('')
      inputRef.current?.blur()
      setOpen(false)
      return
    }
    if (!showResults || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = results[activeIdx]
      if (pick) {
        window.location.href = `/comunidad/${pick.id}`
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-2 h-10 rounded-lg border bg-card px-3 transition-colors',
          open
            ? 'border-primary/60 ring-2 ring-primary/15'
            : 'border-border hover:border-primary/30',
        )}
      >
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar publicaciones…"
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="w-6 h-6 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Limpiar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline font-mono text-[10px] text-muted-foreground bg-muted/60 border border-border rounded px-1.5 py-0.5">
            Ctrl K
          </kbd>
        )}
      </div>

      {showResults && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1.5 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sin coincidencias para{' '}
              <span className="font-medium text-foreground">
                &ldquo;{query}&rdquo;
              </span>
              .
            </div>
          ) : (
            <ul className="max-h-[380px] overflow-y-auto scrollbar-thin py-1">
              {results.map((post, idx) => (
                <li key={post.id}>
                  <Link
                    href={`/comunidad/${post.id}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2.5 transition-colors',
                      activeIdx === idx && 'bg-muted/60',
                    )}
                  >
                    <Avatar className="size-8 shrink-0 mt-0.5">
                      {post.author.avatar_url && (
                        <AvatarImage src={post.author.avatar_url} alt="" />
                      )}
                      <AvatarFallback className="text-[10px] font-semibold">
                        {getInitials(post.author)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate text-foreground">
                          {post.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">
                          {displayName(post.author)}
                        </span>
                        <span className="opacity-60">·</span>
                        <span className="inline-flex items-center gap-0.5 font-mono tabular-nums">
                          <ArrowBigUp className="w-3 h-3" />
                          {post.vote_count}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-mono tabular-nums">
                          <MessageSquare className="w-3 h-3" />
                          {post.comment_count}
                        </span>
                      </div>
                    </div>
                    <CatChip id={post.category} size="xs" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
