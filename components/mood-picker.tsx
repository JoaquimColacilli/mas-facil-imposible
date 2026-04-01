'use client'

import { cn } from '@/lib/utils'

const MOOD_EMOJIS = ['😊', '😎', '🎯', '💰', '🔥', '✨', '🚀', '💪', '🎉', '📈', '🧘', '☕', '💡', '🏆', '❤️']

interface MoodPickerProps {
  emoji: string | null
  text: string | null
  onEmojiChange: (emoji: string | null) => void
  onTextChange: (text: string | null) => void
}

export function MoodPicker({ emoji, text, onEmojiChange, onTextChange }: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Preview */}
      {(emoji || text) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
          {emoji && <span className="text-lg">{emoji}</span>}
          {text && <span className="text-sm text-foreground">{text}</span>}
          {!text && <span className="text-sm text-muted-foreground italic">Sin estado</span>}
        </div>
      )}

      {/* Emoji grid */}
      <div className="flex flex-wrap gap-1">
        {MOOD_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onEmojiChange(emoji === e ? null : e)}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all duration-100',
              'hover:bg-muted hover:scale-110',
              emoji === e && 'bg-primary/15 ring-1 ring-primary scale-110',
            )}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Text input */}
      <input
        type="text"
        value={text ?? ''}
        onChange={(e) => onTextChange(e.target.value || null)}
        placeholder="¿Qué estás haciendo?"
        maxLength={30}
        className="h-9 px-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  )
}
