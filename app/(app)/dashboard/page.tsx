// v9 — month navigation + loans + debts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'
import type { Transaction, Goal, Profile, Loan, Debt } from '@/lib/types'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const now = new Date()

  let year = now.getFullYear()
  let month = now.getMonth()

  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split('-').map(Number)
    year = y
    month = m - 1
  }

  const startOfMonth    = new Date(year, month, 1).toISOString().split('T')[0]
  const endOfMonth      = new Date(year, month + 1, 0).toISOString().split('T')[0]
  const currentMonthParam = `${year}-${String(month + 1).padStart(2, '0')}`

  const [profileRes, txRes, goalsRes, loansRes, debtsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false }),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <DashboardClient
      profile={profileRes.data as Profile | null}
      transactions={(txRes.data ?? []) as Transaction[]}
      goals={(goalsRes.data ?? []) as Goal[]}
      loans={(loansRes.data ?? []) as Loan[]}
      debts={(debtsRes.data ?? []) as Debt[]}
      userEmail={user.email ?? ''}
      currentMonth={currentMonthParam}
    />
  )
}
