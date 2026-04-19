'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { encryptFields, decryptRow } from '@/lib/crypto'
import type { Loan, Debt, Notification } from '@/lib/types'

// ─── Result helper ───────────────────────────────────────────────────────────

type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string }

function ok<T>(data?: T): Result<T> {
  return { ok: true, data }
}

function fail(error: string, code?: string): Result<never> {
  return { ok: false, error, code }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Find or create a category for auto-generated transactions. Duplica lo que
 * hace dashboard/actions.ts — no lo reuso porque necesito una variante con
 * admin client para operar sobre el user_id del peer (al propagar settle).
 */
async function findOrCreateCategoryFor(
  client: ReturnType<typeof createAdminClient>,
  userId: string,
  name: string,
  type: 'income' | 'expense',
): Promise<string | null> {
  const { data: existing } = await client
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .eq('type', type)
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id as string

  const { data: created } = await client
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

  return (created?.id as string) ?? null
}

async function assertNotifOwnership(
  notificationId: string,
  expectedType: 'friend_loan_request' | 'friend_debt_request',
): Promise<{ ok: true; notif: Notification } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, message, read, data, created_at')
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return { ok: false, error: 'Notificación no encontrada' }
  if ((data.data as any)?.type !== expectedType)
    return { ok: false, error: 'Notificación inválida' }

  return { ok: true, notif: data as Notification }
}

// ─── Accept linked LOAN request ──────────────────────────────────────────────
// Recibe A→B: A mandó `friend_loan_request`, B acepta → crea debt en B + linkea.

export async function acceptLinkedLoanRequest(
  notificationId: string,
): Promise<Result<Debt>> {
  const gate = await assertNotifOwnership(notificationId, 'friend_loan_request')
  if (!gate.ok) return fail(gate.error)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado')

  const payload = gate.notif.data as {
    type: 'friend_loan_request'
    loan_id: string
    sender_id: string
    sender_username: string | null
    currency: 'ARS' | 'USD'
  }

  const admin = createAdminClient()

  // 1. Read source loan via admin (receiver doesn't own it → RLS blocks).
  const { data: rawLoan, error: fetchErr } = await admin
    .from('loans')
    .select()
    .eq('id', payload.loan_id)
    .maybeSingle()
  if (fetchErr || !rawLoan) return fail('Este cobro ya no existe', 'loan_removed')

  // Defensive checks — el sender podría haber editado o saldado en el medio.
  if (rawLoan.user_id !== payload.sender_id)
    return fail('Datos inconsistentes del cobro', 'data_mismatch')
  if (rawLoan.friend_id !== user.id)
    return fail('Este cobro ya no está vinculado a vos', 'friend_changed')
  if (rawLoan.paid)
    return fail('El cobro ya fue saldado', 'already_paid')
  if (rawLoan.linked_debt_id)
    return fail('El cobro ya fue confirmado', 'already_linked')
  if (rawLoan.currency !== payload.currency)
    return fail('Moneda inconsistente', 'currency_mismatch')

  let sourceLoan: Loan
  try {
    sourceLoan = decryptRow(rawLoan) as Loan
  } catch {
    return fail(
      'No pudimos procesar esta solicitud. Pedile a @' +
        (payload.sender_username ?? 'tu amigo') +
        ' que reenvíe.',
      'loan_decrypt_failed',
    )
  }

  // 2. Build the counterparty debt on receiver's side.
  const senderDisplay = payload.sender_username ?? sourceLoan.person_name
  const debtNote = sourceLoan.note
    ? `Confirmado con @${payload.sender_username ?? 'amigo'}: ${sourceLoan.note}`
    : `Confirmado con @${payload.sender_username ?? 'amigo'}`

  const enc_data = encryptFields({
    person_name: senderDisplay,
    amount: sourceLoan.amount,
    note: debtNote,
  })

  const { data: newDebt, error: insertErr } = await supabase
    .from('debts')
    .insert({
      user_id: user.id,
      person_name: '[encrypted]',
      amount: 0,
      currency: sourceLoan.currency,
      note: null,
      date: sourceLoan.date,
      paid: false,
      enc_data,
      friend_id: payload.sender_id,
      linked_loan_id: sourceLoan.id,
    })
    .select()
    .single()

  if (insertErr || !newDebt) return fail(insertErr?.message ?? 'Error al crear la deuda')

  // 3. Link back on the sender side via admin.
  const { error: linkErr } = await admin
    .from('loans')
    .update({ linked_debt_id: newDebt.id })
    .eq('id', sourceLoan.id)

  if (linkErr) {
    // Rollback: remove the debt we just inserted — un loan sin contrapartida
    // es aceptable, pero un debt sin linked_loan_id coherente no.
    await supabase.from('debts').delete().eq('id', newDebt.id)
    return fail('No se pudo completar el vínculo, intentá de nuevo', 'link_failed')
  }

  // 4. Mark the notification as read.
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  return ok(decryptRow(newDebt) as Debt)
}

// ─── Accept linked DEBT request ──────────────────────────────────────────────
// Simétrica: A mandó `friend_debt_request` ("yo te debo, confirmá"), B acepta
// → crea loan en B + linkea.

export async function acceptLinkedDebtRequest(
  notificationId: string,
): Promise<Result<Loan>> {
  const gate = await assertNotifOwnership(notificationId, 'friend_debt_request')
  if (!gate.ok) return fail(gate.error)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado')

  const payload = gate.notif.data as {
    type: 'friend_debt_request'
    debt_id: string
    sender_id: string
    sender_username: string | null
    currency: 'ARS' | 'USD'
  }

  const admin = createAdminClient()

  const { data: rawDebt, error: fetchErr } = await admin
    .from('debts')
    .select()
    .eq('id', payload.debt_id)
    .maybeSingle()
  if (fetchErr || !rawDebt) return fail('Esta deuda ya no existe', 'debt_removed')

  if (rawDebt.user_id !== payload.sender_id)
    return fail('Datos inconsistentes de la deuda', 'data_mismatch')
  if (rawDebt.friend_id !== user.id)
    return fail('Esta deuda ya no está vinculada a vos', 'friend_changed')
  if (rawDebt.paid)
    return fail('La deuda ya fue saldada', 'already_paid')
  if (rawDebt.linked_loan_id)
    return fail('La deuda ya fue confirmada', 'already_linked')
  if (rawDebt.currency !== payload.currency)
    return fail('Moneda inconsistente', 'currency_mismatch')

  let sourceDebt: Debt
  try {
    sourceDebt = decryptRow(rawDebt) as Debt
  } catch {
    return fail(
      'No pudimos procesar esta solicitud. Pedile a @' +
        (payload.sender_username ?? 'tu amigo') +
        ' que reenvíe.',
      'debt_decrypt_failed',
    )
  }

  const senderDisplay = payload.sender_username ?? sourceDebt.person_name
  const loanNote = sourceDebt.note
    ? `Confirmado con @${payload.sender_username ?? 'amigo'}: ${sourceDebt.note}`
    : `Confirmado con @${payload.sender_username ?? 'amigo'}`

  const enc_data = encryptFields({
    person_name: senderDisplay,
    amount: sourceDebt.amount,
    note: loanNote,
  })

  const { data: newLoan, error: insertErr } = await supabase
    .from('loans')
    .insert({
      user_id: user.id,
      person_name: '[encrypted]',
      amount: 0,
      currency: sourceDebt.currency,
      note: null,
      date: sourceDebt.date,
      paid: false,
      enc_data,
      friend_id: payload.sender_id,
      linked_debt_id: sourceDebt.id,
    })
    .select()
    .single()

  if (insertErr || !newLoan) return fail(insertErr?.message ?? 'Error al crear el cobro')

  const { error: linkErr } = await admin
    .from('debts')
    .update({ linked_loan_id: newLoan.id })
    .eq('id', sourceDebt.id)

  if (linkErr) {
    await supabase.from('loans').delete().eq('id', newLoan.id)
    return fail('No se pudo completar el vínculo, intentá de nuevo', 'link_failed')
  }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  return ok(decryptRow(newLoan) as Loan)
}

// ─── Reject linked request (loan o debt) ─────────────────────────────────────
// Solo marca la notif leída. No muta ningún loan/debt.

export async function rejectLinkedRequest(
  notificationId: string,
  kind: 'friend_loan_request' | 'friend_debt_request',
): Promise<Result> {
  const gate = await assertNotifOwnership(notificationId, kind)
  if (!gate.ok) return fail(gate.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) return fail('No se pudo rechazar la solicitud')
  return ok()
}

// ─── Resolver del linked del otro lado con propagación ───────────────────────
// Propaga el saldado del lado A (quien ya ejecutó markLoanPaid/markDebtPaid
// desde actions.ts) al record contrapartida via admin client. Incluye creación
// de la transaction auto-correspondiente en el lado B (income si el lado B es
// loan, expense si es debt).
//
// Idempotente: si el otro lado ya está paid con resolved_transaction_id, no-op.

export async function propagateSettleToLinked(
  kind: 'loan' | 'debt',
  sourceId: string,
): Promise<Result> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado')

  // 1. Read source (owned by caller) to confirm linked id and get decrypted values.
  const sourceTable = kind === 'loan' ? 'loans' : 'debts'
  const linkedKey = kind === 'loan' ? 'linked_debt_id' : 'linked_loan_id'
  const otherTable = kind === 'loan' ? 'debts' : 'loans'

  const { data: rawSource, error: sErr } = await supabase
    .from(sourceTable)
    .select()
    .eq('id', sourceId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (sErr || !rawSource) return fail('Registro no encontrado')
  if (!rawSource.paid) return fail('Primero marcá como saldado de tu lado', 'not_paid_yet')

  const linkedId = rawSource[linkedKey] as string | null
  if (!linkedId) return fail('Este registro no está vinculado a un amigo', 'not_linked')

  let source: Loan | Debt
  try {
    source = decryptRow(rawSource) as Loan | Debt
  } catch {
    return fail('No se pudo leer el registro', 'decrypt_failed')
  }

  // 2. Read linked record on the peer side via admin client.
  const admin = createAdminClient()
  const { data: rawLinked } = await admin
    .from(otherTable)
    .select()
    .eq('id', linkedId)
    .maybeSingle()
  if (!rawLinked) {
    // El amigo pudo haber borrado su lado. Considerar idempotente — no hay
    // nada para propagar, el lado A ya está saldado.
    return ok()
  }

  // Idempotencia: si el otro lado ya está paid con tx resolved, nada.
  if (rawLinked.paid && rawLinked.resolved_transaction_id) return ok()

  // 3. Mark linked as paid + create the transaction on peer's side.
  const peerUserId = rawLinked.user_id as string
  const now = new Date().toISOString()
  const today = now.split('T')[0]
  const peerKind = kind === 'loan' ? 'debt' : 'loan'
  // peer "loan" ⇒ peer recibe plata (income); peer "debt" ⇒ peer paga (expense).
  const txType = peerKind === 'loan' ? 'income' : 'expense'
  const categoryName = peerKind === 'loan' ? 'Cobros' : 'Deudas'

  const categoryId = await findOrCreateCategoryFor(admin, peerUserId, categoryName, txType)

  const txNote =
    peerKind === 'loan'
      ? `Cobro saldado con @${source.person_name ?? 'amigo'}`
      : `Pago de deuda con @${source.person_name ?? 'amigo'}`
  const enc_data = encryptFields({ amount: source.amount, note: txNote })

  const { data: tx } = await admin
    .from('transactions')
    .insert({
      user_id: peerUserId,
      type: txType,
      amount: 0,
      currency: source.currency,
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

  const updatePayload: Record<string, unknown> = { paid: true, paid_at: now }
  if (tx?.id) updatePayload.resolved_transaction_id = tx.id

  await admin.from(otherTable).update(updatePayload).eq('id', linkedId)

  return ok()
}

// ─── Preview de request linkeado (para el popover de notifications) ────────
//
// Lee la contrapartida (loan/debt) del SENDER via admin client + decrypt para
// mostrar amount / note en el CTA del receiver. Gate de seguridad: la notif
// debe pertenecer al viewer. Un único roundtrip batch por popover open.

export interface LinkedRequestPreview {
  notificationId: string
  amount: number
  note: string | null
  currency: 'ARS' | 'USD'
  senderUsername: string | null
  date: string
  kind: 'friend_loan_request' | 'friend_debt_request'
}

export async function fetchLinkedRequestsPreview(
  notifIds: string[],
): Promise<Result<Record<string, LinkedRequestPreview>>> {
  if (notifIds.length === 0) return ok({})

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado')

  // Solo traemos notifs que sean linked requests del viewer.
  const { data: notifs } = await supabase
    .from('notifications')
    .select('id, data')
    .eq('user_id', user.id)
    .in('id', notifIds)

  if (!notifs) return ok({})

  const admin = createAdminClient()
  const out: Record<string, LinkedRequestPreview> = {}

  for (const n of notifs) {
    const data = n.data as any
    if (!data) continue
    const kind = data.type as 'friend_loan_request' | 'friend_debt_request' | undefined
    if (kind !== 'friend_loan_request' && kind !== 'friend_debt_request') continue

    const table = kind === 'friend_loan_request' ? 'loans' : 'debts'
    const idField = kind === 'friend_loan_request' ? 'loan_id' : 'debt_id'
    const recordId = data[idField] as string | undefined
    if (!recordId) continue

    const { data: raw } = await admin.from(table).select().eq('id', recordId).maybeSingle()
    if (!raw) continue

    try {
      const decrypted = decryptRow(raw) as Loan | Debt
      out[n.id] = {
        notificationId: n.id,
        amount: decrypted.amount,
        note: decrypted.note,
        currency: decrypted.currency,
        senderUsername: (data.sender_username as string | null) ?? null,
        date: decrypted.date,
        kind,
      }
    } catch {
      // decrypt fail → skip preview, el popover muestra CTA genérico.
      continue
    }
  }

  return ok(out)
}

// ─── Reenviar request pending (cuando fue rechazado o se canceló antes) ─────
// Útil cuando el amigo no aceptó y el owner quiere probar otra vez. El RPC
// send_linked_*_request ya valida que no haya otra notif pending por el mismo
// record — si hay, devuelve request_pending y el UI muestra el toast.

export async function resendLinkedRequest(
  kind: 'loan' | 'debt',
  recordId: string,
): Promise<Result> {
  const supabase = await createClient()
  const rpc = kind === 'loan' ? 'send_linked_loan_request' : 'send_linked_debt_request'
  const arg = kind === 'loan' ? { loan_id: recordId } : { debt_id: recordId }
  const { error } = await supabase.rpc(rpc, arg)
  if (error) return fail(error.message, error.code ?? undefined)
  return ok()
}
