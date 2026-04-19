'use client'

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

interface SettlePropagateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: 'loan' | 'debt'
  friendUsername: string | null
  loading?: boolean
  onConfirm: (propagate: boolean) => void
}

export function SettlePropagateDialog({
  open,
  onOpenChange,
  kind,
  friendUsername,
  loading,
  onConfirm,
}: SettlePropagateDialogProps) {
  const name = friendUsername ? `@${friendUsername}` : 'tu amigo'
  const title =
    kind === 'loan'
      ? `¿Marcar también como saldado en el lado de ${name}?`
      : `¿Marcar también como saldado en el lado de ${name}?`

  const description =
    kind === 'loan'
      ? `Si elegís "Sí", ${name} va a ver su deuda como pagada y se le registra el gasto automáticamente.`
      : `Si elegís "Sí", ${name} va a ver su cobro como saldado y se le registra el ingreso automáticamente.`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            <br />
            <span className="text-muted-foreground/80 text-[11px] mt-2 block">
              Si elegís "Solo de mi lado", tu amigo va a seguir viéndolo como pendiente.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild disabled={loading}>
            <Button variant="outline" onClick={() => onConfirm(false)} disabled={loading}>
              Solo de mi lado
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild disabled={loading}>
            <Button onClick={() => onConfirm(true)} disabled={loading}>
              Sí, propagar
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
