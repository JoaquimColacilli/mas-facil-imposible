import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Portfolio, PortfolioLog } from '@/lib/types'
import type { PortfolioLogWithPortfolio } from '@/lib/investment-utils'
import { InvestmentsClient } from './investments-client'

export default async function InvestmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [portfolioRes, logsRes] = await Promise.all([
    supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('portfolio_logs')
      .select('*, portfolio:portfolios(name, currency)')
      .order('date', { ascending: true }),
  ])

  const portfolios = (portfolioRes.data ?? []) as Portfolio[]
  const logs = (logsRes.data ?? []) as PortfolioLogWithPortfolio[]

  return <InvestmentsClient portfolios={portfolios} logs={logs} />
}
