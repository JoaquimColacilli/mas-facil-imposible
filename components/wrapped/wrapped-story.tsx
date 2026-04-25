'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, X, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WrappedData } from '@/lib/wrapped/types'
import { useWrappedAutoAdvance } from '@/lib/wrapped/use-auto-advance'
import { SLIDE_COMPONENTS } from './slides'

const SLIDE_MS = 7000

type LoadingAction = 'share' | 'excel' | 'pdf' | 'wrapped-pdf' | null

interface WrappedStoryProps {
  data: WrappedData
  autoAdvance?: boolean
  showHint?: boolean
  /** Slide to start on. Used to resume cross-device progress. Defaults to 0. */
  initialIndex?: number
  /** Fires whenever the active slide changes (nav, keyboard, auto-advance). */
  onIndexChange?: (index: number) => void
  onClose: () => void
  onShare?: () => void
  onDownloadExcel?: () => void
  onDownloadPDF?: () => void
  onDownloadWrappedPDF?: () => void
  onRestart?: () => void
  loadingAction?: LoadingAction
}

/**
 * Story-mode shell. Mirrors design-refs/wrapped-bundle/wrapped.shell.js in
 * React idioms:
 *   - progress bars top (one per slide, active fills over SLIDE_MS ms)
 *   - tap zones: left 35% → prev, right 65% → next
 *   - hold 220 ms → pause (resumes remaining time on release)
 *   - keyboard: ← prev, → next, Esc close
 *   - prefers-reduced-motion → skip auto-advance (manual only)
 *
 * Auto-advance + per-segment progress fills live in the shared
 * `useWrappedAutoAdvance` hook so mobile and desktop run on the same engine.
 */
export function WrappedStory({
  data,
  autoAdvance = true,
  showHint = true,
  initialIndex = 0,
  onIndexChange,
  onClose,
  onShare,
  onDownloadExcel,
  onDownloadPDF,
  onDownloadWrappedPDF,
  onRestart,
  loadingAction,
}: WrappedStoryProps) {
  const total = SLIDE_COMPONENTS.length
  const clampedInitial = Math.max(0, Math.min(initialIndex, total - 1))
  const [current, setCurrent] = useState(clampedInitial)
  const [hintGone, setHintGone] = useState(clampedInitial > 0)

  const currentRef = useRef(clampedInitial)
  const onIndexChangeRef = useRef(onIndexChange)
  onIndexChangeRef.current = onIndexChange
  const fillRefs = useRef<Array<HTMLDivElement | null>>([])

  const goTo = useCallback(
    (idx: number) => {
      if (idx >= total) {
        // Final slide stays put — user exits via X (or Esc). Still announce
        // the terminal index so the overlay can fire `wrapped_completed`
        // even when the advance came from a tap.
        onIndexChangeRef.current?.(total - 1)
        return
      }
      if (idx < 0) idx = 0
      currentRef.current = idx
      setCurrent(idx)
      onIndexChangeRef.current?.(idx)
    },
    [total],
  )

  const onAdvance = useCallback(() => {
    goTo(currentRef.current + 1)
  }, [goTo])

  const { paused, togglePause, pause, resume } = useWrappedAutoAdvance({
    current,
    total,
    slideMs: SLIDE_MS,
    autoAdvance,
    onAdvance,
    fillRefs,
    skipFirstSlide: true,
    stopOnLastSlide: true,
  })

  const next = useCallback(() => {
    if (!hintGone) setHintGone(true)
    goTo(currentRef.current + 1)
  }, [goTo, hintGone])

  const prev = useCallback(() => {
    if (!hintGone) setHintGone(true)
    goTo(currentRef.current - 1)
  }, [goTo, hintGone])

  // Hold to pause — resumes on release using remaining time.
  const holdTimerRef = useRef<number | null>(null)
  const heldPauseRef = useRef(false)
  const onHoldStart = useCallback(() => {
    holdTimerRef.current = window.setTimeout(() => {
      if (!paused) {
        heldPauseRef.current = true
        pause()
      }
    }, 220)
  }, [pause, paused])
  const onHoldEnd = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    // Only auto-resume if the pause was triggered by this hold gesture —
    // otherwise an explicit pause from the button would be cancelled by a
    // mouseup outside the button.
    if (heldPauseRef.current) {
      heldPauseRef.current = false
      resume()
    }
  }, [resume])

  // Announce the initial slide exactly once on mount — goTo() only fires on
  // transitions, so without this the parent never sees slide `clampedInitial`.
  useEffect(() => {
    onIndexChangeRef.current?.(clampedInitial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync internal `current` when the parent pushes a new `initialIndex`
  // (e.g., the "Volver a ver" CTA resets to 0 after reaching the final
  // slide). Normal in-component navigation keeps them in sync, so this only
  // fires on an external reset.
  useEffect(() => {
    if (initialIndex !== currentRef.current) {
      currentRef.current = clampedInitial
      setCurrent(clampedInitial)
      setHintGone(clampedInitial > 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex])

  // Keyboard navigation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, onClose])

  const SlideComp = SLIDE_COMPONENTS[current]
  const isLast = current === total - 1
  const showShare = current !== total - 1 // last slide has its own share CTA

  return (
    <div className="wrapped-root absolute inset-0 bg-black" style={{ zIndex: 2 }}>
      {/* Slide stage */}
      <div className="absolute inset-0" style={{ zIndex: 5 }}>
        <SlideComp
          data={data}
          active
          onShare={onShare}
          onDownloadExcel={onDownloadExcel}
          onDownloadPDF={onDownloadPDF}
          onDownloadWrappedPDF={onDownloadWrappedPDF}
          onRestart={onRestart}
          loadingAction={loadingAction}
        />
      </div>

      {/* Tap zones — left 35% prev, right 65% next (story convention).
          On the last slide we leave the bottom CTA area free so Compartir /
          Excel / PDF don't fall under the navigation hit-area. */}
      <div
        className={cn(
          'absolute left-0 top-0 w-[35%] tap-zone cursor-pointer',
          isLast ? 'bottom-[220px]' : 'bottom-0',
        )}
        style={{ zIndex: 10 }}
        onClick={prev}
        onMouseDown={onHoldStart}
        onMouseUp={onHoldEnd}
        onMouseLeave={onHoldEnd}
        onTouchStart={onHoldStart}
        onTouchEnd={onHoldEnd}
        aria-label="Slide anterior"
        role="button"
      />
      <div
        className={cn(
          'absolute right-0 top-0 w-[65%] tap-zone cursor-pointer',
          isLast ? 'bottom-[220px]' : 'bottom-0',
        )}
        style={{ zIndex: 10 }}
        onClick={next}
        onMouseDown={onHoldStart}
        onMouseUp={onHoldEnd}
        onMouseLeave={onHoldEnd}
        onTouchStart={onHoldStart}
        onTouchEnd={onHoldEnd}
        aria-label="Slide siguiente"
        role="button"
      />

      {/* Top controls — progress bars + pause/play + X + optional share */}
      <div className="absolute top-6 inset-x-0 px-4 flex items-center gap-3" style={{ zIndex: 20 }}>
        {showShare && onShare && (
          <button
            type="button"
            onClick={onShare}
            className="w-8 h-8 rounded-full grid place-items-center bg-black/20 backdrop-blur text-white/90 hover:bg-black/30"
            aria-label="Compartir"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
        <div className="flex items-center gap-1 flex-1">
          {Array.from({ length: total }).map((_, i) => {
            const done = i < current
            const active = i === current
            return (
              <div
                key={i}
                className={cn('pg-seg', done && 'done', active && 'active')}
              >
                <div
                  className="pg-fill"
                  ref={(el) => {
                    fillRefs.current[i] = el
                  }}
                />
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={togglePause}
          className="w-8 h-8 rounded-full grid place-items-center bg-black/20 backdrop-blur text-white/90 hover:bg-black/30"
          aria-label={paused ? 'Reanudar' : 'Pausar'}
        >
          {paused ? (
            <Play className="w-3.5 h-3.5" strokeWidth={2.2} />
          ) : (
            <Pause className="w-3.5 h-3.5" strokeWidth={2.2} />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full grid place-items-center bg-black/20 backdrop-blur text-white/90 hover:bg-black/30"
          aria-label="Cerrar"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
      </div>

      {/* Hint arrow — disappears on first tap */}
      {showHint && !hintGone && current === 0 && (
        <div
          className="absolute bottom-24 right-5 flex flex-col items-center gap-1 text-white arrow-hint pointer-events-none"
          style={{ zIndex: 12 }}
        >
          <div className="text-[10px] uppercase tracking-wider text-white/80 font-medium">tocá</div>
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/30 grid place-items-center">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      )}

      {isLast /* no-op — reserved slot for future last-slide chrome */}
    </div>
  )
}
