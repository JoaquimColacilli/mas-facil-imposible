'use server'

import { createClient } from '@/lib/supabase/server'
import { validateUsername } from '@/lib/social/validate-username'

export type SetUsernameError =
  | 'unauthenticated'
  | 'invalid'
  | 'taken'
  | 'rate_limited'
  | 'db_error'

export type SetUsernameResult =
  | { ok: true; username: string }
  | { ok: false; code: SetUsernameError; error: string }

const RATE_LIMIT_DAYS = 30

function formatRateLimitDate(allowedFrom: Date): string {
  // 18 de mayo de 2026 — es-AR long format used elsewhere in the app.
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(allowedFrom)
}

export async function setUsername(rawUsername: string): Promise<SetUsernameResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: 'unauthenticated', error: 'No autenticado.' }

  const validation = validateUsername(rawUsername)
  if (!validation.ok) {
    return { ok: false, code: 'invalid', error: validation.error }
  }
  const normalized = validation.normalized

  // Read current row to check (a) same-value short-circuit and (b) rate limit.
  const { data: current, error: readErr } = await supabase
    .from('profiles')
    .select('username, username_changed_at')
    .eq('id', user.id)
    .single()
  if (readErr) {
    return { ok: false, code: 'db_error', error: 'No se pudo leer tu perfil.' }
  }

  // Same-value short-circuit: if user "saves" the same username they already have,
  // do nothing (don't bump username_changed_at, don't consume rate limit).
  if (current?.username && current.username.toLowerCase() === normalized) {
    return { ok: true, username: normalized }
  }

  // Rate limit: only applies to subsequent changes (NULL means initial set).
  if (current?.username_changed_at) {
    const last = new Date(current.username_changed_at)
    const allowedFrom = new Date(last.getTime() + RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000)
    if (Date.now() < allowedFrom.getTime()) {
      return {
        ok: false,
        code: 'rate_limited',
        error: `Podrás cambiar tu username el ${formatRateLimitDate(allowedFrom)}.`,
      }
    }
  }

  // Availability check (case-insensitive). Race conditions are still possible
  // between this check and the UPDATE, but the unique index will reject the
  // collision and we map that to `taken`.
  const { data: existing } = await supabase
    .from('profiles_public')
    .select('id')
    .ilike('username', normalized)
    .neq('id', user.id)
    .limit(1)
    .maybeSingle()
  if (existing) {
    return { ok: false, code: 'taken', error: 'Este username ya está en uso.' }
  }

  const isInitialSet = !current?.username
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      username: normalized,
      // NULL on initial set so the user can correct a typo on first login.
      // NOW() on subsequent changes to start the 30-day window.
      username_changed_at: isInitialSet ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateErr) {
    // Postgres unique violation → race lost
    if (updateErr.code === '23505') {
      return { ok: false, code: 'taken', error: 'Este username ya está en uso.' }
    }
    // Postgres check constraint violation → safety net (validateUsername should have caught it)
    if (updateErr.code === '23514') {
      return { ok: false, code: 'invalid', error: 'El username no cumple el formato.' }
    }
    return { ok: false, code: 'db_error', error: updateErr.message }
  }

  return { ok: true, username: normalized }
}
