'use client'

import { useEffect, useState } from 'react'
import { Check, Users, X, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { PublicProfile } from '@/lib/types'

interface FriendPickerProps {
  /** id seleccionado, null si "Sin amigo". */
  value: string | null
  onChange: (friendId: string | null, friend: PublicProfile | null) => void
  /** Cuando true, muestra tooltip disabled y no permite interacción (linked ya confirmado). */
  disabled?: boolean
  /** Hint cuando disabled (típicamente "cobro ya confirmado"). */
  disabledHint?: string
  /** Preset del perfil inicial para render inmediato sin refetch (ej: edit). */
  initialFriend?: PublicProfile | null
  className?: string
}

export function FriendPicker({
  value,
  onChange,
  disabled,
  disabledHint,
  initialFriend,
  className,
}: FriendPickerProps) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PublicProfile | null>(initialFriend ?? null)

  // Fetch la friend list al abrir la primera vez. Barato, sin cache — pero con
  // guard para no re-fetchear si ya se abrió.
  useEffect(() => {
    if (!open || friends.length > 0 || loading) return
    setLoading(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase
        .from('friendships')
        .select('user_a_id, user_b_id')
        .then(({ data: friendships }) => {
          const ids = (friendships ?? []).map((f: any) =>
            f.user_a_id === user.id ? f.user_b_id : f.user_a_id,
          )
          if (ids.length === 0) { setFriends([]); setLoading(false); return }
          supabase
            .from('friends_visible_profiles')
            .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
            .in('id', ids)
            .order('username')
            .then(({ data }) => {
              setFriends((data ?? []) as PublicProfile[])
              setLoading(false)
            })
        })
    })
  }, [open, friends.length, loading])

  const filtered = query.trim()
    ? friends.filter((f) =>
        `${f.nickname ?? ''} ${f.username ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : friends

  const label = selected
    ? `@${selected.username}`
    : 'Sin amigo vinculado'

  function handlePick(f: PublicProfile | null) {
    setSelected(f)
    onChange(f?.id ?? null, f)
    setOpen(false)
    setQuery('')
  }

  const btnCls = cn(
    'w-full flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-left transition-shadow',
    disabled
      ? 'cursor-not-allowed opacity-60'
      : 'hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/60 cursor-pointer',
    className,
  )

  if (disabled) {
    return (
      <button type="button" className={btnCls} title={disabledHint} disabled>
        <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate text-foreground">{label}</span>
      </button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={btnCls}>
          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className={cn('flex-1 truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
            {label}
          </span>
          {selected && (
            <X
              className="w-3 h-3 text-muted-foreground hover:text-foreground shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                handlePick(null)
              }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-64">
        <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Buscar amigo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">
              {friends.length === 0 ? 'Todavía no tenés amigos.' : 'Sin resultados.'}
            </p>
          ) : (
            filtered.map((f) => {
              const isSel = selected?.id === f.id
              const initials = (f.nickname ?? f.username ?? '?').slice(0, 2).toUpperCase()
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handlePick(f)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Avatar className="w-6 h-6 shrink-0">
                    {f.avatar_url && <AvatarImage src={f.avatar_url} alt={`@${f.username}`} />}
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] font-medium text-foreground truncate leading-tight">
                      {f.nickname ?? f.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">@{f.username}</p>
                  </div>
                  {isSel && <Check className="w-3 h-3 text-primary shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
