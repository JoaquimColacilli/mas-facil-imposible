import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { WhatsNewModal } from '@/components/whats-new-modal'
import { Toaster } from '@/components/ui/sonner'
import type { Profile } from '@/lib/types'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AppShell user={user} profile={profile as Profile | null}>
      {children}
      <WhatsNewModal lastSeenVersion={profile?.last_seen_version ?? null} />
      <Toaster position="top-right" duration={3000} />
    </AppShell>
  )
}
