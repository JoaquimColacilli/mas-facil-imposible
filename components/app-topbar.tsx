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
import { Bell, LogOut, Settings, CheckCheck, Info, AlertTriangle, CheckCircle2, AlertCircle, ChevronRight, ChevronDown, Table2, Shield, FileSpreadsheet, FileText, Loader2, Check, X } from 'lucide-react'
import { formatCurrency } from '@/lib/types'
import {
  fetchLinkedRequestsPreview,
  acceptLinkedLoanRequest,
  acceptLinkedDebtRequest,
  rejectLinkedRequest,
  type LinkedRequestPreview,
} from '@/app/(app)/dashboard/social-actions'
import { broadcastSocialEvent } from '@/lib/social/broadcast'
import { ThemeToggle } from '@/components/theme-toggle'
import { MfiPortfolioWidget } from '@/components/mfi-portfolio-widget'
import { UsdCotizacionWidget } from '@/components/usd-cotizacion-widget'
import { ArDatosWidget } from '@/components/ar-datos-widget'
import { WeatherClockWidget } from '@/components/weather-clock-widget'
import InvestmentStreakWidget from '@/components/investment-streak-widget'
import { FeedbackModal } from '@/components/feedback-modal'
import { FriendsTopbarButton } from '@/components/friends-topbar-button'
import { MessagesTopbarButton } from '@/components/messages-topbar-button'
import { cn } from '@/lib/utils'
import { fetchMonthlyReportData } from '@/app/(app)/dashboard/actions'
import { isNonTradingDay, getHolidayName } from '@/lib/ar-holidays'
import { getNonTradingMessage } from '@/lib/non-trading-messages'
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
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
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

  // Fase 6: preview de linked requests (loan/debt). Map notifId → { amount, note, ... }.
  const [previews, setPreviews] = useState<Record<string, LinkedRequestPreview>>({})
  const [linkedActionId, setLinkedActionId] = useState<string | null>(null)

  useEffect(() => {
    const linkedNotifs = notifications.filter(
      (n) =>
        !n.read &&
        (n.data?.type === 'friend_loan_request' || n.data?.type === 'friend_debt_request'),
    )
    const missing = linkedNotifs.map((n) => n.id).filter((id) => !(id in previews))
    if (missing.length === 0) return
    fetchLinkedRequestsPreview(missing).then((res) => {
      if (res.ok && res.data) setPreviews((prev) => ({ ...prev, ...res.data }))
    })
  }, [notifications, previews])

  async function handleAcceptLinked(n: Notification) {
    setLinkedActionId(n.id)
    const kind = n.data?.type as 'friend_loan_request' | 'friend_debt_request'
    const res =
      kind === 'friend_loan_request'
        ? await acceptLinkedLoanRequest(n.id)
        : await acceptLinkedDebtRequest(n.id)
    setLinkedActionId(null)
    if (!res.ok) {
      // Dynamic import: evita bundlar sonner en este archivo si no se usaba
      const { toast } = await import('sonner')
      toast.error(res.error)
      return
    }
    const { toast } = await import('sonner')
    toast.success(
      kind === 'friend_loan_request'
        ? 'Deuda registrada en tu cuenta'
        : 'Cobro registrado en tu cuenta',
    )
    // Realtime (Fase 7): notificar al sender del request que el viewer aceptó.
    const senderId = (n.data as { sender_id?: string } | null | undefined)?.sender_id
    if (senderId) {
      await broadcastSocialEvent(senderId, 'linked_loan_request_accepted', {
        by_user_id: userId,
      })
    }
    mutate(notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)), false)
    setOpen(false)
    router.refresh()
  }

  async function handleRejectLinked(n: Notification) {
    setLinkedActionId(n.id)
    const kind = n.data?.type as 'friend_loan_request' | 'friend_debt_request'
    const res = await rejectLinkedRequest(n.id, kind)
    setLinkedActionId(null)
    if (!res.ok) {
      const { toast } = await import('sonner')
      toast.error(res.error)
      return
    }
    mutate(notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)), false)
  }

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

  async function handleMonthlyDownload(n: Notification, format: 'excel' | 'pdf') {
    const month = n.data?.month as string
    if (!month) return
    setDownloadingId(n.id)
    try {
      await markRead(n.id)
      const result = await fetchMonthlyReportData(month)
      if (result.error || !result.transactions) return
      const { transactions, goals, loans, debts } = result
      const label = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1, 1)
        .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1)
      const { generateExcel, generatePDF } = await import('@/lib/monthly-report')
      if (format === 'excel') {
        await generateExcel(transactions, goals!, loans!, debts!, capitalizedLabel)
      } else {
        await generatePDF(transactions, goals!, loans!, debts!, capitalizedLabel)
      }
    } catch (err) {
      console.error('Error generating report:', err)
    } finally {
      setDownloadingId(null)
    }
  }

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
        className="h-9 w-9 relative cursor-pointer"
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

          <div className="max-h-[340px] overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Bell className="w-7 h-7 text-muted-foreground/40" />
                <p className="text-[12px] text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const isMonthly = n.data?.type === 'monthly_summary'
                const isFriendRequest = n.data?.type === 'friend_request_received'
                const isLinkedLoan = n.data?.type === 'friend_loan_request'
                const isLinkedDebt = n.data?.type === 'friend_debt_request'
                const isLinked = isLinkedLoan || isLinkedDebt
                const isCommunity =
                  n.data?.type === 'community_vote' ||
                  n.data?.type === 'community_comment' ||
                  n.data?.type === 'community_reply' ||
                  n.data?.type === 'community_mention'
                const communityPostId = isCommunity
                  ? (n.data as { post_id?: string })?.post_id
                  : undefined
                const preview = isLinked ? previews[n.id] : undefined
                const linkedBusy = linkedActionId === n.id
                const isInteractive = !isMonthly && !isLinked
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-100',
                      isInteractive && 'cursor-pointer hover:bg-muted/40',
                      i < notifications.length - 1 && 'border-b border-border/60',
                      !n.read && 'bg-accent/20',
                    )}
                    onClick={() => {
                      if (isLinked) return // CTAs inline manejan la acción
                      markRead(n.id)
                      if (isFriendRequest) {
                        setOpen(false)
                        router.push('/friends?tab=requests')
                      } else if (isCommunity && communityPostId) {
                        setOpen(false)
                        router.push(`/comunidad/${communityPostId}`)
                      }
                    }}
                    role={isInteractive ? 'button' : undefined}
                  >
                    <div className="mt-0.5 shrink-0">{TYPE_ICONS[n.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[12.5px] text-foreground truncate', !n.read ? 'font-semibold' : 'font-medium')}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      {isLinked && !n.read && (
                        <div className="mt-2 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {preview ? (
                            <p className="text-[11px] text-foreground font-medium">
                              {formatCurrency(preview.amount, preview.currency)}
                              {preview.note ? ` · ${preview.note}` : ''}
                            </p>
                          ) : (
                            <p className="text-[10.5px] text-muted-foreground italic">Cargando detalle…</p>
                          )}
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptLinked(n)}
                              disabled={linkedBusy || !preview}
                              className="h-6 text-[10.5px] px-2 gap-1 rounded-md"
                            >
                              {linkedBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Aceptar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectLinked(n)}
                              disabled={linkedBusy}
                              className="h-6 text-[10.5px] px-2 gap-1 rounded-md"
                            >
                              <X className="w-3 h-3" />
                              Rechazar
                            </Button>
                          </div>
                        </div>
                      )}
                      {isMonthly && (
                        <div className="flex gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMonthlyDownload(n, 'excel') }}
                            disabled={downloadingId === n.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {downloadingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                            Excel
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMonthlyDownload(n, 'pdf') }}
                            disabled={downloadingId === n.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {downloadingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                            PDF
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </div>
                )
              })
            )}
          </div>

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

function NonTradingBadge() {
  const today = new Date()
  if (!isNonTradingDay(today)) return null

  const holidayName = getHolidayName(today)
  const message = getNonTradingMessage(today, holidayName)

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 z-30 pointer-events-none mt-px">
      <div className="relative bg-amber-950/60 backdrop-blur-sm border border-amber-500/15 border-t-0 text-[10px] font-medium text-amber-300/90 px-3 py-1 rounded-b-lg shadow-lg pointer-events-auto select-none whitespace-nowrap">
        <span className="absolute -top-px left-2.5 w-1 h-1 rounded-full bg-amber-500/40" />
        <span className="absolute -top-px right-2.5 w-1 h-1 rounded-full bg-amber-500/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 inline-block mr-1.5 align-middle" />
        {message}
      </div>
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

  const btnClass = 'flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 shrink-0 cursor-pointer'

  return (
    <header className="h-14 border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 md:px-6 shrink-0 overflow-x-clip overflow-y-visible relative">
      {/* Mobile logo */}
      <div className="md:hidden flex items-baseline gap-1.5 select-none shrink-0">
        <span className="font-serif text-[17px] font-semibold tracking-tight text-foreground leading-none">MFI</span>
        <span className="text-[9px] font-sans font-medium uppercase tracking-[0.15em] text-foreground/35 leading-none">Fin</span>
      </div>

      {/* Spacer pushes everything right */}
      <div className="flex-1" />

      {/* All actions grouped right */}
      <div className="flex items-center gap-0.5 shrink-0 relative">
        {/* Cotización USD → Datos AR → Clima + hora → Streak */}
        <UsdCotizacionWidget />
        <ArDatosWidget />
        <WeatherClockWidget profile={profile} />
        <InvestmentStreakWidget />

        {/* Amigos — separa datos económicos de acciones del user */}
        <FriendsTopbarButton userId={user.id} />
        <MessagesTopbarButton userId={user.id} />

        {/* Switch to MFI mode */}
        <button
          onClick={handleSwitchToMfi}
          disabled={switchingToMfi}
          className={cn(btnClass, switchingToMfi && 'opacity-60 cursor-wait')}
        >
          <Table2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Modo MFI</span>
        </button>

        <div className="relative">
          <MfiPortfolioWidget profileCurrency={profile?.default_currency ?? 'ARS'} />
          <NonTradingBadge />
        </div>

        {user.email?.toLowerCase().trim() === 'joaquimcolacilli9@gmail.com' && (
          <Link href="/admin/sugerencias" className={cn(btnClass, 'text-blue-500 hover:text-blue-400 hover:bg-blue-500/10')}>
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        <FeedbackModal />
        <ThemeToggle />
        <NotificationsPopover userId={user.id} />

        {/* User avatar with chevron */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 h-9 pl-1.5 pr-2 rounded-xl hover:bg-muted transition-all duration-150 ml-0.5 shrink-0 cursor-pointer"
              aria-label="Menú de usuario"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
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
            <DropdownMenuItem
              asChild
              className="focus:bg-muted focus:text-foreground"
            >
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Ajustes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
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
