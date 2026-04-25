'use client'

import { cn } from '@/lib/utils'
import {
  DESKTOP_SLIDE_RAIL_COLORS,
  DESKTOP_SLIDE_TITLES,
} from './desktop-slides'

interface DesktopRailProps {
  current: number
  total: number
  personalityColor: string
  /** Call with the target index when a rail tile is clicked. */
  onJump: (index: number) => void
}

/**
 * Thumbnail rail — 10 static tiles (number + title + personality-colored chip).
 * Intentionally lightweight: no mini-preview render (would 10× the DOM for
 * something users scan peripherally). If we later want true previews, swap
 * each tile's chip for a scaled slide render.
 */
export function DesktopRail({ current, total, personalityColor, onJump }: DesktopRailProps) {
  return (
    <nav
      aria-label="Navegación de slides"
      className="flex items-stretch justify-center gap-2 px-4"
    >
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current
        const done = i < current
        const title = DESKTOP_SLIDE_TITLES[i] ?? `Slide ${i + 1}`
        const baseColor =
          DESKTOP_SLIDE_RAIL_COLORS[i] || personalityColor
        const chipColor = i === 8 ? personalityColor : baseColor
        return (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Ir a slide ${i + 1}: ${title}`}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'group relative flex flex-col justify-between w-[92px] h-[60px] rounded-lg px-2.5 py-2 text-left overflow-hidden transition-all',
              'border',
              active
                ? 'border-white/80 bg-white/10'
                : 'border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'font-mono text-[10px] tracking-widest',
                  active ? 'text-white' : done ? 'text-white/60' : 'text-white/45',
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                aria-hidden
                className="w-2 h-2 rounded-sm"
                style={{ background: chipColor }}
              />
            </div>
            <div
              className={cn(
                'font-serif font-medium text-[11px] leading-tight truncate',
                active ? 'text-white' : 'text-white/70',
              )}
              title={title}
            >
              {title}
            </div>
          </button>
        )
      })}
    </nav>
  )
}
