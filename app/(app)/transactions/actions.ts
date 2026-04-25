'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptFields, decryptRow } from '@/lib/crypto'
import { callGeminiJson } from '@/lib/gemini'
import type {
  Transaction,
  TransactionType,
  Currency,
  TransactionStatus,
  PaymentMethod,
  ExtractedTransaction,
  ExtractedTransactionsResponse,
} from '@/lib/types'

export async function createTransaction(input: {
  type: TransactionType
  amount: number
  currency: Currency
  note: string | null
  category_id: string | null
  date: string
  status?: TransactionStatus
  payment_method?: PaymentMethod | null
  sheet_id?: string | null
  is_recurring?: boolean
}): Promise<{ data: Transaction | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const enc_data = encryptFields({ amount: input.amount, note: input.note })

  // Credit card expenses default to pending status
  const status = input.status ?? (input.payment_method === 'credit' ? 'pending' : 'confirmed')

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: input.type,
      amount: 0,
      currency: input.currency,
      note: null,
      category_id: input.category_id,
      date: input.date,
      status,
      payment_method: input.payment_method ?? null,
      sheet_id: input.sheet_id ?? null,
      is_recurring: input.is_recurring ?? false,
      enc_data,
    })
    .select('*, category:categories(*)')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Transaction, error: null }
}

export async function updateTransaction(input: {
  id: string
  type: TransactionType
  amount: number
  currency: Currency
  note: string | null
  category_id: string | null
  date: string
  status: TransactionStatus
  payment_method?: PaymentMethod | null
  is_recurring?: boolean
}): Promise<{ data: Transaction | null; error: string | null }> {
  const supabase = await createClient()
  const enc_data = encryptFields({ amount: input.amount, note: input.note })

  const { data, error } = await supabase
    .from('transactions')
    .update({
      type: input.type,
      amount: 0,
      currency: input.currency,
      note: null,
      category_id: input.category_id,
      date: input.date,
      status: input.status,
      payment_method: input.payment_method ?? null,
      is_recurring: input.is_recurring ?? false,
      enc_data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('*, category:categories(*)')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Transaction, error: null }
}

export async function deleteTransaction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  return { error: error?.message ?? null }
}

/**
 * Partial update — only amount and note are re-encrypted.
 * Used by the MFI grid inline editor where only the amount changes.
 * Pass the existing decrypted note so it is preserved in enc_data.
 */
export async function updateTransactionAmount(
  id: string,
  amount: number,
  existingNote: string | null,
): Promise<{ data: Transaction | null; error: string | null }> {
  const supabase = await createClient()
  const enc_data = encryptFields({ amount, note: existingNote })

  const { data, error } = await supabase
    .from('transactions')
    .update({ amount: 0, note: null, enc_data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:categories(*)')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Transaction, error: null }
}

/** Bulk delete — used by MFI grid selection delete and inline replacement. */
export async function deleteManyTransactions(ids: string[]): Promise<{ error: string | null }> {
  if (ids.length === 0) return { error: null }
  const supabase = await createClient()
  const { error } = await supabase.from('transactions').delete().in('id', ids)
  return { error: error?.message ?? null }
}

/** Fetch investment transactions for a given month range, with server-side decryption. */
export async function fetchInvestmentTransactions(startDate: string, endDate: string): Promise<Transaction[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .eq('type', 'investment')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  return (data ?? []).map((row) => decryptRow(row) as Transaction)
}

/** Used by TransactionsClient to refetch after add, with server-side decryption. */
export async function fetchTransactions(): Promise<Transaction[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  return (data ?? []).map((row) => decryptRow(row) as Transaction)
}

/** Fetch transactions for a specific month (YYYY-MM), with server-side decryption. */
export async function fetchTransactionsForMonth(month: string): Promise<Transaction[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const [year, mo] = month.split('-').map(Number)
  const start = `${year}-${String(mo).padStart(2, '0')}-01`
  const lastDay = new Date(year, mo, 0).getDate()
  const end = `${year}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return (data ?? []).map((row) => decryptRow(row) as Transaction)
}

/** Mark all pending credit card expenses in a given month as confirmed. */
export async function markCreditCardPaid(month: string): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { count: 0, error: 'No autenticado' }

  const [year, mo] = month.split('-').map(Number)
  const start = `${year}-${String(mo).padStart(2, '0')}-01`
  const lastDay = new Date(year, mo, 0).getDate()
  const end = `${year}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('payment_method', 'credit')
    .eq('status', 'pending')
    .gte('date', start)
    .lte('date', end)
    .select('id')

  if (error) return { count: 0, error: error.message }
  return { count: data?.length ?? 0, error: null }
}

/** Confirm ALL pending transactions in a given month (single batch update). */
export async function confirmAllPending(month: string): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { count: 0, error: 'No autenticado' }

  const [year, mo] = month.split('-').map(Number)
  const start = `${year}-${String(mo).padStart(2, '0')}-01`
  const lastDay = new Date(year, mo, 0).getDate()
  const end = `${year}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .gte('date', start)
    .lte('date', end)
    .select('id')

  if (error) return { count: 0, error: error.message }
  return { count: data?.length ?? 0, error: null }
}

/**
 * Generate recurring transactions for the given month.
 * Looks at the previous month's transactions where is_recurring = true,
 * checks if they were already generated (via recurring_source_id), and
 * creates missing ones with status = 'pending'.
 *
 * Called on-demand from the dashboard page when loading the current month.
 * Idempotent — safe to call multiple times.
 */
export async function generateRecurringTransactions(
  month: string,
): Promise<{ created: number; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { created: 0, error: 'No autenticado' }

  const [year, mo] = month.split('-').map(Number)

  // Previous month bounds
  const prevYear = mo === 1 ? year - 1 : year
  const prevMo = mo === 1 ? 12 : mo - 1
  const prevStart = `${prevYear}-${String(prevMo).padStart(2, '0')}-01`
  const prevLastDay = new Date(prevYear, prevMo, 0).getDate()
  const prevEnd = `${prevYear}-${String(prevMo).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`

  // Current month bounds
  const curStart = `${year}-${String(mo).padStart(2, '0')}-01`
  const curLastDay = new Date(year, mo, 0).getDate()
  const curEnd = `${year}-${String(mo).padStart(2, '0')}-${String(curLastDay).padStart(2, '0')}`

  // 1. Fetch all recurring transactions from previous month
  const { data: sources } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_recurring', true)
    .neq('status', 'cancelled')
    .gte('date', prevStart)
    .lte('date', prevEnd)

  if (!sources || sources.length === 0) return { created: 0, error: null }

  // 2. Check which ones already have a copy in the current month
  const sourceIds = sources.map((s) => s.id)
  const { data: existing } = await supabase
    .from('transactions')
    .select('recurring_source_id')
    .eq('user_id', user.id)
    .in('recurring_source_id', sourceIds)
    .gte('date', curStart)
    .lte('date', curEnd)

  const alreadyGenerated = new Set((existing ?? []).map((e) => e.recurring_source_id))

  // 3. Generate missing ones
  const toInsert = sources
    .filter((s) => !alreadyGenerated.has(s.id))
    .map((s) => {
      const decrypted = decryptRow(s) as Transaction

      // Preserve the day-of-month, capped at the last day of the new month
      const sourceDay = new Date(decrypted.date + 'T00:00:00').getDate()
      const day = Math.min(sourceDay, curLastDay)
      const newDate = `${year}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      const enc_data = encryptFields({ amount: decrypted.amount, note: decrypted.note })

      return {
        user_id: user.id,
        type: decrypted.type,
        amount: 0,
        currency: decrypted.currency,
        note: null,
        category_id: decrypted.category_id,
        date: newDate,
        status: 'pending' as const,
        payment_method: decrypted.payment_method,
        is_recurring: true,
        recurring_source_id: s.id,
        enc_data,
      }
    })

  if (toInsert.length === 0) return { created: 0, error: null }

  const { error } = await supabase.from('transactions').insert(toInsert)
  if (error) return { created: 0, error: error.message }

  return { created: toInsert.length, error: null }
}

// ─── AI: extract transactions from image or PDF ─────────────────────────────

const IMAGE_FEATURE = 'expense_from_image'
const DAILY_QUOTA = 20
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const VALID_TYPES: TransactionType[] = ['expense', 'income', 'savings', 'investment']

export type ExtractTransactionResult =
  | { ok: true; data: ExtractedTransactionsResponse }
  | {
      ok: false
      error:
        | 'unauthenticated'
        | 'rate_limit'
        | 'service_unavailable'
        | 'invalid_image'
        | 'unknown'
      retryAfter?: string
    }

type RawExtractionItem = {
  amount: number | null
  currency: string | null
  date: string | null
  merchant: string | null
  type: string | null
  suggestedCategoryId: string | null
  note: string | null
}

function sanitizeItem(
  raw: RawExtractionItem,
  validCatIds: Set<string>,
): ExtractedTransaction | null {
  const cleanAmount =
    typeof raw.amount === 'number' && isFinite(raw.amount) && raw.amount > 0 ? raw.amount : null
  if (cleanAmount === null) return null

  const cleanType =
    raw.type && (VALID_TYPES as string[]).includes(raw.type) ? (raw.type as TransactionType) : null
  const cleanCurrency: Currency | null =
    raw.currency === 'ARS' || raw.currency === 'USD' ? raw.currency : null
  const cleanDate = raw.date && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null
  const cleanCat =
    raw.suggestedCategoryId && validCatIds.has(raw.suggestedCategoryId)
      ? raw.suggestedCategoryId
      : null

  return {
    amount: cleanAmount,
    currency: cleanCurrency,
    date: cleanDate,
    merchant: raw.merchant?.trim().slice(0, 60) || null,
    suggestedCategoryId: cleanCat,
    type: cleanType,
    note: raw.note?.trim().slice(0, 80) || null,
  }
}

/**
 * Reads an image or PDF (ticket, transfer screenshot, MP capture, credit card
 * statement, etc.) and asks Gemini 2.5 Flash to extract one or more transactions.
 * The result is meant to pre-fill the QuickAdd modal (1 tx) or the BulkReview
 * modal (>1) — the user always reviews before save.
 *
 * Rate limit: 20 invocations per rolling 24h per user. A Gemini 429 / 503 does
 * NOT count against the quota (it's Google's problem, not the user's). One
 * statement with 20 line items still counts as 1 call.
 */
export async function extractTransactionFromImage(
  imageBase64: string,
  mimeType: string,
): Promise<ExtractTransactionResult> {
  if (!ALLOWED_MIME.includes(mimeType)) return { ok: false, error: 'invalid_image' }
  if (!imageBase64 || imageBase64.length < 100) return { ok: false, error: 'invalid_image' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', IMAGE_FEATURE)
    .gte('created_at', since)

  if (countError) return { ok: false, error: 'unknown' }

  if ((count ?? 0) >= DAILY_QUOTA) {
    const { data: oldest } = await supabase
      .from('ai_usage')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('feature', IMAGE_FEATURE)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const retryAfter = oldest
      ? new Date(new Date(oldest.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : undefined
    return { ok: false, error: 'rate_limit', retryAfter }
  }

  const { data: catRows } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', user.id)
    .order('name')

  const categories = (catRows ?? []) as { id: string; name: string; type: TransactionType }[]
  const today = new Date().toISOString().slice(0, 10)

  const prompt = [
    'Sos un asistente financiero argentino. Te paso una imagen o PDF (ticket,',
    'recibo, screenshot de transferencia, captura de Mercado Pago, factura,',
    'resumen de tarjeta de crédito, etc.) y tenés que extraer TODOS los',
    'movimientos financieros individuales que aparezcan.',
    '',
    'Devolvé un objeto JSON con un único campo "transactions" que es un array.',
    'Si no podés extraer nada, devolvé { "transactions": [] }.',
    '',
    'REGLAS DE INCLUSIÓN/EXCLUSIÓN (resúmenes de tarjeta, extractos bancarios):',
    'EXCLUIR siempre estas líneas (no son movimientos del usuario):',
    '  - Saldo anterior, saldo actual, saldo a pagar, total a pagar',
    '  - Intereses financieros, intereses por mora, IVA sobre intereses',
    '  - Comisiones genéricas del banco/emisor',
    '  - Pagos recibidos del propio titular (ej. "Su pago", "Pago recibido")',
    '  - Subtotales y totales por sección',
    'INCLUIR como movimientos individuales:',
    '  - Compras y consumos',
    '  - Débitos automáticos y suscripciones (Netflix, Spotify, etc.)',
    '  - Cada línea de cuota como un movimiento separado: amount = monto de',
    '    la cuota (NO el total del producto), note debe incluir "Cuota X/Y"',
    '    cuando se vea en el resumen',
    '',
    'CAMPOS POR MOVIMIENTO:',
    '- amount: número positivo, sin separadores ni signo. Para cuotas, el',
    '  monto de la cuota individual.',
    '- currency: "ARS" si son pesos argentinos, "USD" si son dólares. En',
    '  resúmenes de tarjeta hay líneas en ambas monedas — etiquetá cada una',
    '  según corresponda. Si dice solo "$" en Argentina, asumí ARS.',
    '- date: fecha del movimiento en formato YYYY-MM-DD. Si no la podés leer,',
    `  devolvé "${today}".`,
    '- merchant: nombre del comercio o concepto (ej. "Carrefour",',
    '  "Transferencia a Juan", "Sueldo"). Máximo 60 caracteres.',
    '- type: "expense" por default. Solo usá "income" cuando es claramente',
    '  un ingreso (sueldo, transferencia recibida, reembolso). "savings" para',
    '  depósitos a caja de ahorro/plazo fijo. "investment" para compra de',
    '  activos (acciones, dólar MEP, cedears, cripto, FCI).',
    '- suggestedCategoryId: id EXACTO de una categoría de la lista de abajo',
    '  cuyo type coincida con el type del movimiento. Si ninguna encaja bien,',
    '  null. NO inventes ids.',
    '- note: descripción corta en español rioplatense (máx. 80 caracteres).',
    '  Para cuotas obligatorio incluir "Cuota X/Y".',
    '',
    'Categorías disponibles del usuario:',
    JSON.stringify(categories),
  ].join('\n')

  const itemSchema = {
    type: 'OBJECT',
    properties: {
      amount: { type: 'NUMBER', nullable: true },
      currency: { type: 'STRING', enum: ['ARS', 'USD'], nullable: true },
      date: { type: 'STRING', nullable: true },
      merchant: { type: 'STRING', nullable: true },
      type: {
        type: 'STRING',
        enum: ['expense', 'income', 'savings', 'investment'],
        nullable: true,
      },
      suggestedCategoryId: { type: 'STRING', nullable: true },
      note: { type: 'STRING', nullable: true },
    },
    required: ['amount', 'currency', 'date', 'merchant', 'type', 'suggestedCategoryId', 'note'],
  }

  const schema = {
    type: 'OBJECT',
    properties: {
      transactions: { type: 'ARRAY', items: itemSchema },
    },
    required: ['transactions'],
  }

  type RawResponse = { transactions: RawExtractionItem[] }

  const result = await callGeminiJson<RawResponse>({
    imageBase64,
    mimeType,
    prompt,
    schema,
  })

  if (!result.ok) {
    // Google's rate limit / outage → don't burn the user's quota.
    if (result.error === 'service_unavailable') {
      return { ok: false, error: 'service_unavailable' }
    }
    // Model returned garbage but did respond → counts as a real attempt.
    await supabase
      .from('ai_usage')
      .insert({ user_id: user.id, feature: IMAGE_FEATURE, n_extracted: 0 })
    return { ok: false, error: 'unknown' }
  }

  const validCatIds = new Set(categories.map((c) => c.id))
  const rawItems = Array.isArray(result.data.transactions) ? result.data.transactions : []
  const transactions = rawItems
    .map((r) => sanitizeItem(r, validCatIds))
    .filter((x): x is ExtractedTransaction => x !== null)

  if (transactions.length === 0) {
    await supabase
      .from('ai_usage')
      .insert({ user_id: user.id, feature: IMAGE_FEATURE, n_extracted: 0 })
    return { ok: false, error: 'unknown' }
  }

  await supabase
    .from('ai_usage')
    .insert({ user_id: user.id, feature: IMAGE_FEATURE, n_extracted: transactions.length })

  return { ok: true, data: { transactions } }
}

// ─── Bulk insert (used by BulkReview after AI extraction) ───────────────────

export interface BulkTransactionInput {
  type: TransactionType
  amount: number
  currency: Currency
  note: string | null
  category_id: string | null
  date: string
  payment_method?: PaymentMethod | null
  status?: TransactionStatus
}

/**
 * Inserts many transactions in a single round-trip, encrypting each row's
 * amount + note with the same scheme as createTransaction. Returns the
 * inserted count or an error message — partial success is not exposed
 * (the whole insert is one transaction on the DB side).
 */
export async function createManyTransactions(
  inputs: BulkTransactionInput[],
): Promise<{ count: number; error: string | null }> {
  if (inputs.length === 0) return { count: 0, error: null }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { count: 0, error: 'No autenticado' }

  const rows = inputs.map((input) => {
    const status = input.status ?? (input.payment_method === 'credit' ? 'pending' : 'confirmed')
    return {
      user_id: user.id,
      type: input.type,
      amount: 0,
      currency: input.currency,
      note: null,
      category_id: input.category_id,
      date: input.date,
      status,
      payment_method: input.payment_method ?? null,
      is_recurring: false,
      enc_data: encryptFields({ amount: input.amount, note: input.note }),
    }
  })

  const { data, error } = await supabase.from('transactions').insert(rows).select('id')
  if (error) return { count: 0, error: error.message }
  return { count: data?.length ?? rows.length, error: null }
}
