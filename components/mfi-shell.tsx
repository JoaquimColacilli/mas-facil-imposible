'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, BarChart3, Target, List, Settings, LogOut, Shield } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { MfiPortfolioWidget } from '@/components/mfi-portfolio-widget'
import { WeatherClockWidget } from '@/components/weather-clock-widget'
import { FeedbackModal } from '@/components/feedback-modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface MFIShellProps {
  user: User
  profile: Profile | null
  children: React.ReactNode
}

const navLinks = [
  { href: '/mfi', label: 'Transacciones', icon: List },
  { href: '/mfi/goals', label: 'Metas', icon: Target },
  { href: '/mfi/analytics', label: 'Análisis', icon: BarChart3 },
  { href: '/mfi/settings', label: 'Ajustes', icon: Settings },
]

function getInitials(profile: Profile | null, email: string): string {
  if (profile?.full_name) {
    return profile.full_name
      .split(' ')
      .slice(0, 2)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export function MFIShell({ user, profile, children }: MFIShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [switching, setSwitching] = useState(false)

  const initials = getInitials(profile, user.email ?? '')

  async function handleSwitchToClassic() {
    if (switching) return
    setSwitching(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ preferred_mode: 'classic' })
      .eq('id', user.id)
    router.push('/dashboard')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function isActive(href: string): boolean {
    if (href === '/mfi') return pathname === '/mfi'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" style={{ zoom: 1.25 }}>
      {/* Top navbar */}
      <header className="h-12 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="h-full flex items-center justify-between px-4 md:px-6">
          {/* Left: wordmark + divider + nav links */}
          <div className="flex items-center">
            <span className="font-serif font-bold text-[15px] tracking-tight">MFI</span>
            <div className="w-px h-4 bg-border mx-3" />
            <nav className="hidden sm:flex items-center gap-0.5">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'text-[13px] font-medium px-2 py-1 rounded-lg transition-colors',
                    isActive(href)
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
            {/* Mobile: icons only */}
            <nav className="flex sm:hidden items-center gap-0.5">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isActive(href)
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: avatar + mode switch button */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center select-none">
              {initials}
            </div>
            <button
              onClick={handleSwitchToClassic}
              disabled={switching}
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all',
                switching && 'opacity-60 cursor-wait'
              )}
            >
              {switching ? (
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <LayoutDashboard className="w-3.5 h-3.5" />
              )}
              <span className="hidden xs:inline">Modo clásico</span>
            </button>
            
            <WeatherClockWidget profile={profile} />

            <MfiPortfolioWidget profileCurrency={profile?.default_currency ?? 'ARS'} />
            
            {user.email?.toLowerCase().trim() === 'joaquimcolacilli9@gmail.com' && (
              <Link
                href="/admin/sugerencias"
                title="Panel de Administrador"
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold transition-all duration-200 ml-1',
                  'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            <FeedbackModal />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="w-full px-4 md:px-6 py-4 pb-20 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-around px-2 z-40">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 w-12 h-10 rounded-lg transition-colors',
              isActive(href)
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-5 h-5" />
          </Link>
        ))}
      </nav>
    </div>
  )
}
