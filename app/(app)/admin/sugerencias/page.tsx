import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminFeedbacksClient } from './admin-feedbacks-client'
import type { Feedback } from '@/lib/types'

export default async function AdminSugerenciasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email?.toLowerCase().trim() !== 'joaquimcolacilli9@gmail.com') {
    redirect('/dashboard')
  }

  // Use service-role client to bypass RLS and read all users' feedbacks
  const adminSupabase = createAdminClient()

  const { data: feedbacks, error } = await adminSupabase
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching feedbacks:', error)
  }

  const userIds = [...new Set((feedbacks || []).map((f: { user_id: string }) => f.user_id))]

  // Fetch user emails via admin auth API (bypasses auth.users RLS)
  const userInfoMap: Record<string, { email?: string; full_name?: string }> = {}
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await adminSupabase.auth.admin.getUserById(id as string)
      if (data?.user) {
        userInfoMap[id as string] = {
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name,
        }
      }
    })
  )

  const mappedFeedbacks = (feedbacks || []).map((f: Record<string, unknown>) => ({
    ...f,
    profile: userInfoMap[f.user_id as string] || { email: 'Usuario Desconocido' },
  }))

  return <AdminFeedbacksClient initialFeedbacks={mappedFeedbacks as unknown as Feedback[]} />
}
