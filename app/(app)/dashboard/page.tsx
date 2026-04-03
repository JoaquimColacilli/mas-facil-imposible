// v10 — month navigation + loans + debts + recurring generation
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { decryptRow } from '@/lib/crypto'
import { generateRecurringTransactions } from '@/app/(app)/transactions/actions'
import { DashboardClient } from './dashboard-client'
import type { Transaction, Goal, Profile, Loan, Debt, Portfolio } from '@/lib/types'

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

  // Compute current date in Argentina timezone (UTC-3) to avoid showing next month at night
  const argDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [argYear, argMonth] = argDate.split('-').map(Number)

  let year = argYear
  let month = argMonth - 1

  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split('-').map(Number)
    year = y
    month = m - 1
  }

  const startOfMonth    = new Date(year, month, 1).toISOString().split('T')[0]
  const endOfMonth      = new Date(year, month + 1, 0).toISOString().split('T')[0]
  const currentMonthParam = `${year}-${String(month + 1).padStart(2, '0')}`

  // Generate recurring transactions for the current month (idempotent, on-demand)
  const isCurrentMonth = !params.month || currentMonthParam === `${argYear}-${String(argMonth).padStart(2, '0')}`
  if (isCurrentMonth) {
    await generateRecurringTransactions(currentMonthParam)
  }

  const [profileRes, txRes, goalsRes, loansRes, debtsRes, portfolioRes, savingsTxRes] = await Promise.all([
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
    supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id),
    // Cumulative savings: all savings transactions up to end of selected month
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'savings')
      .lte('date', endOfMonth)
      .neq('status', 'cancelled'),
  ])

  const transactions = (txRes.data ?? []).map((r) => decryptRow(r) as Transaction)
  const goals        = (goalsRes.data ?? []).map((r) => decryptRow(r) as Goal)
  const loans        = (loansRes.data ?? []).map((r) => decryptRow(r) as Loan)
  const debts        = (debtsRes.data ?? []).map((r) => decryptRow(r) as Debt)
  const portfolios   = (portfolioRes.data ?? []) as Portfolio[]

  // Cumulative savings balance (sum of all savings transactions up to end of month)
  const allSavingsTx = (savingsTxRes.data ?? []).map((r) => decryptRow(r) as Transaction)
  const cumulativeSavings = { ARS: 0, USD: 0 }
  for (const tx of allSavingsTx) {
    cumulativeSavings[tx.currency] += tx.amount
  }

  return (
    <DashboardClient
      profile={profileRes.data as Profile | null}
      transactions={transactions}
      goals={goals}
      loans={loans}
      debts={debts}
      portfolios={portfolios}
      cumulativeSavings={cumulativeSavings}
      userEmail={user.email ?? ''}
      userId={user.id}
      currentMonth={currentMonthParam}
    />
  )
}
