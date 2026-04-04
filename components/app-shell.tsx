'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { DesktopSidebar, MobileBottomNav } from '@/components/nav'
import { AppTopbar } from '@/components/app-topbar'
import { MFIQuickEntry } from '@/components/mfi-quick-entry'
import { CommandPalette } from '@/components/command-palette'
import { Search } from 'lucide-react'

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

        <main className="flex-1 overflow-y-auto overflow-x-hidden" id="main-content">
          <div className="w-full px-4 md:px-6 py-5 pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
      <CommandPalette />

      {/* Fixed search bar (bottom-right) */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        className="fixed bottom-6 right-6 z-40 md:bottom-8 md:right-8 flex items-center gap-2.5 h-10 px-4 rounded-xl bg-card border border-border shadow-lg hover:shadow-xl hover:border-primary/40 hover:-translate-y-[1px] active:scale-[0.98] transition-all duration-150 mb-[env(safe-area-inset-bottom,0px)] md:mb-0"
        aria-label="Buscar (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[13px] text-muted-foreground font-medium">Buscar...</span>
        <kbd className="hidden sm:inline text-[10px] font-mono text-muted-foreground/50 bg-muted/60 border border-border rounded px-1.5 py-0.5 ml-1">
          Ctrl K
        </kbd>
      </button>
    </div>
  )
}
