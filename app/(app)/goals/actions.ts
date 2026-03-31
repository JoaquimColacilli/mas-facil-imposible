'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptFields, decryptRow } from '@/lib/crypto'
import type { Goal, Currency, GoalStatus } from '@/lib/types'

export async function createGoal(input: {
  name: string
  target_amount: number
  current_amount: number
  currency: Currency
  deadline: string | null
  color: string
}): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const enc_data = encryptFields({
    name: input.name,
    target_amount: input.target_amount,
    current_amount: input.current_amount,
  })

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      name: '[encrypted]',
      target_amount: 0,
      current_amount: 0,
      currency: input.currency,
      deadline: input.deadline,
      color: input.color,
      enc_data,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Goal, error: null }
}

/**
 * Deposit funds into a goal. The client passes the already-decrypted name and
 * target_amount so we can re-encrypt them alongside the new current_amount.
 */
export async function depositToGoal(input: {
  id: string
  name: string
  target_amount: number
  new_current_amount: number
  status: GoalStatus
}): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createClient()

  const enc_data = encryptFields({
    name: input.name,
    target_amount: input.target_amount,
    current_amount: input.new_current_amount,
  })

  const { data, error } = await supabase
    .from('goals')
    .update({
      current_amount: 0,
      status: input.status,
      enc_data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: decryptRow(data) as Goal, error: null }
}

export async function deleteGoal(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('goals').delete().eq('id', id)
  return { error: error?.message ?? null }
}
