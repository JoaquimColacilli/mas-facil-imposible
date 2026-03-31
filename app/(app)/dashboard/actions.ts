'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptFields, decryptRow } from '@/lib/crypto'
import type { Loan, Debt, Currency } from '@/lib/types'

// ─── Loans ────────────────────────────────────────────────────────────────────

export async function createLoan(input: {
  person_name: string
  amount: number
  currency: Currency
  note: string | null
  date: string
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
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Loan, error: null }
}

export async function updateLoan(input: {
  id: string
  person_name: string
  amount: number
  currency: Currency
  note: string | null
  date: string
}): Promise<{ data: Loan | null; error: string | null }> {
  const supabase = await createClient()

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
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Loan, error: null }
}

export async function markLoanPaid(id: string): Promise<{ data: Loan | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('loans')
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Loan, error: null }
}

export async function deleteLoan(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
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
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Debt, error: null }
}

export async function updateDebt(input: {
  id: string
  person_name: string
  amount: number
  currency: Currency
  note: string | null
  date: string
}): Promise<{ data: Debt | null; error: string | null }> {
  const supabase = await createClient()

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
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Debt, error: null }
}

export async function markDebtPaid(id: string): Promise<{ data: Debt | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('debts')
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Debt, error: null }
}

export async function deleteDebt(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('debts').delete().eq('id', id)
  return { error: error?.message ?? null }
}
