'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { DesktopSidebar, MobileBottomNav } from '@/components/nav'
import { AppTopbar } from '@/components/app-topbar'
import { MFIQuickEntry } from '@/components/mfi-quick-entry'

const MFI_STORAGE_KEY = 'mfi-quick-mode'

interface AppShellProps {
  user: User
  profile: Profile | null
  children: React.ReactNode
}

export function AppShell({ user, profile, children }: AppShellProps) {
  const [mfiMode, setMfiMode] = useState(false)

  // Restore from localStorage
  useEffect(() => {
    try {
      setMfiMode(localStorage.getItem(MFI_STORAGE_KEY) === '1')
    } catch {}
  }, [])

  function toggleMfi() {
    setMfiMode(prev => {
      const next = !prev
      try { localStorage.setItem(MFI_STORAGE_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  return (
    <div className="flex min-h-svh bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar
          user={user}
          profile={profile}
          mfiMode={mfiMode}
          onToggleMfi={toggleMfi}
        />

        {mfiMode && (
          <MFIQuickEntry
            defaultCurrency={profile?.default_currency ?? 'ARS'}
          />
        )}

        <main className="flex-1 overflow-auto" id="main-content">
          <div className="w-full px-4 md:px-6 py-5 pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
