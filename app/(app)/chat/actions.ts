'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { extractRpcCode, getSocialErrorMessage } from '@/lib/social/errors'
import type { Message } from '@/lib/types'

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
): Promise<ActionResult<Message>> {
  const supabase = await createClient()
  const { data: msgId, error } = await supabase.rpc('send_message', {
    conversation_id: conversationId,
    body,
  })
  if (error) return fail(extractRpcCode(error))

  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at, deleted_at, edited_at')
    .eq('id', msgId as string)
    .single()
  if (fetchError || !message) return fail(null, 'No se pudo leer el mensaje enviado.')

  bustCaches()
  return ok(message as Message)
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
    conversation_id: conversationId,
  })
  if (error) return fail(extractRpcCode(error))
  bustCaches()
  return ok()
}
