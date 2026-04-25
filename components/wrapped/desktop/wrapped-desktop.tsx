'use client'

/**
 * Desktop editorial Wrapped (lg+). Replaces the phone-mockup approach on
 * wide viewports with a horizontal 16:9 stage.
 *
 * Layout: top progress bars + counter + pause + close, stage with floating
 * left/right arrows, rail of thumbnails underneath. Auto-advances every
 * `SLIDE_MS` (slightly longer than mobile to give the eye more reading
 * time on dense slides like the donut and the sparkline). Pause/play button
 * matches mobile.
 *
 * Stage sizing honors three constraints at once: max 1280px wide, fits inside
 * 100vh minus chrome, keeps 16:9. Short laptops (<520 stage tall) downshift
 * hero type via `--wrapped-hero-scale`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WrappedData } from '@/lib/wrapped/types'
import { PERSONALITIES } from '@/lib/wrapped/personalities'
import { useWrappedAutoAdvance } from '@/lib/wrapped/use-auto-advance'
import { DESKTOP_SLIDE_COMPONENTS } from './desktop-slides'
import { DesktopRail } from './desktop-rail'

type LoadingAction = 'share' | 'wrapped-pdf' | null

interface WrappedDesktopProps {
  data: WrappedData
  initialIndex?: number
  onIndexChange?: (index: number) => void
  onClose: () => void
  onShare?: () => void
  onDownloadWrappedPDF?: () => void
  onRestart?: () => void
  loadingAction?: LoadingAction
}

const SLIDE_MS = 9000
const SHORT_STAGE_HEIGHT = 520

export function WrappedDesktop({
  data,
  initialIndex = 0,
  onIndexChange,
  onClose,
  onShare,
  onDownloadWrappedPDF,
  onRestart,
  loadingAction,
}: WrappedDesktopProps) {
  const total = DESKTOP_SLIDE_COMPONENTS.length
  const clampedInitial = Math.max(0, Math.min(initialIndex, total - 1))
  const [current, setCurrent] = useState(clampedInitial)
  const [heroScale, setHeroScale] = useState<number>(1)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const currentRef = useRef(clampedInitial)
  const onIndexChangeRef = useRef(onIndexChange)
  onIndexChangeRef.current = onIndexChange
  const fillRefs = useRef<Array<HTMLDivElement | null>>([])

  const personalityColor = useMemo(
    () => PERSONALITIES[data.personality]?.g1 ?? 'oklch(0.55 0.12 155)',
    [data.personality],
  )

  const goTo = useCallback(
    (idx: number) => {
      if (idx >= total) {
        // Stay on the final card — user closes explicitly with X / Esc.
        // Still announces the terminal index so the overlay can mark
        // `wrapped_completed`.
        onIndexChangeRef.current?.(total - 1)
        return
      }
      const clamped = Math.max(0, idx)
      currentRef.current = clamped
      setCurrent(clamped)
      onIndexChangeRef.current?.(clamped)
    },
    [total],
  )

  const onAdvance = useCallback(() => {
    goTo(currentRef.current + 1)
  }, [goTo])

  const { paused, togglePause } = useWrappedAutoAdvance({
    current,
    total,
    slideMs: SLIDE_MS,
    autoAdvance: true,
    onAdvance,
    fillRefs,
    skipFirstSlide: false,
    stopOnLastSlide: true,
  })

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  // Announce initial index exactly once on mount — parent needs it to fire
  // wrapped_slide_viewed for the starting slide.
  useEffect(() => {
    onIndexChangeRef.current?.(clampedInitial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync internal `current` when the parent pushes a new `initialIndex`
  // (e.g., the "Volver a ver" CTA resets to 0). Without this effect, the
  // component never re-reads initialIndex after mount and stays on the old
  // slide. Normal in-component nav keeps overlay.slideIndex === current, so
  // the re-set is a no-op in that case.
  useEffect(() => {
    if (initialIndex !== currentRef.current) {
      currentRef.current = clampedInitial
      setCurrent(clampedInitial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex])

  // Keyboard navigation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing inside inputs/textareas/contenteditable (e.g., share
      // dialog). Desktop's modal doesn't currently embed them, but future
      // inline captions might.
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, onClose, togglePause])

  // Stage height observer — triggers hero-scale downshift on short laptops.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      const h = el.clientHeight
      setHeroScale(h < SHORT_STAGE_HEIGHT ? 0.85 : 1)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const SlideComp = DESKTOP_SLIDE_COMPONENTS[current]

  return (
    <div className="wrapped-root relative w-full h-full flex flex-col items-center justify-center px-8 py-10">
      {/* Top bar — animated progress segments + counter + pause + close */}
      <div className="w-full max-w-[1280px] flex items-center gap-4 mb-4">
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
        <div className="font-mono text-[11px] tracking-widest text-white/70 tabular-nums">
          {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={togglePause}
          aria-label={paused ? 'Reanudar' : 'Pausar'}
          className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {paused ? (
            <Play className="w-4 h-4" strokeWidth={2.2} />
          ) : (
            <Pause className="w-4 h-4" strokeWidth={2.2} />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>

      {/* Stage */}
      <div className="relative w-full flex items-center justify-center">
        {/* Left nav arrow */}
        <button
          type="button"
          onClick={prev}
          disabled={current === 0}
          aria-label="Slide anterior"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full grid place-items-center bg-black/30 hover:bg-black/45 backdrop-blur border border-white/15 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
        </button>

        {/* Stage frame — 16:9, capped by viewport height via clamp */}
        <div
          ref={stageRef}
          key={current /* remount the slide on nav so entrance animations re-fire */}
          className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_-30px_rgba(0,0,0,.6)] wrapped-slide-mount"
          style={{
            // Height clamped by available viewport; width follows 16:9 but
            // never exceeds 1280 or 100%.
            height: 'clamp(420px, calc(100vh - 220px), 720px)',
            width: 'min(100%, 1280px, calc(clamp(420px, calc(100vh - 220px), 720px) * 16 / 9))',
            aspectRatio: '16 / 9',
            '--wrapped-hero-scale': heroScale,
          } as React.CSSProperties}
        >
          <SlideComp
            data={data}
            onShare={onShare}
            onDownloadWrappedPDF={onDownloadWrappedPDF}
            onRestart={onRestart}
            loadingAction={loadingAction}
          />
        </div>

        {/* Right nav arrow */}
        <button
          type="button"
          onClick={next}
          aria-label={current === total - 1 ? 'Terminar' : 'Slide siguiente'}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full grid place-items-center bg-black/30 hover:bg-black/45 backdrop-blur border border-white/15 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
        </button>
      </div>

      {/* Rail */}
      <div className="mt-6 w-full max-w-[1280px]">
        <DesktopRail
          current={current}
          total={total}
          personalityColor={personalityColor}
          onJump={goTo}
        />
      </div>
    </div>
  )
}
