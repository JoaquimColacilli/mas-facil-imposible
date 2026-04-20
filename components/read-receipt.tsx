import { CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReadReceiptProps {
  /** Solo se renderea en mensajes propios (isOwn=true). Sin tildes en mensajes del peer. */
  readAt: string | null
  className?: string
}

/**
 * ReadReceipt — WhatsApp-style check marks for sent messages.
 *
 * - ✓✓ muted   — enviado, peer aún no leyó.
 * - ✓✓ sky-300 — leído por el peer (read_at IS NOT NULL).
 *
 * Mostrar solo en mensajes propios del viewer. Los del peer no llevan ticks.
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
    <CheckCheck
      aria-label="Enviado"
      className={cn('w-3.5 h-3.5 shrink-0 text-black', className)}
    />
  )
}
