import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  visible: boolean
  username: string | null
  className?: string
}

/**
 * Línea de altura fija 20px sobre el composer. Usa visibility/opacity en vez
 * de mount/unmount para no desplazar el feed cuando aparece/desaparece.
 */
export function TypingIndicator({ visible, username, className }: TypingIndicatorProps) {
  const label = username ? `@${username} está escribiendo` : 'Escribiendo'
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'h-5 px-3 md:px-4 flex items-center text-[11.5px] text-muted-foreground transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      {visible && (
        <span className="inline-flex items-center gap-1">
          <span className="truncate">{label}</span>
          <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.2s]" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.1s]" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" />
          </span>
        </span>
      )}
    </div>
  )
}
