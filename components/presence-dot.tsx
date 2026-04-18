import { cn } from '@/lib/utils'

interface PresenceDotProps {
  online: boolean
  /** 'sm' (avatar inline 8px) | 'md' (header 10px). Default sm. */
  size?: 'sm' | 'md'
  className?: string
  /**
   * Si true, muestra el dot incluso cuando offline (gris). Default false:
   * offline = dot ausente (evita ruido visual en listas).
   */
  showOffline?: boolean
}

export function PresenceDot({
  online,
  size = 'sm',
  className,
  showOffline = false,
}: PresenceDotProps) {
  if (!online && !showOffline) return null

  const dims = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'
  const color = online ? 'bg-emerald-500' : 'bg-muted-foreground/40'

  return (
    <span
      aria-label={online ? 'En línea' : 'Desconectado'}
      title={online ? 'En línea' : 'Desconectado'}
      className={cn(
        'inline-block rounded-full ring-2 ring-background',
        dims,
        color,
        className,
      )}
    />
  )
}
