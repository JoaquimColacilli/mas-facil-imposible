'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { BadgePill } from './badge-pill'

export interface MentionItem {
  id: string
  username: string | null
  nickname: string | null
  avatar_url: string | null
  karma: number | null
}

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface Props {
  items: MentionItem[]
  loading?: boolean
  query: string
  command: (item: { id: string; label: string }) => void
}

function labelFor(item: MentionItem): string {
  return item.nickname || item.username || 'usuario'
}

function initialsFor(item: MentionItem): string {
  const raw = (item.nickname || item.username || '?').trim()
  return raw
    .split(/\s+/)
    .map((s) => s[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export const MentionList = forwardRef<MentionListRef, Props>(
  ({ items, loading, query, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const pick = (index: number) => {
      const it = items[index]
      if (!it) return
      command({ id: it.id, label: labelFor(it) })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(
            (i) => (i + items.length - 1) % Math.max(items.length, 1),
          )
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % Math.max(items.length, 1))
          return true
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          pick(selectedIndex)
          return true
        }
        return false
      },
    }))

    return (
      <div className="w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
        <div className="px-3 py-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
          {loading
            ? 'Buscando…'
            : query
              ? `Mencionar a “${query}”`
              : 'Mencionar a alguien'}
        </div>
        {items.length === 0 && !loading ? (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            Sin coincidencias.
          </div>
        ) : (
          <ul className="max-h-64 overflow-y-auto scrollbar-thin py-1">
            {items.map((it, idx) => (
              <li key={it.id}>
                <button
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => pick(idx)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors cursor-pointer',
                    idx === selectedIndex && 'bg-muted/70',
                  )}
                >
                  <Avatar className="size-7 shrink-0">
                    {it.avatar_url && (
                      <AvatarImage src={it.avatar_url} alt="" />
                    )}
                    <AvatarFallback className="text-[10px] font-semibold">
                      {initialsFor(it)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {labelFor(it)}
                      </span>
                      <BadgePill karma={it.karma} showLabel={false} />
                    </div>
                    {it.username && (
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        @{it.username}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
)

MentionList.displayName = 'MentionList'
