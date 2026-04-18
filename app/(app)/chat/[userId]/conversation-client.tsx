'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useMessages } from '@/hooks/use-messages'
import { useIsMobile } from '@/hooks/use-mobile'
import { MessageBubble } from '@/components/message-bubble'
import { ChatComposer } from '@/components/chat-composer'
import { DaySeparator } from '@/components/day-separator'
import { dayLabel, canSendMessage, newMessagesChipLabel } from '@/lib/social/chat'
import { markConversationRead } from '@/app/(app)/chat/actions'
import type { Message, PublicProfile } from '@/lib/types'
import type { RelationshipState } from '@/lib/social/relationship'

interface ConversationClientProps {
  viewerId: string
  peer: PublicProfile
  conversationId: string
  initialMessages: Message[]
  relationshipState: RelationshipState
}

export function ConversationClient({
  viewerId,
  peer,
  conversationId,
  initialMessages,
  relationshipState,
}: ConversationClientProps) {
  const isMobile = useIsMobile()
  const { messages, loading, reachedEnd, loadMore, latestRealtimeInsertId, pushOwnEcho } =
    useMessages({ conversationId, initialMessages })

  const feedRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const lastOwnSendIdRef = useRef<string | null>(null)
  const [newCount, setNewCount] = useState(0)
  const [initialScrolled, setInitialScrolled] = useState(false)

  // Threshold for "close enough to bottom to count as following the chat".
  // Mobile uses 200px to accommodate the virtual keyboard shifting the viewport.
  const nearBottomThreshold = isMobile ? 200 : 150

  function isNearBottom(): boolean {
    const el = feedRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < nearBottomThreshold
  }

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = feedRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Initial scroll-to-bottom on first paint.
  useLayoutEffect(() => {
    if (initialScrolled) return
    scrollToBottom(false)
    setInitialScrolled(true)
  }, [initialScrolled, scrollToBottom])

  // Realtime insert arrived: decide between auto-scroll and new-messages chip.
  // Own sends bypass the threshold and always auto-scroll (tracked via pushOwnEcho).
  useEffect(() => {
    if (!latestRealtimeInsertId) return
    const last = messages[messages.length - 1]
    if (!last) return
    const isOwn = last.sender_id === viewerId
    if (isOwn) {
      // Own sends are the echo — already scrolled locally.
      scrollToBottom(true)
      return
    }
    if (isNearBottom()) {
      scrollToBottom(true)
      // Update read marker for live messages. Best-effort.
      markConversationRead(conversationId).catch(() => {})
    } else {
      setNewCount((n) => n + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestRealtimeInsertId])

  // Scroll sentinel: load more older messages when it scrolls into view.
  useEffect(() => {
    const sentinel = topSentinelRef.current
    const feed = feedRef.current
    if (!sentinel || !feed) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) loadMore()
        }
      },
      { root: feed, rootMargin: '80px 0px 0px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  // Handler the composer calls after a successful send.
  const handleSent = useCallback(
    (m: Message) => {
      lastOwnSendIdRef.current = m.id
      pushOwnEcho(m)
      // Own send → always auto-scroll regardless of threshold.
      requestAnimationFrame(() => scrollToBottom(true))
    },
    [pushOwnEcho, scrollToBottom],
  )

  // When the user scrolls close enough to bottom manually, drop the chip.
  function handleScroll() {
    if (newCount > 0 && isNearBottom()) {
      setNewCount(0)
      markConversationRead(conversationId).catch(() => {})
    }
  }

  function handleChipClick() {
    setNewCount(0)
    scrollToBottom(true)
    markConversationRead(conversationId).catch(() => {})
  }

  const composerDisabled = !canSendMessage(relationshipState)

  const initials = (peer.nickname ?? peer.username ?? '?').slice(0, 2).toUpperCase()

  // Bucket messages by day for rendering separators.
  const grouped = useMemo(() => groupByDay(messages), [messages])

  return (
    // Heights below account for: topbar (56px) + py-5 top (20px) + pb-24 mobile
    // / md:pb-8 desktop (96px / 32px). Negative horizontal margins make the
    // chat feel edge-to-edge without touching the app-shell padding itself.
    <div className="flex flex-col -mx-4 md:-mx-6 h-[calc(100svh-172px)] md:h-[calc(100svh-108px)]">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 md:px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <Link
          href="/chat"
          className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted cursor-pointer"
          aria-label="Volver a mensajes"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Link
          href={peer.username ? `/friends/${peer.username}` : '#'}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
        >
          <Avatar className="w-9 h-9 shrink-0">
            {peer.avatar_url && <AvatarImage src={peer.avatar_url} alt={`@${peer.username}`} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {peer.nickname ?? peer.username ?? 'Usuario'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">@{peer.username}</p>
          </div>
        </Link>
      </header>

      {/* Read-only banners */}
      <ReadOnlyBanner state={relationshipState} peerUsername={peer.username} />

      {/* Feed */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={feedRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain px-3 md:px-4 py-3"
        >
          <div ref={topSentinelRef} className="h-px" />
          {loading && (
            <div className="flex items-center justify-center py-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          {!reachedEnd && !loading && messages.length >= 50 && (
            <div className="flex justify-center py-2">
              <button
                onClick={loadMore}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cargar más
              </button>
            </div>
          )}
          {messages.length === 0 ? (
            <EmptyConversation peerName={peer.nickname ?? peer.username ?? 'tu amigo'} />
          ) : (
            <div className="flex flex-col gap-2">
              {grouped.map((group) => (
                <div key={group.key} className="flex flex-col gap-1">
                  <DaySeparator label={group.label} />
                  {group.items.map((m) => (
                    <MessageBubble key={m.id} message={m} isOwn={m.sender_id === viewerId} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {newCount > 0 && (
          <button
            onClick={handleChipClick}
            className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 bg-primary text-primary-foreground text-[12px] font-semibold rounded-full px-3 py-1.5 shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            {newMessagesChipLabel(newCount)}
          </button>
        )}
      </div>

      {/* Composer (sticky on mobile, normal on desktop) */}
      <div className="shrink-0 sticky bottom-0 bg-background pb-[env(safe-area-inset-bottom,0px)]">
        <ChatComposer
          conversationId={conversationId}
          onSent={handleSent}
          disabled={composerDisabled}
        />
      </div>
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────

function groupByDay(messages: Message[]): { key: string; label: string; items: Message[] }[] {
  const groups: { key: string; label: string; items: Message[] }[] = []
  let current: { key: string; label: string; items: Message[] } | null = null
  for (const m of messages) {
    const key = m.created_at.slice(0, 10)
    if (!current || current.key !== key) {
      current = { key, label: dayLabel(m.created_at), items: [m] }
      groups.push(current)
    } else {
      current.items.push(m)
    }
  }
  return groups
}

function ReadOnlyBanner({
  state,
  peerUsername,
}: {
  state: RelationshipState
  peerUsername: string | null
}) {
  if (state === 'friends' || state === 'self') return null

  if (state === 'blocked_by_me') {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 text-[12.5px] text-foreground">
        Tenés bloqueado a @{peerUsername}.{' '}
        {peerUsername && (
          <Link
            href={`/friends/${peerUsername}`}
            className="underline underline-offset-4 font-medium hover:text-primary"
          >
            Desbloqueá desde su perfil
          </Link>
        )}{' '}
        para poder chatear.
      </div>
    )
  }

  // stranger / request_sent / request_received — ex-friend with prior convo.
  return (
    <div className="bg-muted/60 border-b border-border px-4 py-2.5 text-[12.5px] text-foreground">
      Ya no son amigos. Podés leer los mensajes anteriores pero no enviar nuevos.{' '}
      {peerUsername && (
        <Link
          href={`/friends/${peerUsername}`}
          className="underline underline-offset-4 text-muted-foreground hover:text-primary"
        >
          Enviale una solicitud desde su perfil
        </Link>
      )}
      .
    </div>
  )
}

function EmptyConversation({ peerName }: { peerName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
      <p className="text-sm font-medium text-foreground">
        Este es el comienzo de tu conversación con {peerName}.
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Enviale un mensaje para empezar.
      </p>
    </div>
  )
}
