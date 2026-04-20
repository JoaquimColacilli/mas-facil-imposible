import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/social/initials'
import type { PublicProfile } from '@/lib/types'
import { getRelationshipState } from '@/lib/social/relationship'
import { FriendRequestButton } from '@/components/friend-request-button'

interface PageProps {
  params: Promise<{ username: string }>
}

// Privacy-first: discoverable profiles still shouldn't be indexed by search
// engines without per-profile opt-in (v2). Robots noindex is set inside the
// dynamic metadata below — Next.js forbids exporting both `metadata` and
// `generateMetadata` in the same file.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} en MFI`,
    description: `Perfil de @${username} en MFI.`,
    robots: { index: false, follow: false },
  }
}

export default async function AddUsernamePage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient()

  // profiles_public uses security_invoker = true and filters by is_discoverable.
  // Anon callers see only public, discoverable rows; non-discoverable users
  // return null here, which collapses to a 404 (no existence leak).
  const { data: profile } = await supabase
    .from('profiles_public')
    .select('id, username, nickname, avatar_url, bio, is_discoverable, created_at')
    .ilike('username', username)
    .limit(1)
    .maybeSingle()

  if (!profile) notFound()

  // profiles_public no expone last_seen_at (decisión de privacidad Fase 5 —
  // evitar leak de presence a anon). Inyectamos null para satisfacer el tipo.
  const publicProfile = { ...profile, last_seen_at: null } as PublicProfile

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // For authenticated viewers: compute the relationship state. If the target
  // blocked the viewer (silencioso), 404 — never leak existence.
  const relationship = user ? await getRelationshipState(user.id, publicProfile.id) : null
  if (relationship?.state === 'blocked_by_them') notFound()

  const isAuthenticated = !!user

  const initials = getInitials(publicProfile.nickname ?? publicProfile.username)

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <span className="font-serif text-lg font-bold tracking-tight">MFI</span>
        </div>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
          <Avatar className="w-20 h-20">
            {publicProfile.avatar_url && (
              <AvatarImage src={publicProfile.avatar_url} alt={`@${publicProfile.username}`} />
            )}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-center gap-0.5">
            {publicProfile.nickname && (
              <p className="text-xl font-semibold text-foreground leading-tight">
                {publicProfile.nickname}
              </p>
            )}
            <p className="text-sm text-muted-foreground">@{publicProfile.username}</p>
          </div>

          {publicProfile.bio && (
            <p className="text-sm text-foreground/80 leading-relaxed max-w-xs whitespace-pre-wrap">
              {publicProfile.bio}
            </p>
          )}

          {/* CTA branched by viewer */}
          <div className="w-full pt-4 mt-2 border-t border-border/60 flex flex-col gap-2 items-center">
            {isAuthenticated && relationship ? (
              relationship.state === 'self' ? (
                <Button asChild className="w-full" variant="outline">
                  <Link href="/settings">Este es tu perfil — editar</Link>
                </Button>
              ) : (
                <FriendRequestButton
                  state={relationship.state}
                  requestId={relationship.requestId}
                  targetUsername={publicProfile.username}
                  targetId={publicProfile.id}
                />
              )
            ) : (
              <Button asChild className="w-full gap-1.5">
                <Link href={`/auth/login?next=/add/${publicProfile.username}`}>
                  <LogIn className="w-4 h-4" />
                  Iniciá sesión para agregar a @{publicProfile.username}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-[11px] text-muted-foreground">
          MFI — Más Fácil Imposible · Tus finanzas, claras y sin fricciones.
        </p>
      </footer>
    </div>
  )
}
