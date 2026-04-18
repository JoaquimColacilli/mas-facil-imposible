'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

export const PAGE_SIZE = 50

interface UseMessagesArgs {
  conversationId: string | null
  initialMessages: Message[]
}

interface UseMessagesResult {
  messages: Message[]
  /** True while fetching a loadMore page. */
  loading: boolean
  /** True when no older messages are left. */
  reachedEnd: boolean
  /** Fetch the next (older) page. Idempotent while loading. */
  loadMore: () => Promise<void>
  /** The last INSERT received via Realtime — drives auto-scroll / new-chip logic. */
  latestRealtimeInsertId: string | null
  /** Push a message into local state synchronously (own send echo). */
  pushOwnEcho: (m: Message) => void
}

/**
 * SWR-less messages hook. Owns:
 *   - local state seeded with SSR page (initialMessages, newest-last order)
 *   - Realtime INSERT/UPDATE subscription per conversation
 *   - loadMore for infinite scroll upward (older pages)
 *   - dedupe via a ref-based Set<string> that accumulates ids from SSR page,
 *     loadMore pages, Realtime INSERTs, and own echoes. Prevents doubling on
 *     websocket reconnection and on own-send echo collision with Realtime.
 */
export function useMessages({
  conversationId,
  initialMessages,
}: UseMessagesArgs): UseMessagesResult {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [loading, setLoading] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(initialMessages.length < PAGE_SIZE)
  const [latestRealtimeInsertId, setLatestRealtimeInsertId] = useState<string | null>(null)

  const seenIds = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)))
  const loadingRef = useRef(false)

  // Re-seed when conversationId changes (navigating between chats).
  useEffect(() => {
    seenIds.current = new Set(initialMessages.map((m) => m.id))
    setMessages(initialMessages)
    setReachedEnd(initialMessages.length < PAGE_SIZE)
    setLatestRealtimeInsertId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  const ingest = useCallback((m: Message, source: 'realtime_insert' | 'realtime_update' | 'own_echo') => {
    if (seenIds.current.has(m.id)) {
      // UPDATE path (soft delete, or echo collision) — replace the row.
      setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)))
      return
    }
    seenIds.current.add(m.id)
    setMessages((prev) => [...prev, m])
    if (source === 'realtime_insert') setLatestRealtimeInsertId(m.id)
  }, [])

  const pushOwnEcho = useCallback((m: Message) => ingest(m, 'own_echo'), [ingest])

  const prependOlder = useCallback((older: Message[]) => {
    const fresh = older.filter((m) => !seenIds.current.has(m.id))
    fresh.forEach((m) => seenIds.current.add(m.id))
    if (fresh.length === 0) return
    setMessages((prev) => [...fresh, ...prev])
  }, [])

  const loadMore = useCallback(async () => {
    if (!conversationId || reachedEnd || loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const oldest = messages[0]
      if (!oldest) {
        setReachedEnd(true)
        return
      }
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at, deleted_at, edited_at')
        .eq('conversation_id', conversationId)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) return
      const page = (data ?? []) as Message[]
      // DB returned newest-first on the older slice → reverse to chronological.
      prependOlder([...page].reverse())
      if (page.length < PAGE_SIZE) setReachedEnd(true)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [conversationId, reachedEnd, messages, supabase, prependOlder])

  // Realtime subscription. Cleanup mandatory — a leaked channel leaks a
  // websocket slot and the browser silently caps them.
  useEffect(() => {
    if (!conversationId) return
    const channel: RealtimeChannel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => ingest(payload.new as Message, 'realtime_insert'),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => ingest(payload.new as Message, 'realtime_update'),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase, ingest])

  return { messages, loading, reachedEnd, loadMore, latestRealtimeInsertId, pushOwnEcho }
}
