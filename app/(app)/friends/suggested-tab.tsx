'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Sparkles, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { PresenceDot } from '@/components/presence-dot'
import { isOnlineFromLastSeen } from '@/lib/social/presence'
import { createClient } from '@/lib/supabase/client'
import { broadcastSocialEvent } from '@/lib/social/broadcast'
import { sendFriendRequest } from './actions'
import type { PublicProfile } from '@/lib/types'

const PAGE_SIZE = 20

type FetchState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

export function SuggestedTab() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' })
  const [items, setItems] = useState<PublicProfile[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [retryKey, setRetryKey] = useState(0)

  // Fresh fetch on every mount. Radix unmounts inactive TabsContent, so
  // tab-in/tab-out cycles produce a new fetch each time — intentional.
  //
  // Deps are [retryKey] only: state/offset/items are all updated inside and
  // must not retrigger the effect, and supabase (from createClient()) isn't
  // a singleton so referencing it in deps causes an infinite loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    setState({ kind: 'loading' })
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('get_suggested_users', {
          p_limit: PAGE_SIZE,
          p_offset: 0,
        })
        if (cancelled) return
        if (error) throw new Error(error.message)
        const rows = (data ?? []) as PublicProfile[]
        setItems(rows)
        setOffset(rows.length)
        setHasMore(rows.length === PAGE_SIZE)
        setState({ kind: 'ready' })
      } catch (e) {
        if (cancelled) return
        setState({ kind: 'error', message: (e as Error).message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [retryKey])

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_suggested_users', {
        p_limit: PAGE_SIZE,
        p_offset: offset,
      })
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as PublicProfile[]
      setItems((prev) => [...prev, ...rows])
      setOffset(offset + rows.length)
      setHasMore(rows.length === PAGE_SIZE)
    } catch (e) {
      toast.error('No se pudieron cargar más sugerencias.')
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleAdd(profile: PublicProfile) {
    if (!profile.username || sent.has(profile.id)) return
    // Optimistic lock: mark as sent immediately so repeated clicks are no-ops.
    setSent((prev) => new Set(prev).add(profile.id))
    const result = await sendFriendRequest(profile.username)
    if (!result.ok) {
      // Roll back the optimistic lock so the user can retry.
      setSent((prev) => {
        const next = new Set(prev)
        next.delete(profile.id)
        return next
      })
      toast.error(result.error)
      return
    }
    toast.success('Solicitud enviada.')
    const supabase = createClient()
    const { data: { user: viewer } } = await supabase.auth.getUser()
    if (viewer) {
      await broadcastSocialEvent(profile.id, 'friend_request_received', {
        from_user_id: viewer.id,
      })
    }
  }

  if (state.kind === 'loading') {
    return <SuggestedSkeleton />
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-3 border border-dashed border-border rounded-2xl">
        <p className="text-sm font-semibold text-foreground">
          No pudimos cargar las sugerencias.
        </p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Probá de nuevo en un momento.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRetryKey((k) => k + 1)}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return <EmptySuggestions />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold text-foreground">Usuarios MFI</h2>
        <p className="text-xs text-muted-foreground">Gente nueva que podés agregar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => (
          <SuggestedCard
            key={p.id}
            profile={p}
            onAdd={() => handleAdd(p)}
            sent={sent.has(p.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Cargando…
              </>
            ) : (
              'Ver más'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

function SuggestedCard({
  profile,
  onAdd,
  sent,
}: {
  profile: PublicProfile
  onAdd: () => void
  sent: boolean
}) {
  const [pending, setPending] = useState(false)
  const initials = (profile.nickname ?? profile.username ?? '?').slice(0, 2).toUpperCase()

  async function handleClick() {
    if (sent || pending) return
    setPending(true)
    try {
      await onAdd()
    } finally {
      setPending(false)
    }
  }

  // Duda 4 resolved: only avatar + nickname link to profile; card body is NOT
  // a link, to avoid accidental navigation away from the "Agregar" CTA.
  return (
    <Card className="p-4 flex items-center gap-3">
      <Link
        href={profile.username ? `/friends/${profile.username}` : '#'}
        className="relative shrink-0 hover:opacity-80 transition-opacity"
        aria-label={profile.username ? `Ver perfil de @${profile.username}` : undefined}
      >
        <Avatar className="w-12 h-12">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={`@${profile.username}`} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <PresenceDot
          online={isOnlineFromLastSeen(profile.last_seen_at)}
          size="sm"
          className="absolute bottom-0 right-0"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          href={profile.username ? `/friends/${profile.username}` : '#'}
          className="block hover:underline underline-offset-2 decoration-muted-foreground/40"
        >
          <p className="text-sm font-semibold text-foreground truncate">
            {profile.nickname ?? profile.username}
          </p>
        </Link>
        <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
      </div>

      {sent ? (
        <Button size="sm" variant="secondary" disabled className="shrink-0">
          Solicitud enviada
        </Button>
      ) : (
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={handleClick}
          disabled={pending || !profile.username}
          aria-label={`Enviar solicitud a @${profile.username}`}
        >
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              Agregar
            </>
          )}
        </Button>
      )}
    </Card>
  )
}

function SuggestedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-3 w-48 bg-muted/70 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted/70 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-muted rounded animate-pulse shrink-0" />
          </Card>
        ))}
      </div>
    </div>
  )
}

function EmptySuggestions() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-4 border border-dashed border-border rounded-2xl">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          No hay usuarios para sugerirte ahora.
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Cuando haya más users en MFI te aparecerán acá.
        </p>
      </div>
    </div>
  )
}
