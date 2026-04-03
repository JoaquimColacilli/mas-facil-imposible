'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  BarChart3,
  TrendingUp,
  Settings,
  Bell,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { Profile } from '@/lib/types'

export const navItems = [
  { href: '/dashboard',    label: 'Inicio',      icon: LayoutDashboard },
  { href: '/transactions', label: 'Movimientos', icon: ArrowLeftRight  },
  { href: '/goals',        label: 'Metas',       icon: Target          },
  { href: '/analytics',    label: 'Análisis',     icon: BarChart3       },
  { href: '/investments',  label: 'Inversiones',  icon: TrendingUp      },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data as Profile | null))
    })
  }, [])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase()

  const displayName = profile?.full_name ?? email.split('@')[0] ?? 'Usuario'

  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-sidebar-border bg-sidebar h-svh sticky top-0 overflow-y-auto">

      {/* Logo */}
      <div className="flex items-center px-5 h-14 border-b border-sidebar-border shrink-0">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/mfi-logo.png"
            alt="MFI"
            width={88}
            height={28}
            className="h-6 w-auto object-contain dark:invert"
            priority
          />
        </Link>
      </div>

      {/* Quick add */}
      <div className="px-3 pt-4 pb-1">
        <Link
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault()
            // Dispatch a custom event that dashboard listens to
            window.dispatchEvent(new CustomEvent('open-quick-add'))
          }}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          Agregar movimiento
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5" aria-label="Navegación principal">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground/55 font-medium hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon
                className={cn(
                  'w-[15px] h-[15px] shrink-0 transition-colors duration-150',
                  active
                    ? 'text-sidebar-primary'
                    : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70',
                )}
              />
              {label}
            </Link>
          )
        })}

        <div className="my-2 border-t border-sidebar-border" />

        {/* Settings + Notifications */}
        {[
          { href: '/notifications', label: 'Notificaciones', icon: Bell },
          { href: '/settings',      label: 'Ajustes',        icon: Settings },
        ].map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground/40 font-medium hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon className={cn('w-[15px] h-[15px] shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-foreground/35 group-hover:text-sidebar-foreground/60')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent/40 transition-colors duration-150 group"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 group-hover:scale-105 transition-transform duration-150" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0 group-hover:scale-105 transition-transform duration-150">
              {initials || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-sidebar-foreground leading-none truncate">
              {profile?.mood_emoji ? `${profile.mood_emoji} ` : ''}{displayName}
            </p>
            <p className="text-[10.5px] text-sidebar-foreground/45 leading-none mt-0.5 truncate">{email}</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/96 backdrop-blur-md border-t border-border"
      aria-label="Navegación principal"
    >
      <div className="flex items-center overflow-x-auto scrollbar-none px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] gap-1">
        {[...navItems, { href: '/settings', label: 'Ajustes', icon: Settings }].map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 rounded-xl shrink-0 min-w-[64px] transition-colors duration-150',
                active ? 'text-primary' : 'text-muted-foreground/60 hover:text-muted-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('w-[19px] h-[19px] shrink-0', active && 'text-primary')} />
              <span className={cn('text-[9.5px] font-medium leading-none tracking-wide', active ? 'text-primary' : 'text-muted-foreground/60')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
