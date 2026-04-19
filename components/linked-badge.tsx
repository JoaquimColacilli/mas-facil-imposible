import { Link2, Clock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LinkedBadgeProps {
  /** `friend_id` del registro — si null no se renderiza nada. */
  friendId: string | null
  /** `linked_*_id` del registro — si null => pending confirmación. */
  linkedId: string | null
  /** True si el registro original está marcado como paid. */
  paid: boolean
  /** Username del amigo para tooltip + label. Si null, cae a "amigo". */
  friendUsername: string | null
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Tri-estado:
 *   friendId null                    → null (flow legacy, sin badge).
 *   friendId set, linkedId null      → "Esperando confirmación" (amber).
 *   friendId set, linkedId set, !paid → "Vinculado con @amigo" (emerald).
 *   friendId set, linkedId set, paid → "Confirmado con @amigo" (emerald + ✓).
 */
export function LinkedBadge({
  friendId,
  linkedId,
  paid,
  friendUsername,
  size = 'sm',
  className,
}: LinkedBadgeProps) {
  if (!friendId) return null

  const name = friendUsername ? `@${friendUsername}` : 'amigo'
  const baseCls = cn(
    'inline-flex items-center gap-1 rounded-full font-medium border',
    size === 'md' ? 'text-[11px] px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5',
    className,
  )

  if (!linkedId) {
    return (
      <span
        className={cn(baseCls, 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400')}
        title={`Esperando que ${name} confirme`}
      >
        <Clock className="w-2.5 h-2.5" />
        <span className="truncate">Esperando confirmación</span>
      </span>
    )
  }

  if (paid) {
    return (
      <span
        className={cn(baseCls, 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400')}
        title={`Confirmado con ${name}`}
      >
        <Check className="w-2.5 h-2.5" />
        <span className="truncate">Confirmado con {name}</span>
      </span>
    )
  }

  return (
    <span
      className={cn(baseCls, 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400')}
      title={`Vinculado con ${name}`}
    >
      <Link2 className="w-2.5 h-2.5" />
      <span className="truncate">Vinculado con {name}</span>
    </span>
  )
}
