'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptFields, decryptRow } from '@/lib/crypto'
import type { Transaction, TransactionType, Currency, TransactionStatus } from '@/lib/types'

export async function createTransaction(input: {
  type: TransactionType
  amount: number
  currency: Currency
  note: string | null
  category_id: string | null
  date: string
  status?: TransactionStatus
  sheet_id?: string | null
}): Promise<{ data: Transaction | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const enc_data = encryptFields({ amount: input.amount, note: input.note })

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
      status: input.status ?? 'confirmed',
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
