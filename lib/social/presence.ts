/**
 * Threshold para considerar un user como "online" en listas (friend-card,
 * inbox, perfil público). Heartbeat = 60s + 30s grace = 90s.
 *
 * La conversación activa usa Supabase Presence (channel en vivo) y no esta
 * derivación — ver hooks/use-presence.ts.
 */
export const ONLINE_THRESHOLD_MS = 90_000

export function isOnlineFromLastSeen(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false
  const ts = new Date(lastSeenAt).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < ONLINE_THRESHOLD_MS
}
