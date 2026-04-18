import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { WhatsNewModal } from '@/components/whats-new-modal'
import { TosReacceptanceModal } from '@/components/tos-reacceptance-modal'
import { UsernameSetupModal } from '@/components/username-setup-modal'
import { HeartbeatMount } from '@/components/heartbeat-mount'
import { Toaster } from '@/components/ui/sonner'
import type { Profile } from '@/lib/types'
import { needsLegalReacceptance } from '@/lib/legal-texts'
import { needsUsernameSetup } from '@/lib/social/identity'

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

  const typedProfile = profile as Profile | null
  const needsReacceptance = needsLegalReacceptance(typedProfile)
  // Priority: ToS > Username > WhatsNew. Each modal is mutually exclusive
  // with the next; the WhatsNewModal stays muted until both gates clear.
  const needsUsername = !needsReacceptance && needsUsernameSetup(typedProfile)

  return (
    <AppShell user={user} profile={typedProfile}>
      {children}
      <HeartbeatMount />
      <TosReacceptanceModal open={needsReacceptance} />
      <UsernameSetupModal open={needsUsername} userId={user.id} />
      <WhatsNewModal
        lastSeenVersion={profile?.last_seen_version ?? null}
        disabled={needsReacceptance || needsUsername}
      />
      <Toaster position="top-right" duration={3000} />
    </AppShell>
  )
}
