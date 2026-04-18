'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface FriendsTopbarButtonProps {
  userId: string
}

export function FriendsTopbarButton({ userId }: FriendsTopbarButtonProps) {
  const supabase = createClient()

  const { data: pendingCount = 0 } = useSWR<number>(
    `friend-requests-pending-${userId}`,
    async () => {
      const { count } = await supabase
        .from('friend_requests')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('status', 'pending')
      return count ?? 0
    },
    { refreshInterval: 30_000, revalidateOnFocus: true },
  )

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="h-9 w-9 relative cursor-pointer"
      aria-label="Amigos"
    >
      <Link href={pendingCount > 0 ? '/friends?tab=requests' : '/friends'}>
        <Users className="w-[17px] h-[17px]" />
        {pendingCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-primary border-2 border-background" />
        )}
      </Link>
    </Button>
  )
}
