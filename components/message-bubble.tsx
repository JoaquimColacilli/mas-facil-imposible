'use client'

import { useState } from 'react'
import { MoreVertical, Trash2, Loader2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { ReadReceipt } from '@/components/read-receipt'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { timeLabel } from '@/lib/social/chat'
import { deleteMessage } from '@/app/(app)/chat/actions'
import type { Message } from '@/lib/types'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isDeleted = message.deleted_at !== null

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteMessage(message.id)
    setDeleting(false)
    setConfirmOpen(false)
    if (!res.ok) {
      toast.error(res.error)
    }
    // Realtime UPDATE comes back; no local state change needed here.
  }

  return (
    <div className={cn('flex w-full', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group relative flex flex-col gap-0.5 max-w-[75%] sm:max-w-[65%] rounded-2xl px-3 py-2 shadow-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {isDeleted ? (
          <p
            className={cn(
              'text-sm italic whitespace-pre-wrap break-words',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            Mensaje eliminado
          </p>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        )}
        <div
          className={cn(
            'flex items-center gap-1 self-end text-[10px] leading-none mt-0.5',
            isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground',
          )}
        >
          {/* suppressHydrationWarning: Intl.DateTimeFormat('es-AR') produces a
              regular space on Node (SSR) and NBSP on V8 (client) before "p. m.".
              Visually identical, byte-different — React flags a mismatch we
              can safely suppress because the rendered timestamp is the same. */}
          <span suppressHydrationWarning>{timeLabel(message.created_at)}</span>
          {isOwn && !isDeleted && <ReadReceipt readAt={message.read_at} />}
          {isOwn && !isDeleted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Opciones del mensaje"
                  className={cn(
                    'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity',
                    'rounded-full p-0.5 hover:bg-white/20 cursor-pointer',
                  )}
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={() => setConfirmOpen(true)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este mensaje?</AlertDialogTitle>
              <AlertDialogDescription>
                Va a quedar como “Mensaje eliminado” para ambos lados. No podés deshacerlo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                asChild
                disabled={deleting}
              >
                <Button
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Eliminar'}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
