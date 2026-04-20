'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { User, MessageCircle, UserMinus, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { PresenceDot } from '@/components/presence-dot'
import { isOnlineFromLastSeen } from '@/lib/social/presence'
import type { PublicProfile } from '@/lib/types'
import { removeFriend, blockUser } from './actions'

interface FriendCardProps {
  friend: PublicProfile
}

export function FriendCard({ friend }: FriendCardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<null | 'remove' | 'block'>(null)

  function run(promise: Promise<{ ok: boolean; error?: string }>, msg: string) {
    startTransition(async () => {
      const result = await promise
      if (!result.ok) {
        toast.error(result.error ?? 'Algo salió mal.')
        return
      }
      toast.success(msg)
      router.refresh()
    })
  }

  const initials = (friend.nickname ?? friend.username ?? '?').slice(0, 2).toUpperCase()

  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="relative shrink-0">
        <Avatar className="w-12 h-12">
          {friend.avatar_url && <AvatarImage src={friend.avatar_url} alt={`@${friend.username}`} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <PresenceDot
          online={isOnlineFromLastSeen(friend.last_seen_at)}
          size="sm"
          className="absolute bottom-0 right-0"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {friend.nickname ?? friend.username}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
      </div>

      {/* Action buttons — 1 row on desktop + wide mobile; auto 2x2 on very
          tight mobile if the nickname above pushes them. */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1 shrink-0 max-md:flex-wrap max-md:justify-end max-md:max-w-[112px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-muted"
                aria-label="Ver perfil"
                disabled={pending}
              >
                <Link href={`/friends/${friend.username}`}>
                  <User className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Ver perfil</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-muted"
                aria-label="Enviar mensaje"
                disabled={pending}
              >
                <Link href={`/chat/${friend.id}`}>
                  <MessageCircle className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Enviar mensaje</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Eliminar amistad"
                disabled={pending}
                onClick={() => setConfirm('remove')}
              >
                <UserMinus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Eliminar amistad</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="Bloquear"
                disabled={pending}
                onClick={() => setConfirm('block')}
              >
                <Ban className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Bloquear</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Remove confirmation */}
      <AlertDialog open={confirm === 'remove'} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a @{friend.username} de tus amigos?</AlertDialogTitle>
            <AlertDialogDescription>
              Van a dejar de ser amigos, pero podés volver a enviarle una solicitud cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirm(null)
                run(removeFriend(friend.id), 'Amistad eliminada.')
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block confirmation */}
      <AlertDialog open={confirm === 'block'} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Bloquear a @{friend.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              El bloqueo es silencioso: esa persona no va a saber que la bloqueaste. Van a dejar de
              verse mutuamente en la app. Si eran amigos, se elimina la amistad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirm(null)
                run(blockUser(friend.id), 'Usuario bloqueado.')
              }}
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
