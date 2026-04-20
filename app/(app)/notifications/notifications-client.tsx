'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Notification, NotificationType } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { fetchMonthlyReportData } from '@/app/(app)/dashboard/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, AlertCircle, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

interface NotificationsClientProps {
  notifications: Notification[]
}

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  alert: <AlertCircle className="w-4 h-4 text-red-500" />,
}

export function NotificationsClient({ notifications: initial }: NotificationsClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(initial)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unread.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unread)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
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

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notificaciones</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} sin leer</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todo como leído
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Sin notificaciones por ahora.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {notifications.map((n, i) => {
              const isMonthly = n.data?.type === 'monthly_summary'
              const isFriendRequest = n.data?.type === 'friend_request_received'
              const isCommunity =
                n.data?.type === 'community_vote' ||
                n.data?.type === 'community_comment' ||
                n.data?.type === 'community_reply' ||
                n.data?.type === 'community_mention'
              const communityPostId = isCommunity
                ? (n.data as { post_id?: string })?.post_id
                : undefined
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    markRead(n.id)
                    if (isFriendRequest) {
                      router.push('/friends?tab=requests')
                    } else if (isCommunity && communityPostId) {
                      router.push(`/comunidad/${communityPostId}`)
                    }
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-muted/40',
                    i < notifications.length - 1 && 'border-b border-border',
                    !n.read && 'bg-accent/30',
                  )}
                >
                  <div className="mt-0.5 shrink-0">{TYPE_ICONS[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium text-foreground', !n.read && 'font-semibold')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {isMonthly && (
                      <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMonthlyDownload(n, 'excel') }}
                          disabled={downloadingId === n.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {downloadingId === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                          Excel
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMonthlyDownload(n, 'pdf') }}
                          disabled={downloadingId === n.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {downloadingId === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                          PDF
                        </button>
                      </div>
                    )}
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" aria-label="No leído" />
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
