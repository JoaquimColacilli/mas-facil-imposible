import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Flame, MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getRelationshipState } from '@/lib/social/relationship'
import { getPublicStreak } from '@/lib/social/public-stats'
import { FriendRequestButton } from '@/components/friend-request-button'
import { PresenceDot } from '@/components/presence-dot'
import { isOnlineFromLastSeen } from '@/lib/social/presence'
import type { PublicProfile } from '@/lib/types'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} en MFI`,
    description: `Perfil de @${username} en MFI.`,
    robots: { index: false, follow: false },
  }
}

export default async function FriendProfilePage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // profiles_public already filters by is_discoverable (or self) and collapses
  // bio to null when show_bio=false.
  const { data: profile } = await supabase
    .from('profiles_public')
    .select('id, username, nickname, avatar_url, bio, show_streak, show_badges, is_discoverable, created_at')
    .ilike('username', username)
    .limit(1)
    .maybeSingle()
  if (!profile) notFound()

  const publicProfile = profile as PublicProfile

  // Relationship: silently 404 if the target blocked the viewer.
  const relationship = await getRelationshipState(user.id, publicProfile.id)
  if (relationship.state === 'blocked_by_them') notFound()

  // last_seen_at NO está en profiles_public (view granted a anon → evitamos
  // exponer presence a randos). Traemos en query separada, authenticated —
  // la policy profiles_select_discoverable_or_friends (017 bloque 11) cubre
  // el caso discoverable/friend/self sin cambios.
  const { data: presenceRow } = await supabase
    .from('profiles')
    .select('last_seen_at')
    .eq('id', publicProfile.id)
    .maybeSingle()
  const peerOnline = isOnlineFromLastSeen(presenceRow?.last_seen_at ?? null)

  // Streak — RPC enforces the flag server-side. Null when show_streak=false
  // OR target doesn't exist OR not discoverable to viewer.
  const streak = publicProfile.show_streak ? await getPublicStreak(publicProfile.id) : null

  const isSelf = relationship.state === 'self'
  const initials = (publicProfile.nickname ?? publicProfile.username ?? '?')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
      {/* Back */}
      <div>
        <Link
          href="/friends"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Amigos
        </Link>
      </div>

      {/* Self preview banner (Ajuste A) */}
      {isSelf && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          Así te ven los demás usuarios. Podés ajustar qué mostrás desde{' '}
          <Link
            href="/settings#social-profile"
            className="underline underline-offset-4 font-medium hover:text-primary"
          >
            Ajustes
          </Link>
          .
        </div>
      )}

      {/* Main grid: 2 cols on desktop, stack on mobile with relationship-card arriba */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* ── Left column (on mobile: second) ────────────────────────── */}
        <div className="flex flex-col gap-4 order-2 lg:order-1">
          {/* Profile card */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  {publicProfile.avatar_url && (
                    <AvatarImage src={publicProfile.avatar_url} alt={`@${publicProfile.username}`} />
                  )}
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <PresenceDot
                  online={peerOnline}
                  size="md"
                  className="absolute bottom-1 right-1"
                />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                {publicProfile.nickname && (
                  <p className="text-xl font-semibold text-foreground leading-tight">
                    {publicProfile.nickname}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">@{publicProfile.username}</p>
              </div>
              {publicProfile.bio && (
                <p className="text-sm text-foreground/80 leading-relaxed max-w-sm whitespace-pre-wrap">
                  {publicProfile.bio}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stats card — only when streak is exposable. Badges reserved for v2. */}
          {streak !== null && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Actividad</CardTitle>
              </CardHeader>
              <CardContent>
                <StreakRow streak={streak} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right column (on mobile: first, above profile) ─────────── */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                {isSelf ? 'Tu perfil' : 'Relación'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  {publicProfile.avatar_url && (
                    <AvatarImage src={publicProfile.avatar_url} alt={`@${publicProfile.username}`} />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <p className="text-sm text-foreground truncate">@{publicProfile.username}</p>
              </div>

              {isSelf ? (
                <Link
                  href="/settings#social-profile"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Editar en Ajustes →
                </Link>
              ) : (
                <>
                  <FriendRequestButton
                    state={relationship.state}
                    requestId={relationship.requestId}
                    targetUsername={publicProfile.username}
                    targetId={publicProfile.id}
                  />
                  {relationship.state === 'friends' && (
                    <Button asChild variant="outline" className="gap-1.5 mt-1">
                      <Link href={`/chat/${publicProfile.id}`}>
                        <MessageCircle className="w-4 h-4" />
                        Enviar mensaje
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StreakRow({ streak }: { streak: number }) {
  // Ajuste B: distinguir entre racha activa (>0) y sin racha (0).
  // Null se maneja en el caller (no se renderiza la card).
  if (streak === 0) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium text-foreground">Sin racha activa</p>
          <p className="text-[11px] text-muted-foreground">
            Aún no tiene días consecutivos cargados.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
        <Flame className="w-4 h-4 text-orange-500" />
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-foreground">
          {streak} {streak === 1 ? 'día consecutivo' : 'días consecutivos'} de inversión
        </p>
        <p className="text-[11px] text-muted-foreground">Sigue cargando inversiones en MFI.</p>
      </div>
    </div>
  )
}
