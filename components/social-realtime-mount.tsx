'use client'

import { useSocialRealtime } from '@/hooks/use-social-realtime'

interface SocialRealtimeMountProps {
  viewerId: string
}

/**
 * Mounts the global social realtime subscription.
 * Rendered once in `app/(app)/layout.tsx`. No visual output.
 */
export function SocialRealtimeMount({ viewerId }: SocialRealtimeMountProps) {
  useSocialRealtime(viewerId)
  return null
}
