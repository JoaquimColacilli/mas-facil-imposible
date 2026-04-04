import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MFIShell } from '@/components/mfi-shell'
import type { Profile } from '@/lib/types'
import { WhatsNewModal } from '@/components/whats-new-modal'
import { Toaster } from '@/components/ui/sonner'

export default async function MFILayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return (
    <MFIShell user={user} profile={profile as Profile | null}>
      {children}
      {/* Novedades (What's New Modal) */}
      <WhatsNewModal lastSeenVersion={profile?.last_seen_version ?? null} />
      <Toaster position="top-right" duration={3000} />
    </MFIShell>
  )
}
