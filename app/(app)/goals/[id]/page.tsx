import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { decryptRow } from '@/lib/crypto'
import type { Goal, Category, Transaction } from '@/lib/types'
import { GoalDetailClient } from './goal-detail-client'

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [goalRes, depositsRes, incomeCatsRes] = await Promise.all([
    supabase.from('goals').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase
      .from('transactions')
      .select('id, amount, date, type, currency, source, note')
      .eq('user_id', user.id)
      .eq('goal_id', id)
      .order('date', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .order('name', { ascending: true }),
  ])

  if (goalRes.error || !goalRes.data) notFound()
  const goal = decryptRow(goalRes.data) as Goal
  const movements = (depositsRes.data ?? []) as Pick<
    Transaction,
    'id' | 'amount' | 'date' | 'type' | 'currency' | 'source' | 'note'
  >[]
  const incomeCategories = (incomeCatsRes.data ?? []) as Category[]

  return <GoalDetailClient goal={goal} movements={movements} incomeCategories={incomeCategories} />
}
