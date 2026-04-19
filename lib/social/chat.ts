import type { RelationshipState } from './relationship'

/**
 * True when the viewer can send messages on this conversation right now.
 * False for ex-friends (read-only) and blocked_by_me (read-only banner).
 * blocked_by_them never reaches this check — the page 404s before render.
 */
export function canSendMessage(state: RelationshipState): boolean {
  return state === 'friends'
}

/**
 * Human-readable day bucket for grouping messages in the feed. Uses the local
 * timezone of the browser so "Hoy" / "Ayer" match what the user perceives.
 */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(d, now)) return 'Hoy'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, yesterday)) return 'Ayer'

  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

/** HH:mm formatted for message bubbles. */
export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

/** Relative timestamp for the inbox ("hace 3m", "hace 2h", "ayer", "15 abr"). */
export function relativeInboxTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin}m`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `hace ${diffHour}h`

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(then, yesterday)) return 'ayer'

  return then.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

/** es-AR pluralization for the "new messages" chip. */
export function newMessagesChipLabel(count: number): string {
  return count === 1 ? '↓ 1 mensaje nuevo' : `↓ ${count} mensajes nuevos`
}
