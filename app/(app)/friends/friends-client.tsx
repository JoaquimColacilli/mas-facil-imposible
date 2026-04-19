'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserPlus, Inbox, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FriendRequest, PublicProfile } from '@/lib/types'
import { FriendCard } from './friend-card'
import { RequestRow } from './request-row'
import { SearchTab } from './search-tab'
import { SuggestedTab } from './suggested-tab'
import { BlockedUsersSection } from './blocked-users-section'
import { markFriendRequestNotificationsRead } from './actions'

export type FriendRequestWithProfile = FriendRequest & { profile: PublicProfile | null }

interface FriendsClientProps {
  userId: string
  initialTab: 'friends' | 'requests' | 'suggested' | 'search'
  friends: PublicProfile[]
  received: FriendRequestWithProfile[]
  sent: FriendRequestWithProfile[]
  blocked: PublicProfile[]
}

export function FriendsClient({
  userId,
  initialTab,
  friends,
  received,
  sent,
  blocked,
}: FriendsClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState(initialTab)

  // Mark friend_request_received notifications as read on mount.
  // Best-effort — silent on failure.
  useEffect(() => {
    if (received.length > 0) {
      markFriendRequestNotificationsRead().catch(() => {})
    }
  }, [received.length])

  // Keep tab state and URL in sync (so badge link from topbar resets back to friends after navigation).
  function handleTabChange(value: string) {
    const next = value as 'friends' | 'requests' | 'suggested' | 'search'
    setTab(next)
    const params = new URLSearchParams(window.location.search)
    if (next === 'friends') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    router.replace(qs ? `/friends?${qs}` : '/friends')
  }

  // Sets used by SearchTab to render the right CTA per result.
  const friendIds = new Set(friends.map((f) => f.id))
  const pendingByCounterparty = new Map<string, { id: string; iSent: boolean }>()
  for (const r of received) if (r.profile) pendingByCounterparty.set(r.profile.id, { id: r.id, iSent: false })
  for (const r of sent) if (r.profile) pendingByCounterparty.set(r.profile.id, { id: r.id, iSent: true })

  return (
    // Desktop (md+): card con border + rounded + shadow + padding interno para
    // consistencia visual con /chat/[userId] y /chat inbox. Mobile sin borde.
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full md:border md:border-border md:rounded-xl md:shadow-sm md:bg-background md:p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Amigos</h1>
      </header>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="friends">Amigos</TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5">
            Solicitudes
            {received.length > 0 && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                {received.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggested">Sugeridos</TabsTrigger>
          <TabsTrigger value="search">Buscar</TabsTrigger>
        </TabsList>

        {/* ── Tab Amigos ─────────────────────────────────────────────── */}
        <TabsContent value="friends" className="mt-4">
          {friends.length === 0 ? (
            <EmptyFriends />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} />
              ))}
            </div>
          )}
          {/* Blocked users section is hidden when empty (renders null). */}
          <BlockedUsersSection blocked={blocked} />
        </TabsContent>

        {/* ── Tab Solicitudes ────────────────────────────────────────── */}
        <TabsContent value="requests" className="mt-4 flex flex-col gap-6">
          <Section title="Recibidas" empty="No tenés solicitudes pendientes.">
            {received.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                {received.map((r) =>
                  r.profile ? (
                    <RequestRow
                      key={r.id}
                      requestId={r.id}
                      profile={r.profile}
                      direction="received"
                      createdAt={r.created_at}
                    />
                  ) : null,
                )}
              </div>
            )}
          </Section>

          <Section title="Enviadas" empty="No enviaste solicitudes recientemente.">
            {sent.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                {sent.map((r) =>
                  r.profile ? (
                    <RequestRow
                      key={r.id}
                      requestId={r.id}
                      profile={r.profile}
                      direction="sent"
                      createdAt={r.created_at}
                    />
                  ) : null,
                )}
              </div>
            )}
          </Section>
        </TabsContent>

        {/* ── Tab Sugeridos ──────────────────────────────────────────── */}
        <TabsContent value="suggested" className="mt-4">
          <SuggestedTab />
        </TabsContent>

        {/* ── Tab Buscar ─────────────────────────────────────────────── */}
        <TabsContent value="search" className="mt-4">
          <SearchTab
            userId={userId}
            friendIds={friendIds}
            pendingByCounterparty={pendingByCounterparty}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Section({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  // Children may be falsy (e.g. when array is empty). We render the empty state
  // explicitly when children resolve to nothing visible.
  const hasChildren = !!children && (Array.isArray(children) ? children.length > 0 : true)
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {hasChildren ? children : (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          {empty}
        </p>
      )}
    </section>
  )
}

function EmptyFriends() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-4 border border-dashed border-border rounded-2xl">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Users className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Todavía no agregaste a nadie.</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Buscá por username o compartí tu link de invitación desde Ajustes.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/friends?tab=search">
            <UserPlus className="w-4 h-4" />
            Buscar
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/settings">
            <Inbox className="w-4 h-4" />
            Mi link
          </Link>
        </Button>
      </div>
    </div>
  )
}
