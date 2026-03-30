import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DesktopSidebar, MobileBottomNav } from '@/components/nav'
import { AppTopbar } from '@/components/app-topbar'

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
    <div className="flex min-h-svh bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar user={user} profile={profile} />

        <main className="flex-1 overflow-auto" id="main-content">
          {/* max-w-2xl keeps mobile-first density even on wide screens */}
          <div className="w-full px-4 md:px-6 py-5 pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
