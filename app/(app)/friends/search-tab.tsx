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
import type { PublicProfile, FriendRequest } from '@/lib/types'
import { sendFriendRequest } from './actions'

const MIN_CHARS = 3
const DEBOUNCE_MS = 350

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
  | { kind: 'self_match'; profile: PublicProfile }
  | { kind: 'found'; profile: PublicProfile }

export function SearchTab({ userId, friendIds, pendingByCounterparty }: SearchTabProps) {
  const supabase = createClient()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [state, setState] = useState<SearchState>({ kind: 'idle' })
  const [sending, setSending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = value.trim().toLowerCase()

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

    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('friends_visible_profiles')
        .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
        .ilike('username', trimmed)
        .limit(1)
        .abortSignal(controller.signal)
        .maybeSingle()

      // Stale or aborted — ignore.
      if (controller.signal.aborted) return
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows; everything else is a real error.
        setState({ kind: 'no_result', query: trimmed })
        return
      }

      if (!data) {
        // Could be: doesn't exist, not discoverable, or self.
        // Self self-check via separate lookup against profiles_public (no block filter).
        const { data: maybeSelf } = await supabase
          .from('profiles_public')
          .select('id, username, nickname, avatar_url, bio, is_discoverable, created_at')
          .ilike('username', trimmed)
          .limit(1)
          .maybeSingle()
        if (controller.signal.aborted) return
        if (maybeSelf && maybeSelf.id === userId) {
          setState({
            kind: 'self_match',
            profile: { ...maybeSelf, last_seen_at: null } as PublicProfile,
          })
        } else {
          setState({ kind: 'no_result', query: trimmed })
        }
        return
      }

      setState({ kind: 'found', profile: data as PublicProfile })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value, supabase, userId])

  async function handleSend(targetUsername: string) {
    setSending(true)
    const result = await sendFriendRequest(targetUsername)
    if (!result.ok) {
      toast.error(result.error)
      setSending(false)
      return
    }
    toast.success('Solicitud enviada.')
    setSending(false)
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
      {(state.kind === 'found' || state.kind === 'self_match') && (
        <ResultCard
          profile={state.profile}
          isSelf={state.kind === 'self_match'}
          isFriend={friendIds.has(state.profile.id)}
          pendingRequest={pendingByCounterparty.get(state.profile.id)}
          sending={sending}
          onSend={handleSend}
        />
      )}
    </div>
  )
}

function ResultCard({
  profile,
  isSelf,
  isFriend,
  pendingRequest,
  sending,
  onSend,
}: {
  profile: PublicProfile
  isSelf: boolean
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

      {isSelf ? (
        <Button size="sm" variant="secondary" disabled>Este es tu perfil</Button>
      ) : isFriend ? (
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
