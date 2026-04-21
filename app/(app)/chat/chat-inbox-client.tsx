'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserHoverCard } from '@/components/user-hover-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageCircle, Search, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeInboxTime } from '@/lib/social/chat'
import { isOnlineFromLastSeen } from '@/lib/social/presence'
import { PresenceDot } from '@/components/presence-dot'
import { getInitials } from '@/lib/social/initials'
import { normalizeUsername } from '@/lib/social/normalize-username'
import type { ConversationSummary, PublicProfile } from '@/lib/types'

export interface InboxItem {
  summary: ConversationSummary
  peer: PublicProfile | null
}

interface ChatInboxClientProps {
  items: InboxItem[]
  userId: string
}

export function ChatInboxClient({ items, userId }: ChatInboxClientProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalizeUsername(query).toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      if (!it.peer) return false
      const hay = `${it.peer.nickname ?? ''} ${it.peer.username ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [items, query])

  return (
    // Desktop (md+): card con border + rounded + shadow + padding interno para
    // consistencia visual con /chat/[userId] y /friends. Mobile sin borde.
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full md:border md:border-border md:rounded-xl md:shadow-sm md:bg-background md:p-5">
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Mensajes</h1>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {items.length === 1 ? '1 conversación' : `${items.length} conversaciones`}
            </span>
          )}
        </div>
      </header>

      {items.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o username"
            className="h-10 pl-9"
            autoComplete="off"
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyInbox />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Sin resultados para <span className="font-mono">{query}</span>.
        </p>
      ) : (
        <ul className="flex flex-col rounded-xl border border-border overflow-hidden divide-y divide-border/60">
          {filtered.map((it) => (
            <InboxRow key={it.summary.id} item={it} userId={userId} />
          ))}
        </ul>
      )}
    </div>
  )
}

function InboxRow({ item, userId }: { item: InboxItem; userId: string }) {
  const { summary, peer } = item
  if (!peer) return null

  const initials = getInitials(peer.nickname ?? peer.username)
  const lm = summary.last_message
  const isMine = lm && lm.sender_id === userId
  const previewText = !lm
    ? ''
    : lm.deleted_at !== null
      ? 'Mensaje eliminado'
      : (lm.body ?? '')
  const preview = previewText.length > 100 ? previewText.slice(0, 100) + '…' : previewText
  const unread = summary.unread_count

  return (
    <li>
      <Link
        href={`/chat/${peer.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
      >
        <UserHoverCard userId={peer.id} username={peer.username ?? undefined}>
          <div className="relative shrink-0 cursor-pointer">
            <Avatar className="w-11 h-11">
              {peer.avatar_url && <AvatarImage src={peer.avatar_url} alt={`@${peer.username}`} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <PresenceDot
              online={isOnlineFromLastSeen(peer.last_seen_at)}
              size="sm"
              className="absolute bottom-0 right-0"
            />
          </div>
        </UserHoverCard>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                'text-sm truncate text-foreground',
                // Peso tipográfico como indicador primario de unread; el badge
                // numérico abajo es el otro (evita doble "acento primary").
                unread > 0 ? 'font-semibold' : 'font-medium',
              )}
            >
              {peer.nickname ?? peer.username ?? 'Usuario'}
            </p>
            {summary.last_message_at && (
              <span className="text-[11px] shrink-0 text-muted-foreground">
                {relativeInboxTime(summary.last_message_at)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                'text-[12.5px] truncate',
                lm && lm.deleted_at !== null && 'italic',
                unread > 0 ? 'text-foreground/85' : 'text-muted-foreground',
              )}
            >
              {isMine && preview && (
                <span className="text-muted-foreground font-medium">Vos: </span>
              )}
              {preview || <span className="text-muted-foreground/60">—</span>}
            </p>
            {unread > 0 && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none shrink-0">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-4 border border-dashed border-border rounded-2xl">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Todavía no hay conversaciones.</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Entrá al perfil de un amigo y enviale un mensaje para empezar.
        </p>
      </div>
      <Button asChild size="sm" className="gap-1.5">
        <Link href="/friends">
          <Users className="w-4 h-4" />
          Ver amigos
        </Link>
      </Button>
    </div>
  )
}
