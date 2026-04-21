'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserHoverCard } from '@/components/user-hover-card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { PublicProfile } from '@/lib/types'
import { broadcastSocialEvent, type SocialEventType } from '@/lib/social/broadcast'
import { getInitials } from '@/lib/social/initials'
import {
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
} from './actions'

interface RequestRowProps {
  requestId: string
  profile: PublicProfile
  direction: 'received' | 'sent'
  createdAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export function RequestRow({ requestId, profile, direction, createdAt }: RequestRowProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function run(
    promise: Promise<{ ok: boolean; error?: string }>,
    msg: string,
    broadcastType?: SocialEventType,
  ) {
    startTransition(async () => {
      const result = await promise
      if (!result.ok) {
        toast.error(result.error ?? 'Algo salió mal.')
        return
      }
      toast.success(msg)
      if (broadcastType) {
        const supabase = createClient()
        const { data: { user: viewer } } = await supabase.auth.getUser()
        if (viewer) {
          await broadcastSocialEvent(profile.id, broadcastType, {
            by_user_id: viewer.id,
            from_user_id: viewer.id,
          })
        }
      }
      router.refresh()
    })
  }

  const initials = getInitials(profile.nickname ?? profile.username)

  return (
    <div className="flex items-center gap-3 px-3 py-3.5 border-b border-border last:border-b-0">
      <UserHoverCard userId={profile.id} username={profile.username ?? undefined}>
        <Avatar className="w-11 h-11 shrink-0 cursor-pointer">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={`@${profile.username}`} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </UserHoverCard>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-foreground truncate leading-tight">
          {profile.nickname ?? profile.username}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          @{profile.username} · {timeAgo(createdAt)}
        </p>
      </div>

      {direction === 'received' ? (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(acceptFriendRequest(requestId), '¡Ahora son amigos!', 'friend_request_accepted')}
          >
            Aceptar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(rejectFriendRequest(requestId), 'Solicitud rechazada.', 'friend_request_rejected')}
          >
            Rechazar
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(cancelFriendRequest(requestId), 'Solicitud cancelada.', 'friend_request_cancelled')}
        >
          Cancelar
        </Button>
      )}
    </div>
  )
}
