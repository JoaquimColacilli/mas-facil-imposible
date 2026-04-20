'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Send, Loader2, Smile, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

const MAX_CHARS = 4000
const WARN_THRESHOLD = 200

// Emoji picker lazy-loaded. The full emoji-mart module (~80kb gz) only lands
// when the user actually opens the picker.
const EmojiPicker = dynamic(
  () => import('@emoji-mart/react').then((m) => m.default),
  { ssr: false, loading: () => <EmojiPickerSkeleton /> },
)

function EmojiPickerSkeleton() {
  return (
    <div className="flex items-center justify-center w-[320px] h-[360px] bg-background">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  )
}

export interface ReplyingTo {
  id: string
  /** Texto a mostrar en la barra de preview, ej: "Respondiendo a @joaco". */
  label: string
  /** Texto del mensaje quoted (ya collapseado a 1 línea si soft-deleted). */
  preview: string
}

interface ChatComposerProps {
  /** Fire-and-forget submit. Parent builds the optimistic temp, enqueues the
   *  network send, and handles resolve/failure. Composer only owns the input. */
  onOptimisticSend: (body: string, replyToMessageId: string | null) => void
  disabled?: boolean
  /** Llamar on keystroke con throttle interno. No-op si no se pasa. */
  onTyping?: () => void
  /** Llamar para emitir typing:false (blur, empty, successful send). No-op si no se pasa. */
  onStopTyping?: () => void
  /** Mensaje al que se está respondiendo. Null = modo normal. */
  replyingTo?: ReplyingTo | null
  /** Cancel del reply-mode (X en la barra, o después de enviar). */
  onCancelReply?: () => void
}

export function ChatComposer({
  onOptimisticSend,
  disabled,
  onTyping,
  onStopTyping,
  replyingTo,
  onCancelReply,
}: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobile()
  const { resolvedTheme } = useTheme()

  // Auto-grow the textarea up to ~6 rows.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = '0px'
    const max = 144 // ~6 rows at text-sm
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`
  }, [value])

  // Cuando entra en modo reply, auto-focus al textarea.
  // requestAnimationFrame para que la barra de preview ya esté pintada antes
  // del focus — sino el layout shift cancela el focus en la primera vuelta.
  useEffect(() => {
    if (!replyingTo) return
    const raf = requestAnimationFrame(() => {
      taRef.current?.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [replyingTo])

  const canSend = !disabled && value.trim().length > 0 && value.length <= MAX_CHARS

  // Optimistic submit: sync visual flow. Parent takes over the network round-trip
  // so the composer never "blocks" on send — the user can keep typing while the
  // previous message is in-flight (serialized queue lives in conversation-client).
  const handleSend = useCallback(() => {
    if (!canSend) return
    const body = value
    const replyId = replyingTo?.id ?? null
    setValue('')
    onStopTyping?.()
    onCancelReply?.()
    onOptimisticSend(body, replyId)
    // Re-focus so typing can continue without mouse.
    requestAnimationFrame(() => taRef.current?.focus())
  }, [canSend, value, onOptimisticSend, onStopTyping, replyingTo, onCancelReply])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    // Escape cancela el reply (si está activo).
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault()
      onCancelReply?.()
    }
  }

  function insertAtCursor(text: string) {
    const ta = taRef.current
    if (!ta) {
      setValue((v) => v + text)
      return
    }
    const start = ta.selectionStart ?? value.length
    const end = ta.selectionEnd ?? value.length
    const next = value.slice(0, start) + text + value.slice(end)
    setValue(next)
    // Reposicionar cursor después del emoji insertado.
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function handleEmojiSelect(emoji: { native: string }) {
    if (!emoji?.native) return
    insertAtCursor(emoji.native)
    onTyping?.()
    // En mobile cerramos el drawer para que el user vea el textarea.
    if (isMobile) setEmojiOpen(false)
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

  const pickerTheme = resolvedTheme === 'dark' ? 'dark' : 'light'

  return (
    <div className="border-t border-border bg-background">
      {/* Reply preview — arriba del input row. */}
      {replyingTo && (
        <div className="px-3 pt-2 pb-1 flex items-start gap-2">
          <div className="w-1 self-stretch rounded-full bg-primary shrink-0" />
          <div className="flex-1 min-w-0 py-0.5">
            <p className="text-[11px] font-semibold text-primary">{replyingTo.label}</p>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.preview}</p>
          </div>
          <button
            type="button"
            onClick={() => onCancelReply?.()}
            className="shrink-0 rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Cancelar respuesta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="px-3 py-2.5">
        <div className="flex items-end gap-2">
          {/* Emoji picker trigger — Popover en desktop, Drawer en mobile. */}
          {isMobile ? (
            <Drawer open={emojiOpen} onOpenChange={setEmojiOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label="Insertar emoji"
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader className="sr-only">
                  <DrawerTitle>Seleccioná un emoji</DrawerTitle>
                </DrawerHeader>
                <div className="flex justify-center pb-4">
                  <EmojiPickerInstance theme={pickerTheme} onSelect={handleEmojiSelect} />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label="Insertar emoji"
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="p-0 w-auto border-none bg-transparent shadow-none"
                sideOffset={8}
              >
                <EmojiPickerInstance theme={pickerTheme} onSelect={handleEmojiSelect} />
              </PopoverContent>
            </Popover>
          )}

          <textarea
            ref={taRef}
            rows={1}
            value={value}
            maxLength={MAX_CHARS}
            onChange={(e) => {
              const next = e.target.value
              setValue(next)
              // Ajuste A: textarea vacío → stop inmediato, sin esperar idle timeout.
              if (next.length === 0) onStopTyping?.()
              else onTyping?.()
            }}
            onBlur={() => onStopTyping?.()}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? 'Escribí tu respuesta…' : 'Escribí un mensaje…'}
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
            <Send className="w-4 h-4" />
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
    </div>
  )
}

function EmojiPickerInstance({
  theme,
  onSelect,
}: {
  theme: 'light' | 'dark'
  onSelect: (emoji: { native: string }) => void
}) {
  const [data, setData] = useState<unknown>(null)

  // Data es ~52kb gz — también lazy para no inflar el bundle inicial.
  useEffect(() => {
    let cancelled = false
    import('@emoji-mart/data').then((m) => {
      if (!cancelled) setData(m.default)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) return <EmojiPickerSkeleton />

  // emoji-mart usa Shadow DOM; los custom properties sí heredan a través del
  // shadow boundary. Aplicamos overrides en un wrapper inline para alinear
  // el picker con los tokens OKLCH del app (bug de contraste del buscador en
  // dark mode: los defaults RGB de emoji-mart eran casi negro sobre negro).
  // Los valores RGB son aproximaciones de los oklch() del tema MFI.
  const themeVars =
    theme === 'dark'
      ? ({
          '--rgb-background': '45 46 54',
          '--rgb-input': '55 56 64',
          '--rgb-color': '241 240 235',
          '--rgb-accent': '110 168 130',
          '--color-border': 'rgb(63 64 72)',
          '--color-border-over': 'rgb(80 82 92)',
        } as React.CSSProperties)
      : ({
          '--rgb-background': '255 255 255',
          '--rgb-input': '243 240 235',
          '--rgb-color': '28 30 40',
          '--rgb-accent': '70 133 95',
          '--color-border': 'rgb(229 226 220)',
          '--color-border-over': 'rgb(210 206 198)',
        } as React.CSSProperties)

  return (
    <div style={themeVars}>
      <EmojiPicker
        data={data}
        onEmojiSelect={onSelect}
        theme={theme}
        locale="es"
        previewPosition="none"
        skinTonePosition="search"
        navPosition="top"
      />
    </div>
  )
}
