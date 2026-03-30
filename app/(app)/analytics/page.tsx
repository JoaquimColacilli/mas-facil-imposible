import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Transaction } from '@/lib/types'
import { AnalyticsClient } from './analytics-client'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]

  const { data } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .gte('date', sixMonthsAgo)
    .order('date', { ascending: true })

  return <AnalyticsClient transactions={(data ?? []) as Transaction[]} />
}
