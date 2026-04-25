import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { decryptRow } from '@/lib/crypto'
import type { Goal, Category, Transaction } from '@/lib/types'
import { GoalsClient, type GoalSeries } from './goals-client'

/**
 * Server component. Fetches:
 *   - all goals for the user (decrypted)
 *   - cumulative-deposit series per goal (small payload — one query, then
 *     bucketed in memory)
 *   - the user's income categories (for the Liquidate modal)
 */
export default async function GoalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [goalsRes, depositsRes, incomeCatsRes] = await Promise.all([
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('transactions')
      .select('id, goal_id, amount, date, type, currency, source')
      .eq('user_id', user.id)
      .not('goal_id', 'is', null)
      .order('date', { ascending: true }),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .order('name', { ascending: true }),
  ])

  const goals: Goal[] = (goalsRes.data ?? []).map((row) => decryptRow(row) as Goal)
  const deposits = (depositsRes.data ?? []) as Pick<Transaction, 'id' | 'goal_id' | 'amount' | 'date' | 'type' | 'currency' | 'source'>[]
  const incomeCategories = (incomeCatsRes.data ?? []) as Category[]

  const seriesByGoal: Record<string, GoalSeries> = {}
  for (const tx of deposits) {
    if (!tx.goal_id) continue
    const list = (seriesByGoal[tx.goal_id] ??= [])
    list.push({ amount: tx.amount, date: tx.date })
  }

  return (
    <GoalsClient
      goals={goals}
      seriesByGoal={seriesByGoal}
      incomeCategories={incomeCategories}
    />
  )
}
