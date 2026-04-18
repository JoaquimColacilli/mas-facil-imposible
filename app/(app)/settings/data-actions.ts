'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

const EXPORT_VERSION = '1.0'

// Tables owned by the user. profiles is fetched separately because its key is `id`, not `user_id`.
const USER_TABLES = [
  'transactions',
  'goals',
  'loans',
  'debts',
  'portfolios',
  'portfolio_logs',
  'mfi_sheets',
  'notifications',
  'categories',
  'feedbacks',
] as const

export type ExportPayload = {
  exported_at: string
  export_version: string
  user: { id: string; email: string | null }
  profile: Record<string, unknown> | null
  // One key per table in USER_TABLES. Always an array (empty if nothing or table missing).
  [table: string]: unknown
}

export type ExportResult =
  | { ok: true; payload: ExportPayload }
  | { ok: false; error: string }

export async function exportMyData(): Promise<ExportResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const payload: ExportPayload = {
    exported_at: new Date().toISOString(),
    export_version: EXPORT_VERSION,
    user: { id: user.id, email: user.email ?? null },
    profile: profile ?? null,
  }

  for (const table of USER_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', user.id)
    // If the table does not exist yet (e.g., portfolios in some envs), Supabase returns
    // an error code we silently skip so the export still succeeds for the rest.
    if (error) {
      payload[table] = []
      continue
    }
    payload[table] = data ?? []
  }

  // portfolio_logs is keyed by portfolio_id, not user_id. Fetch via a join.
  const portfolios = (payload.portfolios as { id: string }[] | undefined) ?? []
  if (portfolios.length > 0) {
    const portfolioIds = portfolios.map((p) => p.id)
    const { data: logs } = await supabase
      .from('portfolio_logs')
      .select('*')
      .in('portfolio_id', portfolioIds)
    payload.portfolio_logs = logs ?? []
  }

  return { ok: true, payload }
}

export type DeleteResult = { ok: true } | { ok: false; error: string }

export async function deleteMyAccount(confirmation: string): Promise<DeleteResult> {
  if (confirmation !== 'BORRAR MI CUENTA') {
    return { ok: false, error: 'La confirmación no coincide.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado.' }

  // Double-guard: only the authenticated user can delete themselves. The admin
  // client bypasses RLS so we MUST trust the auth.uid() we just fetched.
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { ok: false, error: error.message }

  return { ok: true }
}

export async function acceptLegalTerms(
  tosVersion: string,
  privacyVersion: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado.' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('profiles')
    .update({
      tos_accepted_at: now,
      tos_version: tosVersion,
      privacy_accepted_at: now,
      privacy_version: privacyVersion,
      updated_at: now,
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
