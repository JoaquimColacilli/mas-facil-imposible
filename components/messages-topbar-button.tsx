'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface MessagesTopbarButtonProps {
  userId: string
}

export function MessagesTopbarButton({ userId }: MessagesTopbarButtonProps) {
  const supabase = createClient()

  const { data: unreadCount = 0 } = useSWR<number>(
    `chat-unread-count-${userId}`,
    async () => {
      const { data, error } = await supabase.rpc('get_unread_message_count')
      if (error) return 0
      return (data as number) ?? 0
    },
    { refreshInterval: 30_000, revalidateOnFocus: true },
  )

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="h-9 w-9 relative cursor-pointer"
      aria-label="Mensajes"
    >
      <Link href="/chat">
        <MessageCircle className="w-[17px] h-[17px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-primary border-2 border-background" />
        )}
      </Link>
    </Button>
  )
}
