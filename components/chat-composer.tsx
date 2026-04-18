'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { sendMessage } from '@/app/(app)/chat/actions'
import type { Message } from '@/lib/types'

const MAX_CHARS = 4000
const WARN_THRESHOLD = 200

interface ChatComposerProps {
  conversationId: string
  onSent: (message: Message) => void
  disabled?: boolean
}

export function ChatComposer({ conversationId, onSent, disabled }: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow the textarea up to ~6 rows.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = '0px'
    const max = 144 // ~6 rows at text-sm
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`
  }, [value])

  const canSend = !disabled && !sending && value.trim().length > 0 && value.length <= MAX_CHARS

  const handleSend = useCallback(async () => {
    if (!canSend) return
    const body = value
    setSending(true)
    const res = await sendMessage(conversationId, body)
    setSending(false)
    if (!res.ok || !res.data) {
      toast.error(res.ok ? 'No se pudo enviar.' : res.error)
      return
    }
    setValue('')
    onSent(res.data)
    // Re-focus so typing can continue without mouse.
    requestAnimationFrame(() => taRef.current?.focus())
  }, [canSend, value, conversationId, onSent])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const remaining = MAX_CHARS - value.length
  const showCounter = remaining <= WARN_THRESHOLD

  if (disabled) {
    return (
      <div className="px-3 py-3 border-t border-border bg-background">
        <p className="text-center text-sm text-muted-foreground">
          No podés enviar mensajes en esta conversación.
        </p>
      </div>
    )
  }

  return (
    <div className="px-3 py-2.5 border-t border-border bg-background">
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          maxLength={MAX_CHARS}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje…"
          className={cn(
            'flex-1 min-h-[40px] max-h-36 resize-none rounded-md border border-input bg-transparent',
            'px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="h-10 w-10 shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      {showCounter && (
        <p
          className={cn(
            'text-[10.5px] font-medium mt-1 text-right',
            remaining < 0 ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {remaining} caracteres
        </p>
      )}
    </div>
  )
}
