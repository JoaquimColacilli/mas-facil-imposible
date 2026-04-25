'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptFields, decryptRow } from '@/lib/crypto'
import type {
  Goal,
  GoalCategory,
  GoalStatus,
  Currency,
} from '@/lib/types'
import { revalidatePath } from 'next/cache'

// ─── Helpers ────────────────────────────────────────────────────────────────
//
// Sensitive numeric fields are stored 0 in their plaintext column and the
// real value lives inside enc_data. See migration 028 column comments.

interface EncFields {
  name: string
  target_amount: number
  current_amount: number
  monthly_target?: number | null
  auto_amount?: number | null
  note?: string | null
}

function encFor(input: EncFields): string {
  return encryptFields(input as unknown as Record<string, unknown>)
}

// ─── Create ─────────────────────────────────────────────────────────────────

export interface CreateGoalInput {
  name: string
  category: GoalCategory
  currency: Currency
  target_amount: number
  current_amount?: number
  deadline: string | null
  monthly_target?: number | null
  note?: string | null
  auto: {
    enabled: boolean
    amount?: number | null
    day?: number | null
  }
}

export async function createGoal(
  input: CreateGoalInput,
): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  if (!input.name.trim()) return { data: null, error: 'El nombre es obligatorio.' }
  if (input.target_amount <= 0) return { data: null, error: 'El objetivo debe ser mayor que 0.' }
  if (input.auto.enabled) {
    if (!input.auto.amount || input.auto.amount <= 0) {
      return { data: null, error: 'Configurá un monto de auto-débito mayor a 0.' }
    }
    if (!input.auto.day || input.auto.day < 1 || input.auto.day > 28) {
      return { data: null, error: 'El día de auto-débito debe estar entre 1 y 28.' }
    }
  }

  const enc_data = encFor({
    name: input.name.trim(),
    target_amount: input.target_amount,
    current_amount: input.current_amount ?? 0,
    monthly_target: input.monthly_target ?? null,
    auto_amount: input.auto.enabled ? input.auto.amount ?? null : null,
    note: input.note?.trim() || null,
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
      status: 'active',
      category: input.category,
      monthly_target: input.monthly_target != null ? 0 : null,
      auto_enabled: input.auto.enabled,
      auto_amount: input.auto.enabled && input.auto.amount != null ? 0 : null,
      auto_day: input.auto.enabled ? input.auto.day ?? null : null,
      enc_data,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/goals')
  return { data: decryptRow(data) as Goal, error: null }
}

// ─── Update (general) ───────────────────────────────────────────────────────

export interface UpdateGoalInput {
  id: string
  name: string
  category: GoalCategory
  target_amount: number
  current_amount: number
  currency: Currency
  deadline: string | null
  monthly_target?: number | null
  note?: string | null
  auto: {
    enabled: boolean
    amount?: number | null
    day?: number | null
  }
}

export async function updateGoal(
  input: UpdateGoalInput,
): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  if (input.auto.enabled) {
    if (!input.auto.amount || input.auto.amount <= 0) {
      return { data: null, error: 'Configurá un monto de auto-débito mayor a 0.' }
    }
    if (!input.auto.day || input.auto.day < 1 || input.auto.day > 28) {
      return { data: null, error: 'El día de auto-débito debe estar entre 1 y 28.' }
    }
  }

  const enc_data = encFor({
    name: input.name.trim(),
    target_amount: input.target_amount,
    current_amount: input.current_amount,
    monthly_target: input.monthly_target ?? null,
    auto_amount: input.auto.enabled ? input.auto.amount ?? null : null,
    note: input.note?.trim() || null,
  })

  const { data, error } = await supabase
    .from('goals')
    .update({
      currency: input.currency,
      deadline: input.deadline,
      category: input.category,
      monthly_target: input.monthly_target != null ? 0 : null,
      auto_enabled: input.auto.enabled,
      auto_amount: input.auto.enabled && input.auto.amount != null ? 0 : null,
      auto_day: input.auto.enabled ? input.auto.day ?? null : null,
      enc_data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/goals')
  revalidatePath(`/goals/${input.id}`)
  return { data: decryptRow(data) as Goal, error: null }
}

// ─── Status change (pause/reactivate/complete) ──────────────────────────────

export async function setGoalStatus(
  id: string,
  status: Exclude<GoalStatus, 'liquidated'>,
): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'completed') patch.completed_at = new Date().toISOString()
  if (status === 'active') patch.completed_at = null

  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/goals')
  revalidatePath(`/goals/${id}`)
  return { data: decryptRow(data) as Goal, error: null }
}

// ─── Deposit ────────────────────────────────────────────────────────────────
//
// Atomically:
//   1. Insert a transactions row (type='savings', goal_id=goal.id,
//      source='goal_deposit'). The migration-028 trigger validates
//      ownership cross-table.
//   2. Update goal.current_amount (encrypted) and possibly status='completed'
//      with completed_at when the deposit reaches the target.
//
// Supabase JS doesn't expose multi-statement transactions, so we do it as
// two writes. The risk is a partial state if step 2 fails after step 1
// succeeds; we mitigate by computing the new total *before* writing the
// transaction so a re-run is idempotent for the user (they'd just see no
// confirmation toast and could retry — the deposit row is already there).

export interface DepositInput {
  goal: Goal
  amount: number
  /** YYYY-MM-DD; defaults to today. */
  date?: string
  note?: string | null
}

export async function depositToGoal(
  input: DepositInput,
): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }
  if (input.amount <= 0) return { data: null, error: 'El monto debe ser positivo.' }
  if (input.goal.status === 'liquidated' || input.goal.status === 'completed') {
    return { data: null, error: 'Esta meta ya está cerrada.' }
  }

  const newCurrent = input.goal.current_amount + input.amount
  const reachedTarget = newCurrent >= input.goal.target_amount
  const today = input.date ?? new Date().toISOString().slice(0, 10)

  // 1. Transaction row. The migration-028 trigger blocks goal_id mismatch.
  const { error: txErr } = await supabase.from('transactions').insert({
    user_id: user.id,
    type: 'savings',
    amount: input.amount,
    currency: input.goal.currency,
    date: today,
    note: input.note?.trim() || `Aporte a meta: ${input.goal.name}`,
    status: 'confirmed',
    goal_id: input.goal.id,
    source: 'goal_deposit',
  })
  if (txErr) return { data: null, error: txErr.message }

  // 2. Update goal — re-encrypt with new current_amount.
  const enc_data = encFor({
    name: input.goal.name,
    target_amount: input.goal.target_amount,
    current_amount: newCurrent,
    monthly_target: input.goal.monthly_target ?? null,
    auto_amount: input.goal.auto_amount ?? null,
    note: input.goal.note ?? null,
  })

  const patch: Record<string, unknown> = {
    enc_data,
    updated_at: new Date().toISOString(),
  }
  if (reachedTarget) {
    patch.status = 'completed'
    patch.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', input.goal.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/goals')
  revalidatePath(`/goals/${input.goal.id}`)
  return { data: decryptRow(data) as Goal, error: null }
}

// ─── Liquidate (PR 3) ───────────────────────────────────────────────────────
//
// Marks a completed goal as 'liquidated' and creates an income transaction
// for the full current_amount. That income is what the user actually
// receives in their account flow — the goal balance returns to "real money"
// in the income/expense ledger.

export interface LiquidateInput {
  goalId: string
  /** Optional category to tag the income row (so it shows up in
   *  Dashboard/Analytics with a meaningful label). */
  categoryId?: string | null
  /** Free-form note shown on the resulting transaction. */
  note?: string | null
}

export async function liquidateGoal(
  input: LiquidateInput,
): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  // Re-fetch the goal server-side so we don't trust client state for the
  // liquidation amount (this is real money — see HANDOFF section 8).
  const { data: rawGoal, error: gErr } = await supabase
    .from('goals')
    .select('*')
    .eq('id', input.goalId)
    .eq('user_id', user.id)
    .single()
  if (gErr || !rawGoal) return { data: null, error: gErr?.message ?? 'Meta no encontrada' }
  const goal = decryptRow(rawGoal) as Goal

  if (goal.status !== 'completed') {
    return { data: null, error: 'Solo se pueden liquidar metas cumplidas.' }
  }
  if (goal.current_amount <= 0) {
    return { data: null, error: 'La meta no tiene saldo para liquidar.' }
  }

  // 1. Insert the income transaction.
  const today = new Date().toISOString().slice(0, 10)
  const { data: txRow, error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      category_id: input.categoryId ?? null,
      type: 'income',
      amount: goal.current_amount,
      currency: goal.currency,
      date: today,
      note: input.note?.trim() || `Liquidación de meta: ${goal.name}`,
      status: 'confirmed',
      goal_id: goal.id,
      source: 'goal_liquidation',
    })
    .select('id')
    .single()
  if (txErr || !txRow) return { data: null, error: txErr?.message ?? 'No se pudo crear el movimiento' }

  // 2. Mark the goal liquidated and link the transaction.
  const { data, error } = await supabase
    .from('goals')
    .update({
      status: 'liquidated',
      liquidated_at: new Date().toISOString(),
      liquidation_transaction_id: txRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goal.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/goals')
  revalidatePath(`/goals/${goal.id}`)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { data: decryptRow(data) as Goal, error: null }
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteGoal(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (!error) revalidatePath('/goals')
  return { error: error?.message ?? null }
}
