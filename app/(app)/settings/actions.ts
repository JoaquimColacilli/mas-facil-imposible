'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Marks a one-shot feature tour as seen for the current user.
 * Read-modify-write on profiles.tours_seen — safe because tours run
 * sequentially and the merge is idempotent.
 *
 * Returns { ok: false } on any failure; the caller is expected to keep
 * a localStorage cache as a backup so a flaky write doesn't re-show the tour.
 */
export async function markTourSeen(tourKey: string): Promise<{ ok: boolean }> {
  if (!tourKey || typeof tourKey !== 'string') return { ok: false }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { data: existing, error: readErr } = await supabase
    .from('profiles')
    .select('tours_seen')
    .eq('id', user.id)
    .single()
  if (readErr) return { ok: false }

  const current = (existing?.tours_seen as Record<string, string> | null) ?? {}
  const next = { ...current, [tourKey]: new Date().toISOString() }

  const { error: writeErr } = await supabase
    .from('profiles')
    .update({ tours_seen: next })
    .eq('id', user.id)

  return { ok: !writeErr }
}
