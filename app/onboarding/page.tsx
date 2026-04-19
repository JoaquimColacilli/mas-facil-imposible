import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingClient from './onboarding-client'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, default_currency, preferred_mode, onboarding_completed, username')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed === true) {
    if (profile.preferred_mode === 'mfi') {
      redirect('/mfi')
    } else {
      redirect('/dashboard')
    }
  }

  return <OnboardingClient profile={profile} userId={user.id} />
}
