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
