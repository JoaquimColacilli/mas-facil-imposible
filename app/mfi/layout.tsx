import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MFIShell } from '@/components/mfi-shell'
import type { Profile } from '@/lib/types'

export default async function MFILayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return <MFIShell user={user} profile={profile as Profile | null}>{children}</MFIShell>
}
