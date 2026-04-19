'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { encryptFields, decryptRow } from '@/lib/crypto'
import type { Loan, Debt, Currency } from '@/lib/types'

// ─── Helpers internos (no exportados — 'use server' solo permite actions) ───

/**
 * Si el loan/debt tenía una notif `friend_loan_request` / `friend_debt_request`
 * pending (read=false) para el friend_id actual, marcarla como leída. Se llama
 * al borrar o al quitar/cambiar el friend_id en edit — evita que el amigo
 * encuentre un request fantasma días después.
 *
 * Silencioso: si no hay notif pending, no-op.
 * Usa admin client porque la notif vive en el user_id del friend, no del owner.
 *
 * Helper interno: NO exportarlo desde un archivo 'use server' — queda callable
 * desde el cliente, que podría marcar notifs ajenas como leídas sin auth check.
 */
async function cancelPendingLinkedRequest(
  kind: 'loan' | 'debt',
  recordId: string,
  friendId: string | null,
): Promise<void> {
  if (!friendId) return
  const admin = createAdminClient()
  const notifType = kind === 'loan' ? 'friend_loan_request' : 'friend_debt_request'
  const idKey = kind === 'loan' ? 'loan_id' : 'debt_id'
  await admin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', friendId)
    .eq('read', false)
    .contains('data', { type: notifType, [idKey]: recordId })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Find or create a category for auto-generated transactions (cobros/deudas). */
async function findOrCreateCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  type: 'income' | 'expense',
) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .eq('type', type)
    .limit(1)
    .single()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name,
      type,
      icon: type === 'income' ? 'handshake' : 'credit-card',
      color: type === 'income' ? '#f59e0b' : '#ef4444',
    })
    .select('id')
    .single()

  return created?.id ?? null
}

// ─── Loans ────────────────────────────────────────────────────────────────────

export async function createLoan(input: {
  person_name: string
  amount: number
  currency: Currency
  note: string | null
  date: string
  friend_id?: string | null
  notify_friend?: boolean
}): Promise<{ data: Loan | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const enc_data = encryptFields({
    person_name: input.person_name,
    amount: input.amount,
    note: input.note,
  })

  const { data, error } = await supabase
    .from('loans')
    .insert({
      user_id: user.id,
      person_name: '[encrypted]',
      amount: 0,
      currency: input.currency,
      note: null,
      date: input.date,
      paid: false,
      enc_data,
      friend_id: input.friend_id ?? null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // Dispara la notif si se pidió — silencioso si la RPC falla (el loan ya
  // quedó creado, el user puede reintentar con un botón "Reenviar solicitud").
  if (input.friend_id && input.notify_friend) {
    const { error: rpcErr } = await supabase.rpc('send_linked_loan_request', {
      loan_id: data.id,
    })
    if (rpcErr) {
      return {
        data: decryptRow(data) as Loan,
        error: `Cobro creado, pero no se pudo notificar a tu amigo (${rpcErr.message}).`,
      }
    }
  }

  return { data: decryptRow(data) as Loan, error: null }
}

export async function updateLoan(input: {
  id: string
  person_name: string
  amount: number
  currency: Currency
  note: string | null
  date: string
  friend_id?: string | null
  notify_friend?: boolean
}): Promise<{ data: Loan | null; error: string | null }> {
  const supabase = await createClient()

  // Fase 6: si el loan ya está linkeado (ambos lados confirmaron), el friend_id
  // es inmutable. Si el user intenta cambiarlo, rechazar con mensaje explícito.
  const { data: prev } = await supabase
    .from('loans')
    .select('friend_id, linked_debt_id')
    .eq('id', input.id)
    .single()

  const nextFriendId = input.friend_id ?? null
  const prevFriendId = prev?.friend_id ?? null
  const friendChanged = prevFriendId !== nextFriendId

  if (prev?.linked_debt_id && friendChanged) {
    return {
      data: null,
      error: 'No podés cambiar el amigo de un cobro ya confirmado. Eliminá y creá uno nuevo.',
    }
  }

  // Si se está sacando el friend_id o cambiándolo, cancelar la notif pending
  // del friend anterior (evita request fantasma — ajuste A owner).
  if (friendChanged && prevFriendId) {
    await cancelPendingLinkedRequest('loan', input.id, prevFriendId)
  }

  const enc_data = encryptFields({
    person_name: input.person_name,
    amount: input.amount,
    note: input.note,
  })

  const { data, error } = await supabase
    .from('loans')
    .update({
      person_name: '[encrypted]',
      amount: 0,
      currency: input.currency,
      note: null,
      date: input.date,
      enc_data,
      friend_id: nextFriendId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // Si el user tildó notify_friend y ahora hay friend_id sin linkear → enviar.
  if (nextFriendId && input.notify_friend && !prev?.linked_debt_id) {
    const { error: rpcErr } = await supabase.rpc('send_linked_loan_request', {
      loan_id: input.id,
    })
    if (rpcErr) {
      return {
        data: decryptRow(data) as Loan,
        error: `Cobro actualizado, pero no se pudo notificar (${rpcErr.message}).`,
      }
    }
  }

  return { data: decryptRow(data) as Loan, error: null }
}

export async function markLoanPaid(id: string): Promise<{ data: Loan | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  // 1. Fetch loan to check idempotency and get encrypted data
  const { data: raw, error: fetchErr } = await supabase
    .from('loans')
    .select()
    .eq('id', id)
    .single()
  if (fetchErr || !raw) return { data: null, error: fetchErr?.message ?? 'Cobro no encontrado' }

  // Already resolved — skip transaction creation
  if (raw.resolved_transaction_id) {
    if (!raw.paid) {
      const { data } = await supabase
        .from('loans')
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      return { data: data ? decryptRow(data) as Loan : null, error: null }
    }
    return { data: decryptRow(raw) as Loan, error: null }
  }

  const loan = decryptRow(raw) as Loan

  // 2. Mark as paid
  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('loans')
    .update({ paid: true, paid_at: now })
    .eq('id', id)

  if (updateErr) return { data: null, error: updateErr.message }

  // 3. Create income transaction
  const today = new Date().toISOString().split('T')[0]
  const categoryId = await findOrCreateCategory(supabase, user.id, 'Cobros', 'income')
  const note = `Cobro de ${loan.person_name}`
  const enc_data = encryptFields({ amount: loan.amount, note })

  const { data: tx } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'income',
      amount: 0,
      currency: loan.currency,
      note: null,
      category_id: categoryId,
      date: today,
      status: 'confirmed',
      payment_method: 'cash',
      is_recurring: false,
      enc_data,
    })
    .select('id')
    .single()

  // 4. Link transaction to loan for idempotency
  if (tx) {
    await supabase
      .from('loans')
      .update({ resolved_transaction_id: tx.id })
      .eq('id', id)
  }

  // 5. Return updated loan
  const { data: final } = await supabase.from('loans').select().eq('id', id).single()
  return { data: final ? decryptRow(final) as Loan : null, error: null }
}

export async function deleteLoan(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // If the loan had a resolved transaction, delete it too.
  // Also grab friend_id for the pending-notif cleanup (ajuste A owner).
  const { data: loan } = await supabase
    .from('loans')
    .select('resolved_transaction_id, friend_id, linked_debt_id')
    .eq('id', id)
    .single()
  if (loan?.resolved_transaction_id) {
    await supabase.from('transactions').delete().eq('id', loan.resolved_transaction_id)
  }
  // Cancel any pending request notif on the friend side — solo si no está linkeado
  // (si linked, ya no hay notif pending por definición del flow).
  if (loan?.friend_id && !loan?.linked_debt_id) {
    await cancelPendingLinkedRequest('loan', id, loan.friend_id)
  }

  const { error } = await supabase.from('loans').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// ─── Debts ────────────────────────────────────────────────────────────────────

export async function createDebt(input: {
  person_name: string
  amount: number
  currency: Currency
  note: string | null
  date: string
  friend_id?: string | null
  notify_friend?: boolean
}): Promise<{ data: Debt | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const enc_data = encryptFields({
    person_name: input.person_name,
    amount: input.amount,
    note: input.note,
  })

  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: user.id,
      person_name: '[encrypted]',
      amount: 0,
      currency: input.currency,
      note: null,
      date: input.date,
      paid: false,
      enc_data,
      friend_id: input.friend_id ?? null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  if (input.friend_id && input.notify_friend) {
    const { error: rpcErr } = await supabase.rpc('send_linked_debt_request', {
      debt_id: data.id,
    })
    if (rpcErr) {
      return {
        data: decryptRow(data) as Debt,
        error: `Deuda creada, pero no se pudo notificar a tu amigo (${rpcErr.message}).`,
      }
    }
  }

  return { data: decryptRow(data) as Debt, error: null }
}

export async function updateDebt(input: {
  id: string
  person_name: string
  amount: number
  currency: Currency
  note: string | null
  date: string
  friend_id?: string | null
  notify_friend?: boolean
}): Promise<{ data: Debt | null; error: string | null }> {
  const supabase = await createClient()

  const { data: prev } = await supabase
    .from('debts')
    .select('friend_id, linked_loan_id')
    .eq('id', input.id)
    .single()

  const nextFriendId = input.friend_id ?? null
  const prevFriendId = prev?.friend_id ?? null
  const friendChanged = prevFriendId !== nextFriendId

  if (prev?.linked_loan_id && friendChanged) {
    return {
      data: null,
      error: 'No podés cambiar el amigo de una deuda ya confirmada. Eliminá y creá una nueva.',
    }
  }

  if (friendChanged && prevFriendId) {
    await cancelPendingLinkedRequest('debt', input.id, prevFriendId)
  }

  const enc_data = encryptFields({
    person_name: input.person_name,
    amount: input.amount,
    note: input.note,
  })

  const { data, error } = await supabase
    .from('debts')
    .update({
      person_name: '[encrypted]',
      amount: 0,
      currency: input.currency,
      note: null,
      date: input.date,
      enc_data,
      friend_id: nextFriendId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  if (nextFriendId && input.notify_friend && !prev?.linked_loan_id) {
    const { error: rpcErr } = await supabase.rpc('send_linked_debt_request', {
      debt_id: input.id,
    })
    if (rpcErr) {
      return {
        data: decryptRow(data) as Debt,
        error: `Deuda actualizada, pero no se pudo notificar (${rpcErr.message}).`,
      }
    }
  }

  return { data: decryptRow(data) as Debt, error: null }
}

export async function markDebtPaid(id: string): Promise<{ data: Debt | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  // 1. Fetch debt to check idempotency and get encrypted data
  const { data: raw, error: fetchErr } = await supabase
    .from('debts')
    .select()
    .eq('id', id)
    .single()
  if (fetchErr || !raw) return { data: null, error: fetchErr?.message ?? 'Deuda no encontrada' }

  // Already resolved — skip transaction creation
  if (raw.resolved_transaction_id) {
    if (!raw.paid) {
      const { data } = await supabase
        .from('debts')
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      return { data: data ? decryptRow(data) as Debt : null, error: null }
    }
    return { data: decryptRow(raw) as Debt, error: null }
  }

  const debt = decryptRow(raw) as Debt

  // 2. Mark as paid
  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('debts')
    .update({ paid: true, paid_at: now })
    .eq('id', id)

  if (updateErr) return { data: null, error: updateErr.message }

  // 3. Create expense transaction
  const today = new Date().toISOString().split('T')[0]
  const categoryId = await findOrCreateCategory(supabase, user.id, 'Deudas', 'expense')
  const note = `Pago de deuda a ${debt.person_name}`
  const enc_data = encryptFields({ amount: debt.amount, note })

  const { data: tx } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'expense',
      amount: 0,
      currency: debt.currency,
      note: null,
      category_id: categoryId,
      date: today,
      status: 'confirmed',
      payment_method: 'cash',
      is_recurring: false,
      enc_data,
    })
    .select('id')
    .single()

  // 4. Link transaction to debt for idempotency
  if (tx) {
    await supabase
      .from('debts')
      .update({ resolved_transaction_id: tx.id })
      .eq('id', id)
  }

  // 5. Return updated debt
  const { data: final } = await supabase.from('debts').select().eq('id', id).single()
  return { data: final ? decryptRow(final) as Debt : null, error: null }
}

export async function deleteDebt(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: debt } = await supabase
    .from('debts')
    .select('resolved_transaction_id, friend_id, linked_loan_id')
    .eq('id', id)
    .single()
  if (debt?.resolved_transaction_id) {
    await supabase.from('transactions').delete().eq('id', debt.resolved_transaction_id)
  }
  if (debt?.friend_id && !debt?.linked_loan_id) {
    await cancelPendingLinkedRequest('debt', id, debt.friend_id)
  }

  const { error } = await supabase.from('debts').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// ─── Monthly Report Data ─────────────────────────────────────────────────────

export async function fetchMonthlyReportData(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return { error: 'Formato de mes inválido. Usar YYYY-MM.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [y, m] = monthKey.split('-').map(Number)
  const startOfMonth = new Date(y, m - 1, 1).toISOString().split('T')[0]
  const endOfMonth = new Date(y, m, 0).toISOString().split('T')[0]

  const [txRes, goalsRes, loansRes, debtsRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false }),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const transactions = (txRes.data ?? []).map((r) => decryptRow(r) as import('@/lib/types').Transaction)
  const goals = (goalsRes.data ?? []).map((r) => decryptRow(r) as import('@/lib/types').Goal)
  const loans = (loansRes.data ?? []).map((r) => decryptRow(r) as import('@/lib/types').Loan)
  const debts = (debtsRes.data ?? []).map((r) => decryptRow(r) as import('@/lib/types').Debt)

  return { transactions, goals, loans, debts, error: null }
}
