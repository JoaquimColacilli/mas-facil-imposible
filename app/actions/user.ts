'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateLastSeenVersion(version: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No user found' }

  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_version: version })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
