import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { decryptRow } from '@/lib/crypto'
import { MFITransactionsClient } from './mfi-transactions-client'
import type { Transaction, Category, Profile, MfiSheet } from '@/lib/types'

export default async function MFIPage({
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

  const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0]
  const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0]
  const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`

  const [profileRes, txRes, catRes, sheetsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false }),
    supabase.from('categories').select('*').eq('user_id', user.id),
    supabase.from('mfi_sheets').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
  ])

  const transactions = (txRes.data ?? []).map((r) => decryptRow(r) as Transaction)

  return (
    <MFITransactionsClient
      transactions={transactions}
      categories={(catRes.data ?? []) as Category[]}
      initialSheets={(sheetsRes.data ?? []) as MfiSheet[]}
      profile={profileRes.data as Profile | null}
      currentMonth={currentMonth}
      userId={user.id}
    />
  )
}
