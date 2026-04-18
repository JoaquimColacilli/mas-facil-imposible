'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { MoreVertical, User, MessageCircle, UserMinus, Ban } from 'lucide-react'
import { toast } from 'sonner'
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
      <Avatar className="w-12 h-12 shrink-0">
        {friend.avatar_url && <AvatarImage src={friend.avatar_url} alt={`@${friend.username}`} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {friend.nickname ?? friend.username}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Más opciones"
            disabled={pending}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={`/friends/${friend.username}`}>
              <User className="w-4 h-4 mr-2" />
              Ver perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled title="Disponible en breve" className="cursor-not-allowed opacity-60">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar mensaje
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirm('remove')}
            className="cursor-pointer"
          >
            <UserMinus className="w-4 h-4 mr-2" />
            Eliminar amistad
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirm('block')}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <Ban className="w-4 h-4 mr-2" />
            Bloquear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
