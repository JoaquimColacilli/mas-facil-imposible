import { createClient } from '@/lib/supabase/server'
import { computeStreak } from '@/lib/investment-streak'
import { isNonTradingDay } from '@/lib/ar-holidays'

/**
 * Server-side helper to fetch another user's public investment streak.
 *
 * Returns:
 *   - a non-negative integer when the streak is exposable, or
 *   - null when the owner has show_streak=false, is not discoverable,
 *     or does not exist. The caller must treat null as "do not render
 *     the streak card" — never distinguish between the three reasons.
 *
 * The 90-day window + isNonTradingDay logic matches components/
 * investment-streak-widget.tsx so the number the owner sees on their
 * own topbar matches what their friends see on their profile.
 */
export async function getPublicStreak(targetUserId: string): Promise<number | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_streak_dates', {
    target_user_id: targetUserId,
  })

  if (error) return null
  if (data === null) return null

  const dates = data as string[]
  const dateSet = new Set(dates)
  const { streak } = computeStreak(dateSet, new Date(), isNonTradingDay)
  return streak
}
