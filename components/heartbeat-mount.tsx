'use client'

import { useHeartbeat } from '@/hooks/use-heartbeat'

/**
 * Wrapper client-only para el heartbeat de presence. Se monta una única vez
 * en app/(app)/layout.tsx con enabled=true. No renderiza nada.
 */
export function HeartbeatMount() {
  useHeartbeat(true)
  return null
}
