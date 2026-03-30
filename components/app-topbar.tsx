'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import type { Profile, Notification, NotificationType } from '@/lib/types'
import { signOut } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, Settings, CheckCheck, Info, AlertTriangle, CheckCircle2, AlertCircle, ChevronRight, Zap, Table2, Shield } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { MfiPortfolioWidget } from '@/components/mfi-portfolio-widget'
import { FeedbackModal } from '@/components/feedback-modal'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

interface AppTopbarProps {
  user: User
  profile: Profile | null
  mfiMode?: boolean
  onToggleMfi?: () => void
}

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  info:    <Info className="w-3.5 h-3.5 text-blue-500" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  alert:   <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
}

function NotificationsPopover({ userId }: { userId: string }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: notifications = [], mutate } = useSWR<Notification[]>(
    `notifications-${userId}`,
    async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15)
      return (data ?? []) as Notification[]
    },
    { refreshInterval: 30_000 },
  )

  const unread = notifications.filter((n) => !n.read).length

  async function markAllRead() {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ read: true }).in('id', ids)
    mutate(notifications.map((n) => ({ ...n, read: true })), false)
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    mutate(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)), false)
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative"
        aria-label="Notificaciones"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="w-[17px] h-[17px]" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-primary border-2 border-background" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-popover border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-foreground">Notificaciones</p>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors duration-150"
              >
                <CheckCheck className="w-3 h-3" />
                Leer todo
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Bell className="w-7 h-7 text-muted-foreground/40" />
                <p className="text-[12px] text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-100',
                    'hover:bg-muted/40',
                    i < notifications.length - 1 && 'border-b border-border/60',
                    !n.read && 'bg-accent/20',
                  )}
                >
                  <div className="mt-0.5 shrink-0">{TYPE_ICONS[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-[12.5px] text-foreground truncate', !n.read ? 'font-semibold' : 'font-medium')}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors duration-150 font-medium"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export function AppTopbar({ user, profile, mfiMode, onToggleMfi }: AppTopbarProps) {
  const router = useRouter()
  const [switchingToMfi, setSwitchingToMfi] = useState(false)
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? 'U'

  const displayName = profile?.full_name ?? user.email ?? 'Usuario'

  async function handleSwitchToMfi() {
    if (switchingToMfi) return
    setSwitchingToMfi(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ preferred_mode: 'mfi' }).eq('id', user.id)
    router.push('/mfi')
  }

  return (
    <header className="h-14 border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="md:hidden flex items-baseline gap-1.5 select-none">
        <span className="font-serif text-[17px] font-semibold tracking-tight text-foreground leading-none">MFI</span>
        <span className="text-[9px] font-sans font-medium uppercase tracking-[0.15em] text-foreground/35 leading-none">Fin</span>
      </div>
      <div className="hidden md:block" aria-hidden />

      <div className="flex items-center gap-1">
        {/* MFI Mode toggle */}
        <button
          onClick={onToggleMfi}
          title={mfiMode ? 'Desactivar modo rápido' : 'Activar modo rápido'}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold transition-all duration-200',
            mfiMode
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <Zap className={cn('w-3.5 h-3.5', mfiMode && 'fill-current')} />
          <span className="hidden sm:inline">Modo rápido</span>
        </button>

        {/* Switch to MFI mode */}
        <button
          onClick={handleSwitchToMfi}
          disabled={switchingToMfi}
          title="Ir a Modo MFI"
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold transition-all duration-200',
            'border border-border text-muted-foreground hover:text-foreground hover:bg-muted',
            switchingToMfi && 'opacity-60 cursor-wait',
          )}
        >
          <Table2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Modo MFI</span>
        </button>

        <MfiPortfolioWidget profileCurrency={profile?.default_currency ?? 'ARS'} />
        
        {user.email?.toLowerCase().trim() === 'joaquimcolacilli9@gmail.com' && (
          <Link
            href="/admin/sugerencias"
            title="Panel de Administrador"
            className={cn(
              'flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold transition-all duration-200 ml-1',
              'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        <FeedbackModal />
        <ThemeToggle />

        <NotificationsPopover userId={user.id} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold hover:opacity-85 transition-opacity ml-1"
              aria-label="Menú de usuario"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal py-2.5">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold leading-none truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground leading-none truncate mt-1">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Ajustes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
