import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { decryptRow } from '@/lib/crypto'
import type { Transaction, Portfolio } from '@/lib/types'
import { TransactionsClient } from './transactions-client'

function getMonthRange(month?: string) {
  const now = new Date()
  let year = now.getFullYear()
  let m = now.getMonth() // 0-based

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, mo] = month.split('-').map(Number)
    year = y
    m = mo - 1
  }

  const start = `${year}-${String(m + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, m + 1, 0).getDate()
  const end = `${year}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const key = `${year}-${String(m + 1).padStart(2, '0')}`

  return { start, end, key }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { start, end, key } = getMonthRange(params.month)

  const [txRes, portfolioRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id),
  ])

  const transactions = (txRes.data ?? []).map((row) => decryptRow(row) as Transaction)
  const portfolios = (portfolioRes.data ?? []) as Portfolio[]

  return (
    <TransactionsClient
      transactions={transactions}
      portfolios={portfolios}
      month={key}
      totalCount={txRes.count ?? transactions.length}
    />
  )
}
