'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { PublicProfile } from '@/lib/types'
import { broadcastSocialEvent } from '@/lib/social/broadcast'
import { normalizeUsername } from '@/lib/social/normalize-username'
import { sendFriendRequest } from './actions'

const MIN_CHARS = 3
const DEBOUNCE_MS = 350
const RESULT_LIMIT = 10

interface SearchTabProps {
  userId: string
  /** IDs the current user is already friends with (skip "send" CTA, just show as friend). */
  friendIds: Set<string>
  /** Map of pending request id by counterparty id (so we know if we sent or received). */
  pendingByCounterparty: Map<string, { id: string; iSent: boolean }>
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'too_short' }
  | { kind: 'searching' }
  | { kind: 'no_result'; query: string }
  | { kind: 'results'; profiles: PublicProfile[]; selfMatch: PublicProfile | null }

// LIKE/ILIKE treats % and _ as wildcards. Users can't have those chars in a
// username (Fase 1 CHECK constraint), but a raw % or _ in the input would
// still produce a malformed pattern. Escape defensively.
function escapeLikeWildcards(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export function SearchTab({ userId, friendIds, pendingByCounterparty }: SearchTabProps) {
  const supabase = createClient()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [state, setState] = useState<SearchState>({ kind: 'idle' })
  const [sending, setSending] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = normalizeUsername(value).toLowerCase()

    if (trimmed.length === 0) {
      setState({ kind: 'idle' })
      return
    }
    if (trimmed.length < MIN_CHARS) {
      setState({ kind: 'too_short' })
      return
    }

    setState({ kind: 'searching' })

    // Cancel any in-flight request before scheduling a new one.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const pattern = `${escapeLikeWildcards(trimmed)}%`

    const timer = setTimeout(async () => {
      // Two parallel prefix queries:
      //   1. friends_visible_profiles: other users, blocks excluded. The main list.
      //   2. profiles_public scoped to self: detects whether the viewer's own
      //      username matches the prefix → self-match banner on top.
      const [othersRes, selfRes] = await Promise.all([
        supabase
          .from('friends_visible_profiles')
          .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
          .ilike('username', pattern)
          .order('username', { ascending: true })
          .limit(RESULT_LIMIT)
          .abortSignal(controller.signal),
        supabase
          .from('profiles_public')
          .select('id, username, nickname, avatar_url, bio, is_discoverable, created_at')
          .eq('id', userId)
          .ilike('username', pattern)
          .limit(1)
          .abortSignal(controller.signal)
          .maybeSingle(),
      ])

      if (controller.signal.aborted) return

      const othersError = othersRes.error
      if (othersError && othersError.code !== 'PGRST116') {
        setState({ kind: 'no_result', query: trimmed })
        return
      }

      const others = (othersRes.data ?? []) as PublicProfile[]
      const self = selfRes.data
        ? ({ ...selfRes.data, last_seen_at: null } as PublicProfile)
        : null

      if (others.length === 0 && !self) {
        setState({ kind: 'no_result', query: trimmed })
        return
      }

      setState({ kind: 'results', profiles: others, selfMatch: self })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value, supabase, userId])

  async function handleSend(profileId: string, targetUsername: string) {
    setSending(profileId)
    const result = await sendFriendRequest(targetUsername)
    if (!result.ok) {
      toast.error(result.error)
      setSending(null)
      return
    }
    toast.success('Solicitud enviada.')
    await broadcastSocialEvent(profileId, 'friend_request_received', {
      from_user_id: userId,
    })
    setSending(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\s/g, ''))}
          placeholder="Buscar por @username"
          autoComplete="off"
          spellCheck={false}
          className="h-10 pl-9"
        />
      </div>

      {state.kind === 'idle' && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Buscá por username — escribí al menos {MIN_CHARS} caracteres.
        </p>
      )}
      {state.kind === 'too_short' && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Escribí al menos {MIN_CHARS} caracteres.
        </p>
      )}
      {state.kind === 'searching' && (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Buscando…</span>
        </div>
      )}
      {state.kind === 'no_result' && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No encontramos a <span className="font-mono">@{state.query}</span>.
        </p>
      )}
      {state.kind === 'results' && (
        <div className="flex flex-col gap-2">
          {state.selfMatch && <SelfMatchCard profile={state.selfMatch} />}
          {state.profiles.map((profile) => (
            <ResultCard
              key={profile.id}
              profile={profile}
              isFriend={friendIds.has(profile.id)}
              pendingRequest={pendingByCounterparty.get(profile.id)}
              sending={sending === profile.id}
              onSend={(u) => handleSend(profile.id, u)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SelfMatchCard({ profile }: { profile: PublicProfile }) {
  const initials = (profile.nickname ?? profile.username ?? '?').slice(0, 2).toUpperCase()
  return (
    <Card className="p-4 flex items-center gap-3 border-primary/30 bg-primary/5">
      <Avatar className="w-12 h-12 shrink-0">
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={`@${profile.username}`} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {profile.nickname ?? profile.username}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
      </div>
      <Button size="sm" variant="secondary" disabled className="shrink-0">
        Ese sos vos
      </Button>
    </Card>
  )
}

function ResultCard({
  profile,
  isFriend,
  pendingRequest,
  sending,
  onSend,
}: {
  profile: PublicProfile
  isFriend: boolean
  pendingRequest: { id: string; iSent: boolean } | undefined
  sending: boolean
  onSend: (username: string) => void
}) {
  const initials = (profile.nickname ?? profile.username ?? '?').slice(0, 2).toUpperCase()

  return (
    <Card className="p-4 flex items-center gap-3">
      <Avatar className="w-12 h-12 shrink-0">
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={`@${profile.username}`} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {profile.nickname ?? profile.username}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
        {profile.bio && (
          <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{profile.bio}</p>
        )}
      </div>

      {isFriend ? (
        <Button size="sm" variant="secondary" disabled>Sos amigo</Button>
      ) : pendingRequest ? (
        <Button size="sm" variant="secondary" disabled>
          {pendingRequest.iSent ? 'Solicitud enviada' : 'Te envió una solicitud'}
        </Button>
      ) : (
        <Button
          size="sm"
          className="gap-1.5"
          disabled={sending || !profile.username}
          onClick={() => profile.username && onSend(profile.username)}
        >
          <UserPlus className="w-4 h-4" />
          {sending ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      )}
    </Card>
  )
}
