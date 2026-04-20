'use client'

import { useEffect, useState } from 'react'
import { MoreVertical, Trash2, Loader2, Reply, Copy } from 'lucide-react'
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
  /** Viewer id — para decidir "Vos" vs peer label en el quote header. */
  viewerId: string
  /** Label del peer para mostrar en el quote header cuando quoteó al peer. */
  peerLabel: string
  /** True mientras dura la ventana de highlight post scrollToMessage. */
  highlighted?: boolean
  /** Trigger para empezar a responder este mensaje. Parent levanta el state. */
  onReply?: (message: Message) => void
  /** Click en el quote box → scroll al mensaje original. */
  onQuoteClick?: (messageId: string) => void
}

export function MessageBubble({
  message,
  isOwn,
  viewerId,
  peerLabel,
  highlighted,
  onReply,
  onQuoteClick,
}: MessageBubbleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const isDeleted = message.deleted_at !== null

  // Auto-clear "copied" flag — not functional, just UX nicety for the toast.
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

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

  async function handleCopy() {
    if (isDeleted) return
    try {
      await navigator.clipboard.writeText(message.body)
      setCopied(true)
      toast.success('Mensaje copiado.')
    } catch {
      toast.error('No se pudo copiar.')
    }
  }

  function handleReply() {
    if (isDeleted) return
    onReply?.(message)
  }

  // Quote header: "Vos" si el mensaje quoted lo mandé yo, sino el peerLabel.
  const hasQuote = message.reply_to_message_id !== null
  const quotedSnapshot = message.reply_to
  const quotedSenderLabel = quotedSnapshot
    ? quotedSnapshot.sender_id === viewerId
      ? 'Vos'
      : peerLabel
    : null

  return (
    <div
      id={`msg-${message.id}`}
      data-message-id={message.id}
      className={cn(
        'flex w-full scroll-mt-16 transition-shadow duration-300',
        isOwn ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'group relative flex flex-col gap-0.5 max-w-[75%] sm:max-w-[65%] rounded-2xl px-3 py-2 shadow-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
          highlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        )}
      >
        {/* Quote box — renderizado arriba del body si el mensaje responde a otro. */}
        {hasQuote && (
          <button
            type="button"
            onClick={() =>
              message.reply_to_message_id && onQuoteClick?.(message.reply_to_message_id)
            }
            className={cn(
              'mb-1.5 w-full text-left rounded-md px-2 py-1 border-l-2 transition',
              'hover:brightness-110 cursor-pointer',
              isOwn
                ? 'bg-primary-foreground/15 border-primary-foreground/60'
                : 'bg-primary/10 border-primary',
            )}
          >
            {quotedSnapshot ? (
              <>
                <p
                  className={cn(
                    'text-[11px] font-semibold',
                    isOwn ? 'text-primary-foreground/90' : 'text-primary',
                  )}
                >
                  {quotedSenderLabel}
                </p>
                <p
                  className={cn(
                    'text-[12px] line-clamp-2 break-words',
                    quotedSnapshot.deleted_at
                      ? 'italic opacity-70'
                      : isOwn
                        ? 'text-primary-foreground/80'
                        : 'text-foreground/80',
                  )}
                >
                  {quotedSnapshot.deleted_at
                    ? 'Mensaje eliminado'
                    : (quotedSnapshot.body ?? 'Mensaje eliminado')}
                </p>
              </>
            ) : (
              <p
                className={cn(
                  'text-[12px] italic opacity-70',
                  isOwn ? 'text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                Mensaje eliminado
              </p>
            )}
          </button>
        )}

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
          {!isDeleted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Opciones del mensaje"
                  className={cn(
                    'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity',
                    'rounded-full p-0.5 cursor-pointer',
                    isOwn ? 'hover:bg-white/20' : 'hover:bg-foreground/10',
                  )}
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleReply} className="cursor-pointer">
                  <Reply className="w-3.5 h-3.5 mr-2" />
                  Responder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  {copied ? 'Copiado' : 'Copiar'}
                </DropdownMenuItem>
                {isOwn && (
                  <DropdownMenuItem
                    onClick={() => setConfirmOpen(true)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
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
              <AlertDialogAction asChild disabled={deleting}>
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
