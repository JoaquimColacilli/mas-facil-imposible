import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReadReceiptProps {
  /** Solo se renderea en mensajes propios (isOwn=true). Sin tildes en mensajes del peer. */
  readAt: string | null
  className?: string
}

/**
 * ✓  — enviado, peer aún no leyó. Hereda color del contenedor (bubble propio,
 *       typ. text-primary-foreground/60).
 * ✓✓ — leído por el peer. Azul sky-300 para contraste sobre bubble primary
 *       tanto en light como dark mode.
 */
export function ReadReceipt({ readAt, className }: ReadReceiptProps) {
  if (readAt) {
    return (
      <CheckCheck
        aria-label="Leído"
        className={cn('w-3.5 h-3.5 shrink-0 text-sky-300', className)}
      />
    )
  }
  return (
    <Check aria-label="Enviado" className={cn('w-3.5 h-3.5 shrink-0', className)} />
  )
}
