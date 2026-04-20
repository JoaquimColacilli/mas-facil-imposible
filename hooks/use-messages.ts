'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Message, ReplyToSnapshot } from '@/lib/types'

export const PAGE_SIZE = 50
const MESSAGE_SELECT =
  'id, conversation_id, sender_id, body, created_at, deleted_at, edited_at, read_at, reply_to_message_id, reply_to:reply_to_message_id (id, sender_id, body, deleted_at)'

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
  /** Append an optimistic (not-yet-acked) own message to local state.
   *  With client-generated UUIDs, `temp.id` equals the final DB id — so the
   *  Realtime INSERT that comes back will match via seenIds and merge in place
   *  (no reordering). Server response resolves via setOptimisticStatus. */
  pushOptimistic: (temp: Message) => void
  /** Merge the canonical Message returned by the server into the optimistic
   *  row. Same id as the temp (client UUID) → in-place merge; preserves reply_to
   *  embed and clears pending/failed. */
  replaceOptimistic: (tempId: string, real: Message) => void
  /** Patch the client-only flags (pending/failed) on a message in place.
   *  Used to flip a failed bubble back to pending on retry, or mark pending → failed. */
  setOptimisticStatus: (tempId: string, patch: { pending?: boolean; failed?: boolean }) => void
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
  // Cache of reply-target snapshots so repeated INSERTs that quote the same
  // message don't trigger a second fetch. Seeded from any initialMessages that
  // already carry an embedded snapshot from SSR.
  const replySnapshotCache = useRef<Map<string, ReplyToSnapshot>>(
    new Map(
      initialMessages
        .filter((m) => m.reply_to)
        .map((m) => [m.reply_to!.id, m.reply_to!]),
    ),
  )

  // Re-seed when conversationId changes (navigating between chats).
  useEffect(() => {
    seenIds.current = new Set(initialMessages.map((m) => m.id))
    replySnapshotCache.current = new Map(
      initialMessages
        .filter((m) => m.reply_to)
        .map((m) => [m.reply_to!.id, m.reply_to!]),
    )
    setMessages(initialMessages)
    setReachedEnd(initialMessages.length < PAGE_SIZE)
    setLatestRealtimeInsertId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  const ingest = useCallback((m: Message, source: 'realtime_insert' | 'realtime_update') => {
    if (seenIds.current.has(m.id)) {
      // UPDATE path (soft delete, or echo collision) — replace the row.
      setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)))
      return
    }
    seenIds.current.add(m.id)
    setMessages((prev) => [...prev, m])
    if (source === 'realtime_insert') setLatestRealtimeInsertId(m.id)
  }, [])

  const pushOptimistic = useCallback((temp: Message) => {
    if (seenIds.current.has(temp.id)) return
    seenIds.current.add(temp.id)
    setMessages((prev) => [...prev, temp])
  }, [])

  const replaceOptimistic = useCallback((tempId: string, real: Message) => {
    // With client-generated UUIDs, tempId === real.id. The row may have already
    // been merged in-place by the earlier Realtime INSERT (our own echo) — that
    // merge preserved pending=true. This call now brings in canonical DB state
    // plus the reply_to embed the server response carries, and clears pending.
    if (real.reply_to) replySnapshotCache.current.set(real.reply_to.id, real.reply_to)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...real, pending: false, failed: false } : m,
      ),
    )
  }, [])

  const setOptimisticStatus = useCallback(
    (tempId: string, patch: { pending?: boolean; failed?: boolean }) => {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, ...patch } : m)))
    },
    [],
  )

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
        .select(MESSAGE_SELECT)
        .eq('conversation_id', conversationId)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) return
      // Normalize Supabase typed embed (array) to the 1:1 object we expect.
      const page = ((data ?? []) as unknown as Array<
        Omit<Message, 'reply_to'> & {
          reply_to: ReplyToSnapshot | ReplyToSnapshot[] | null
        }
      >).map((row) => {
        const rt = row.reply_to
        const resolved = Array.isArray(rt) ? (rt[0] ?? null) : (rt ?? null)
        return { ...row, reply_to: resolved } as Message
      })
      // Seed the reply cache with any snapshots embedded in this page so
      // future realtime INSERTs that quote them skip the fetch.
      for (const m of page) {
        if (m.reply_to) replySnapshotCache.current.set(m.reply_to.id, m.reply_to)
      }
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

    // postgres_changes INSERT trae la row plana (sin el embed de reply_to).
    // Si el mensaje quoteado está en cache → ingest inmediato. Sino, fetch
    // del snapshot y después ingest. Peor caso: ~150ms sin quote. Si la
    // fetch falla, el mensaje igual entra con reply_to: null y se renderiza
    // como "Mensaje eliminado" (safe fallback).
    //
    // Own-echo path (raw.id ya está en seenIds): es nuestro propio send que
    // volvió por realtime. No appendeamos — mergeamos en el lugar del temp,
    // preservando el reply_to que ya habíamos armado del snapshot local y
    // limpiando el flag pending. Así, bajo ráfagas 1-2-3-4, el orden visual
    // se mantiene (client-generated UUID garantiza que temp.id === real.id).
    async function handleInsert(raw: Message) {
      if (seenIds.current.has(raw.id)) {
        setMessages((prev) =>
          prev.map((x) =>
            x.id === raw.id
              ? { ...raw, reply_to: x.reply_to, pending: false, failed: false }
              : x,
          ),
        )
        return
      }
      const replyId = raw.reply_to_message_id
      if (!replyId) {
        ingest({ ...raw, reply_to: null }, 'realtime_insert')
        return
      }
      const cached = replySnapshotCache.current.get(replyId)
      if (cached) {
        ingest({ ...raw, reply_to: cached }, 'realtime_insert')
        return
      }
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, body, deleted_at')
        .eq('id', replyId)
        .maybeSingle()
      const snapshot = (data as ReplyToSnapshot | null) ?? null
      if (snapshot) replySnapshotCache.current.set(snapshot.id, snapshot)
      ingest({ ...raw, reply_to: snapshot }, 'realtime_insert')
    }

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
        (payload) => {
          void handleInsert(payload.new as Message)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // UPDATE path: el row no trae el embed de reply_to, pero como este
          // mensaje ya existe en local state lo reemplazamos preservando el
          // reply_to que ya habíamos resuelto. Si no existía (edge case de
          // UPDATE sin INSERT previo), usamos el cache por si el snapshot
          // del reply target ya fue cargado.
          const raw = payload.new as Message
          const existing = seenIds.current.has(raw.id)
          const cachedReply = raw.reply_to_message_id
            ? (replySnapshotCache.current.get(raw.reply_to_message_id) ?? null)
            : null
          if (existing) {
            // ingest merge path: replace con el row nuevo + reply_to resuelto.
            setMessages((prev) =>
              prev.map((x) => {
                if (x.id !== raw.id) return x
                return { ...raw, reply_to: x.reply_to ?? cachedReply }
              }),
            )
          } else {
            ingest({ ...raw, reply_to: cachedReply }, 'realtime_update')
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase, ingest])

  return {
    messages,
    loading,
    reachedEnd,
    loadMore,
    latestRealtimeInsertId,
    pushOptimistic,
    replaceOptimistic,
    setOptimisticStatus,
  }
}
