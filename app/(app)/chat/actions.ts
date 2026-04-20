'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { extractRpcCode, getSocialErrorMessage } from '@/lib/social/errors'
import type { Message, ReplyToSnapshot } from '@/lib/types'

// Supabase typed client infers embedded FK relations as arrays by default,
// even when the FK column is UNIQUE/points-to-PK (1:1). At runtime the client
// still returns a single object for 1:1 relationships — this helper normalizes
// both shapes so we can assign through `Message` cleanly.
function normalizeReplyToShape<T extends { reply_to?: ReplyToSnapshot | ReplyToSnapshot[] | null }>(
  row: T,
): Omit<T, 'reply_to'> & { reply_to: ReplyToSnapshot | null } {
  const rt = row.reply_to
  const resolved: ReplyToSnapshot | null = Array.isArray(rt) ? (rt[0] ?? null) : (rt ?? null)
  return { ...row, reply_to: resolved }
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; code: string | null; error: string }

function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data }
}

function fail(code: string | null, fallback?: string): ActionResult<never> {
  return {
    ok: false,
    code,
    error: code ? getSocialErrorMessage(code) : (fallback ?? 'Algo salió mal.'),
  }
}

// Unread badge lives in the (app) layout topbar, so chat mutations need to
// invalidate the whole layout just like friends/actions.ts does.
function bustCaches() {
  revalidatePath('/', 'layout')
}

// ─── ensure conversation ────────────────────────────────────────────────────
// Returns the conversation id for the given peer. Creates it in canonical order
// if the pair are friends and no conversation exists. For ex-friends with a
// previous conversation, returns the existing id (caller decides read-only).

export async function ensureConversation(
  peerId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('ensure_conversation', { peer_id: peerId })
  if (error) return fail(extractRpcCode(error))
  return ok({ conversationId: data as string })
}

// ─── send message ───────────────────────────────────────────────────────────
// Returns the full inserted Message so the caller can echo it into local state
// immediately (dedupe handles the Realtime echo).

export async function sendMessage(
  conversationId: string,
  body: string,
  replyToMessageId?: string | null,
): Promise<ActionResult<Message>> {
  const supabase = await createClient()
  const { data: msgId, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body,
    p_reply_to_message_id: replyToMessageId ?? null,
  })
  if (error) return fail(extractRpcCode(error))

  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select(
      'id, conversation_id, sender_id, body, created_at, deleted_at, edited_at, read_at, reply_to_message_id, reply_to:reply_to_message_id (id, sender_id, body, deleted_at)',
    )
    .eq('id', msgId as string)
    .single()
  if (fetchError || !message) return fail(null, 'No se pudo leer el mensaje enviado.')

  bustCaches()
  return ok(normalizeReplyToShape(message) as unknown as Message)
}

// ─── delete (soft) ──────────────────────────────────────────────────────────

export async function deleteMessage(messageId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_message', { message_id: messageId })
  if (error) return fail(extractRpcCode(error))
  bustCaches()
  return ok()
}

// ─── mark read ──────────────────────────────────────────────────────────────
// Called on mount of conversation-client and when the viewer receives a new
// message while the conversation is open. Best-effort — silent on failure.

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  })
  if (error) return fail(extractRpcCode(error))
  bustCaches()
  return ok()
}
