'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptFields, decryptRow } from '@/lib/crypto'
import type { Transaction, TransactionType, Currency, TransactionStatus, PaymentMethod } from '@/lib/types'

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
