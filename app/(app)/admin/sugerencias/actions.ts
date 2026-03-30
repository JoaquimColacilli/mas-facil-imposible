'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateFeedbackStatus(id: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email?.toLowerCase().trim() !== 'joaquimcolacilli9@gmail.com') {
    redirect('/dashboard')
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('feedbacks')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
