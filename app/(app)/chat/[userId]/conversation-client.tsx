'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useMessages } from '@/hooks/use-messages'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePresence } from '@/hooks/use-presence'
import { useTyping } from '@/hooks/use-typing'
import { MessageBubble } from '@/components/message-bubble'
import { ChatComposer, type ReplyingTo } from '@/components/chat-composer'
import { toast } from 'sonner'
import { DaySeparator } from '@/components/day-separator'
import { PresenceDot } from '@/components/presence-dot'
import { TypingIndicator } from '@/components/typing-indicator'
import { dayLabel, canSendMessage, newMessagesChipLabel } from '@/lib/social/chat'
import { markConversationRead } from '@/app/(app)/chat/actions'
import { isOnlineFromLastSeen } from '@/lib/social/presence'
import { getInitials } from '@/lib/social/initials'
import { broadcastSocialEvent } from '@/lib/social/broadcast'
import { mutate as swrMutate } from 'swr'
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

  // Presence + typing viven en un canal compartido por conversación:
  // `chat:${conversationId}`. No colisiona con `conversation:${id}` (canal de
  // postgres_changes de Fase 4). Habilitados solo cuando la conversación es
  // activa (friends) — ex-amigos y blocked_by_me son read-only, sin señales.
  const channelLive = relationshipState === 'friends'
  const channelKey = channelLive ? `chat:${conversationId}` : null
  const { peerOnline } = usePresence({
    channelKey,
    viewerId,
    peerId: peer.id,
    enabled: channelLive,
  })
  const { peerTyping, notifyTyping, notifyStop } = useTyping({
    channelKey,
    viewerId,
    peerId: peer.id,
    enabled: channelLive,
  })

  // Fallback derivado: si el channel Presence aún no sincronizó (abrir chat
  // recién), usamos el last_seen_at del SSR para evitar mostrar offline falso
  // durante los primeros ~500ms.
  const derivedOnline = isOnlineFromLastSeen(peer.last_seen_at)
  const headerOnline = peerOnline || derivedOnline

  const feedRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const lastOwnSendIdRef = useRef<string | null>(null)
  const [newCount, setNewCount] = useState(0)
  const [initialScrolled, setInitialScrolled] = useState(false)
  const [replyingToMsg, setReplyingToMsg] = useState<Message | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const peerLabel = peer.nickname ?? (peer.username ? `@${peer.username}` : 'el usuario')

  // Compone el preview bar del composer cuando hay un reply activo.
  const replyingTo: ReplyingTo | null = useMemo(() => {
    if (!replyingToMsg) return null
    const isOwn = replyingToMsg.sender_id === viewerId
    const label = isOwn ? 'Respondiendo a vos' : `Respondiendo a ${peerLabel}`
    const preview =
      replyingToMsg.deleted_at !== null
        ? 'Mensaje eliminado'
        : (replyingToMsg.body || '').slice(0, 160)
    return { id: replyingToMsg.id, label, preview }
  }, [replyingToMsg, viewerId, peerLabel])

  const handleStartReply = useCallback((m: Message) => {
    setReplyingToMsg(m)
  }, [])

  const handleCancelReply = useCallback(() => {
    setReplyingToMsg(null)
  }, [])

  // Scroll a un mensaje quoted. Si está en el DOM → scroll + highlight 1s.
  // Si no está cargado (paginado hacia arriba) → toast. En v2.1 podemos sumar
  // loadMore-hasta-encontrar con cap.
  const handleQuoteClick = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`)
    if (!el) {
      toast.info('El mensaje original no está cargado. Cargá más arriba para verlo.')
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(messageId)
    setTimeout(() => {
      setHighlightedId((current) => (current === messageId ? null : current))
    }, 1000)
  }, [])

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

  // Fase 7: after a mark-read (DB already bumped read_at), propagate the
  // state change without waiting for a poll:
  //   1. SWR mutate local chat-unread-count → topbar badge updates.
  //   2. Broadcast to peer → their ✓✓ tick appears (via postgres_changes
  //      UPDATE, which works now thanks to REPLICA IDENTITY FULL in 021),
  //      AND their inbox unread_count row refreshes.
  //   3. Broadcast to self → other tabs of the same viewer sync their
  //      badge/inbox (broadcasts don't echo back to the emitting client).
  const notifyConversationRead = useCallback(() => {
    swrMutate(`chat-unread-count-${viewerId}`)
    void broadcastSocialEvent(peer.id, 'conversation_read_peer', {
      conversation_id: conversationId,
      by_user_id: viewerId,
    })
    void broadcastSocialEvent(viewerId, 'conversation_read_peer', {
      conversation_id: conversationId,
      by_user_id: viewerId,
    })
  }, [conversationId, viewerId, peer.id])

  const markReadAndNotify = useCallback(() => {
    markConversationRead(conversationId)
      .then((res) => {
        if (res?.ok) notifyConversationRead()
      })
      .catch(() => {})
  }, [conversationId, notifyConversationRead])

  // Client-side mark-read is primary; the SSR call in page.tsx is a defensive
  // first pass but not to be relied on (Next.js caching can skip it on soft
  // nav, silent RPC failures would leave DB inconsistent). This RPC call is
  // idempotent — UPDATEs match 0 rows if already read.
  useEffect(() => {
    markReadAndNotify()
    // Intentionally runs on mount only; subsequent triggers go through
    // markReadAndNotify from the scroll / chip / realtime handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // Initial scroll-to-bottom on first paint.
  useLayoutEffect(() => {
    if (initialScrolled) return
    scrollToBottom(false)
    setInitialScrolled(true)
  }, [initialScrolled, scrollToBottom])

  // Realtime insert arrived: decide between auto-scroll and new-messages chip.
  // Own sends bypass the threshold and always auto-scroll (tracked via pushOwnEcho).
  //
  // Ajuste B (Fase 5): el RPC mark_conversation_read (que ahora además batch-
  // updatea messages.read_at → ✓✓ para el sender) se dispara SOLO cuando el
  // viewer efectivamente vio el mensaje. Los triggers son:
  //   - SSR (page.tsx) on mount  → asume abrir la conv = ver los mensajes.
  //   - Realtime INSERT + isNearBottom → auto-scroll al nuevo, mark_read.
  //   - handleScroll (newCount > 0 + transición a isNearBottom) → mark_read.
  //   - handleChipClick → scroll y mark_read.
  // Si llega un mensaje y el viewer está scrolleando arriba (!isNearBottom),
  // solo se bumpea el contador — el peer NO ve ✓✓ hasta que vos llegues al
  // bottom. Semánticamente correcto para read receipts.
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
      markReadAndNotify()
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
      markReadAndNotify()
    }
  }

  function handleChipClick() {
    setNewCount(0)
    scrollToBottom(true)
    markReadAndNotify()
  }

  const composerDisabled = !canSendMessage(relationshipState)

  const initials = getInitials(peer.nickname ?? peer.username)

  // Bucket messages by day for rendering separators.
  const grouped = useMemo(() => groupByDay(messages), [messages])

  return (
    // Heights account for: topbar (56px) + py-5 top (20px) + pb-24 mobile
    // / md:pb-8 desktop (96px / 32px). Container capado a max-w-3xl +
    // mx-auto + w-full para alinear con /chat (inbox) y /friends (Fase 7).
    // Desktop (md+) agrega border + rounded + shadow para que el chat no flote.
    // Mobile: edge-to-edge sin borde.
    // Header y composer llevan rounded-t/b-xl matching para que el sticky no
    // asome más allá del corner del wrapper en md+.
    <div className="flex flex-col max-w-3xl mx-auto w-full h-[calc(100svh-172px)] md:h-[calc(100svh-108px)] md:border md:border-border md:rounded-xl md:shadow-sm md:bg-background md:overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 md:px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20 md:rounded-t-xl">
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
          <div className="relative shrink-0">
            <Avatar className="w-9 h-9">
              {peer.avatar_url && <AvatarImage src={peer.avatar_url} alt={`@${peer.username}`} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {channelLive && (
              <PresenceDot
                online={headerOnline}
                size="sm"
                className="absolute bottom-0 right-0"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {peer.nickname ?? peer.username ?? 'Usuario'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {channelLive
                ? headerOnline
                  ? 'En línea'
                  : `@${peer.username}`
                : `@${peer.username}`}
            </p>
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
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isOwn={m.sender_id === viewerId}
                      viewerId={viewerId}
                      peerLabel={peerLabel}
                      highlighted={highlightedId === m.id}
                      onReply={handleStartReply}
                      onQuoteClick={handleQuoteClick}
                    />
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

      {/* Typing indicator — altura fija, no desplaza el feed */}
      {channelLive && (
        <TypingIndicator visible={peerTyping} username={peer.username} />
      )}

      {/* Composer (sticky on mobile, normal on desktop) */}
      <div className="shrink-0 sticky bottom-0 bg-background pb-[env(safe-area-inset-bottom,0px)] md:rounded-b-xl">
        <ChatComposer
          conversationId={conversationId}
          onSent={handleSent}
          disabled={composerDisabled}
          onTyping={channelLive ? notifyTyping : undefined}
          onStopTyping={channelLive ? notifyStop : undefined}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
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
