'use client'

import { useState } from 'react'
import type { Notification, NotificationType } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react'

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
  const [notifications, setNotifications] = useState<Notification[]>(initial)

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
            {notifications.map((n, i) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40',
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
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" aria-label="No leído" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
