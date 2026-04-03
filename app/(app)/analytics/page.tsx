import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { decryptRow } from '@/lib/crypto'
import type { Transaction, Portfolio } from '@/lib/types'
import { AnalyticsClient } from './analytics-client'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 25 months: covers 12-month period + 12-month comparison + savings rate
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 24)
  const startDate = cutoff.toISOString().split('T')[0]

  const [txRes, portfolioRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .order('date', { ascending: true }),
    supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id),
  ])

  const transactions = (txRes.data ?? []).map((row) => decryptRow(row) as Transaction)
  const portfolios = (portfolioRes.data ?? []) as Portfolio[]

  return <AnalyticsClient transactions={transactions} portfolios={portfolios} />
}
