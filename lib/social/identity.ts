import type { Profile } from '@/lib/types'

/**
 * True if a user finished onboarding pre-Fase-1 (no username yet) and must
 * pick one before accessing the app. Used by AppLayout to gate everything
 * behind a blocking modal.
 *
 * Returns false for users who have not completed onboarding — they're
 * still in the onboarding flow which now includes the username step.
 */
export function needsUsernameSetup(profile: Profile | null): boolean {
  if (!profile) return false
  if (!profile.onboarding_completed) return false
  return !profile.username
}
