'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/social/initials'
import {
  UserPlus,
  MessageCircle,
  User as UserIcon,
  Flame,
  Star,
  Users,
  Loader2,
  Check,
} from 'lucide-react'
import {
  fetchUserCard,
  type UserCardData,
} from '@/app/(app)/friends/card-actions'
import { sendFriendRequest } from '@/app/(app)/friends/actions'
import { broadcastSocialEvent } from '@/lib/social/broadcast'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Module-level cache ──────────────────────────────────────────────────────
// Keeps the hover card instant after the first fetch in a given session.
// TTL covers the common case of walking through a comment thread where
// several avatars repeat.

type CacheEntry = { data: UserCardData; fetchedAt: number }
const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

function getCached(key: string): UserCardData | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key: string, data: UserCardData) {
  cache.set(key, { data, fetchedAt: Date.now() })
}

// ─── Component ───────────────────────────────────────────────────────────────

interface UserHoverCardProps {
  userId?: string
  username?: string
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** Bypass the hover card entirely (returns children as-is). */
  disabled?: boolean
}

export function UserHoverCard({
  userId,
  username,
  children,
  side,
  align = 'start',
  disabled = false,
}: UserHoverCardProps) {
  const key = userId ?? (username ? `@${username.toLowerCase()}` : '')
  const [data, setData] = useState<UserCardData | null>(() => (key ? getCached(key) : null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || data || loading || !key || disabled) return
    setLoading(true)
    fetchUserCard({ userId, username })
      .then((res) => {
        if (res.ok) {
          setCached(key, res.data)
          setData(res.data)
        } else {
          setError(res.error)
        }
      })
      .finally(() => setLoading(false))
  }, [open, data, loading, key, userId, username, disabled])

  if (disabled || !key) return <>{children}</>

  return (
    <HoverCard openDelay={300} closeDelay={120} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        className="w-72 p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && !data && <SkeletonBody />}
        {error && !data && <ErrorBody error={error} />}
        {data && <CardBody data={data} />}
      </HoverCardContent>
    </HoverCard>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SkeletonBody() {
  return (
    <div className="p-4 animate-pulse flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-full bg-muted" />
        <div className="flex-1 flex flex-col gap-1.5 pt-1">
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
    </div>
  )
}

function ErrorBody({ error }: { error: string }) {
  return (
    <div className="p-4 text-center">
      <p className="text-[12px] text-muted-foreground">
        {error === 'not_found' ? 'No se pudo cargar el perfil' : error}
      </p>
    </div>
  )
}

function CardBody({ data }: { data: UserCardData }) {
  const { profile, relationshipState, peerOnline, streak, karma, mutualFriendsCount } = data
  const displayName = profile.nickname ?? profile.full_name ?? profile.username ?? 'Usuario'
  const initials = getInitials(profile.nickname ?? profile.username ?? profile.full_name)
  const username = profile.username
  const profileHref = username ? `/friends/${username}` : '#'

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="relative shrink-0">
          <Avatar className="w-14 h-14">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
            <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {peerOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-popover" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5 pt-0.5">
          <p className="text-[14px] font-semibold text-foreground leading-tight truncate">{displayName}</p>
          {username ? (
            <Link
              href={profileHref}
              className="text-[12px] text-muted-foreground leading-none truncate hover:text-foreground transition-colors"
            >
              @{username}
            </Link>
          ) : (
            <span className="text-[12px] text-muted-foreground/60 italic leading-none">sin usuario</span>
          )}
          {((streak !== null && streak > 0) || (karma !== null && karma !== 0)) && (
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              {streak !== null && streak > 0 && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-orange-500">
                  <Flame className="w-3 h-3" />
                  {streak}
                </span>
              )}
              {karma !== null && karma !== 0 && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-500">
                  <Star className="w-3 h-3" />
                  {karma}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="px-4 pb-3 text-[12px] text-muted-foreground leading-snug line-clamp-3">
          {profile.bio}
        </p>
      )}

      {/* Mutual friends */}
      {mutualFriendsCount > 0 && relationshipState !== 'self' && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>
            {mutualFriendsCount === 1
              ? '1 amigo en común'
              : `${mutualFriendsCount} amigos en común`}
          </span>
        </div>
      )}

      {/* Actions */}
      <HoverCardActions data={data} profileHref={profileHref} />
    </div>
  )
}

function HoverCardActions({
  data,
  profileHref,
}: {
  data: UserCardData
  profileHref: string
}) {
  const { profile, relationshipState } = data
  const [pending, setPending] = useState(false)
  const [localState, setLocalState] = useState(relationshipState)

  async function handleAdd() {
    if (!profile.username) return
    setPending(true)
    const res = await sendFriendRequest(profile.username)
    setPending(false)
    if (!res.ok) {
      toast.error(res.error ?? 'No se pudo enviar la solicitud')
      return
    }
    toast.success('Solicitud enviada')
    setLocalState('request_sent')
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (auth.user) {
      void broadcastSocialEvent(profile.id, 'friend_request_received', {
        from_user_id: auth.user.id,
      })
    }
  }

  return (
    <div className="border-t border-border bg-muted/20 px-3 py-2.5 flex items-center gap-2">
      {localState === 'self' ? (
        <Link href={profileHref} className="flex-1">
          <Button size="sm" variant="secondary" className="w-full gap-1.5 h-8 text-[12px]">
            <UserIcon className="w-3.5 h-3.5" />
            Ver mi perfil
          </Button>
        </Link>
      ) : localState === 'friends' ? (
        <>
          <Link href={`/chat/${profile.id}`} className="flex-1">
            <Button size="sm" className="w-full gap-1.5 h-8 text-[12px]">
              <MessageCircle className="w-3.5 h-3.5" />
              Mensaje
            </Button>
          </Link>
          <Link href={profileHref} className="shrink-0">
            <Button size="sm" variant="outline" className="h-8 px-2.5 gap-1.5 text-[12px]">
              <UserIcon className="w-3.5 h-3.5" />
              Perfil
            </Button>
          </Link>
        </>
      ) : localState === 'request_sent' ? (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled
            className="flex-1 gap-1.5 h-8 text-[12px]"
          >
            <Check className="w-3.5 h-3.5" />
            Pendiente
          </Button>
          <Link href={profileHref} className="shrink-0">
            <Button size="sm" variant="outline" className="h-8 px-2.5 text-[12px]">
              Perfil
            </Button>
          </Link>
        </>
      ) : localState === 'blocked_by_me' ? (
        <Link href={profileHref} className="flex-1">
          <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-[12px]">
            <UserIcon className="w-3.5 h-3.5" />
            Ver perfil
          </Button>
        </Link>
      ) : (
        // stranger or request_received — both show "Agregar" + "Perfil"
        <>
          <Button
            size="sm"
            className="flex-1 gap-1.5 h-8 text-[12px]"
            disabled={pending || !profile.username || localState === 'request_received'}
            onClick={handleAdd}
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            {localState === 'request_received' ? 'Te envió solicitud' : 'Agregar'}
          </Button>
          <Link href={profileHref} className="shrink-0">
            <Button size="sm" variant="outline" className="h-8 px-2.5 text-[12px]">
              Perfil
            </Button>
          </Link>
        </>
      )}
    </div>
  )
}
