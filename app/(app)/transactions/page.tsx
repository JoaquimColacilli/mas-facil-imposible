import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Transaction } from '@/lib/types'
import { TransactionsClient } from './transactions-client'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  return <TransactionsClient transactions={(data ?? []) as Transaction[]} />
}
