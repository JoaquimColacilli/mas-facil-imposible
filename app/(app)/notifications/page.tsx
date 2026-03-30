import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Notification } from '@/lib/types'
import { NotificationsClient } from './notifications-client'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return <NotificationsClient notifications={(data ?? []) as Notification[]} />
}
