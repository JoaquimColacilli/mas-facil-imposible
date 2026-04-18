'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { UserPlus, UserCheck, X, Check, Ban } from 'lucide-react'
import { toast } from 'sonner'
import type { RelationshipState } from '@/lib/social/relationship'
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
} from '@/app/(app)/friends/actions'

interface FriendRequestButtonProps {
  state: RelationshipState
  /** Required when state is request_sent or request_received. */
  requestId?: string
  /** Username for display in confirmations and as the lookup key for sendFriendRequest. */
  targetUsername: string | null
  /** UUID for state-changing operations (remove/block/unblock). */
  targetId: string
  /** Compact variant for use inside friend cards. */
  compact?: boolean
}

export function FriendRequestButton({
  state,
  requestId,
  targetUsername,
  targetId,
  compact = false,
}: FriendRequestButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmAction, setConfirmAction] = useState<null | 'remove' | 'block'>(null)

  function handle<T>(promise: Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await promise
      if (!result.ok) {
        toast.error(result.error ?? 'Algo salió mal.')
        return
      }
      toast.success(successMsg)
      router.refresh()
    })
  }

  // ─── stranger ────────────────────────────────────────────────────────────
  if (state === 'stranger') {
    return (
      <Button
        size={compact ? 'sm' : 'default'}
        className="gap-1.5"
        disabled={pending || !targetUsername}
        onClick={() => {
          if (!targetUsername) return
          handle(sendFriendRequest(targetUsername), 'Solicitud enviada.')
        }}
      >
        <UserPlus className="w-4 h-4" />
        {pending ? 'Enviando…' : 'Enviar solicitud'}
      </Button>
    )
  }

  // ─── request_sent (by me) ────────────────────────────────────────────────
  if (state === 'request_sent') {
    return (
      <div className="flex items-center gap-2">
        <Button size={compact ? 'sm' : 'default'} variant="secondary" disabled className="gap-1.5">
          <Check className="w-4 h-4" />
          Solicitud enviada
        </Button>
        <Button
          size={compact ? 'sm' : 'default'}
          variant="outline"
          disabled={pending || !requestId}
          onClick={() => requestId && handle(cancelFriendRequest(requestId), 'Solicitud cancelada.')}
        >
          {pending ? 'Cancelando…' : 'Cancelar'}
        </Button>
      </div>
    )
  }

  // ─── request_received (from them) ────────────────────────────────────────
  if (state === 'request_received') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size={compact ? 'sm' : 'default'}
          className="gap-1.5"
          disabled={pending || !requestId}
          onClick={() => requestId && handle(acceptFriendRequest(requestId), '¡Ahora son amigos!')}
        >
          <Check className="w-4 h-4" />
          Aceptar
        </Button>
        <Button
          size={compact ? 'sm' : 'default'}
          variant="outline"
          disabled={pending || !requestId}
          onClick={() => requestId && handle(rejectFriendRequest(requestId), 'Solicitud rechazada.')}
        >
          <X className="w-4 h-4" />
          Rechazar
        </Button>
      </div>
    )
  }

  // ─── friends ─────────────────────────────────────────────────────────────
  if (state === 'friends') {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button size={compact ? 'sm' : 'default'} variant="secondary" disabled className="gap-1.5">
            <UserCheck className="w-4 h-4" />
            Sos amigo
          </Button>
          <Button
            size={compact ? 'sm' : 'default'}
            variant="outline"
            onClick={() => setConfirmAction('remove')}
            disabled={pending}
          >
            Eliminar
          </Button>
          <Button
            size={compact ? 'sm' : 'default'}
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmAction('block')}
            disabled={pending}
          >
            <Ban className="w-4 h-4" />
          </Button>
        </div>

        <AlertDialog open={confirmAction === 'remove'} onOpenChange={(o) => !o && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar a @{targetUsername} de tus amigos?</AlertDialogTitle>
              <AlertDialogDescription>
                Van a dejar de ser amigos, pero podés volver a enviarle una solicitud cuando quieras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => {
                  setConfirmAction(null)
                  handle(removeFriend(targetId), 'Amistad eliminada.')
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmAction === 'block'} onOpenChange={(o) => !o && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Bloquear a @{targetUsername}?</AlertDialogTitle>
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
                  setConfirmAction(null)
                  handle(blockUser(targetId), 'Usuario bloqueado.')
                }}
              >
                Bloquear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // ─── blocked_by_me ───────────────────────────────────────────────────────
  if (state === 'blocked_by_me') {
    return (
      <Button
        size={compact ? 'sm' : 'default'}
        variant="outline"
        disabled={pending}
        onClick={() => handle(unblockUser(targetId), 'Usuario desbloqueado.')}
      >
        {pending ? 'Desbloqueando…' : 'Desbloquear'}
      </Button>
    )
  }

  // ─── self / blocked_by_them ──────────────────────────────────────────────
  // self: mostrar mensaje neutro. blocked_by_them no debería llegar acá (la
  // page que renderiza este componente debió hacer notFound() antes).
  if (state === 'self') {
    return (
      <Button size={compact ? 'sm' : 'default'} variant="secondary" disabled>
        Este es tu perfil
      </Button>
    )
  }

  return null
}
