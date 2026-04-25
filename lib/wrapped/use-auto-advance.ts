'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

interface UseWrappedAutoAdvanceParams {
  current: number
  total: number
  slideMs: number
  autoAdvance: boolean
  /** Called when the timer fires for the active slide. Usually goTo(current+1). */
  onAdvance: () => void
  /** Array of refs to each segment's `.pg-fill` element (one per slide). */
  fillRefs: MutableRefObject<Array<HTMLDivElement | null>>
  /**
   * If true, slide index 0 doesn't auto-advance — it waits for the first
   * user interaction. Used by mobile (Tocá para empezar) and not by desktop.
   */
  skipFirstSlide?: boolean
  /**
   * If true, the last slide (index === total - 1) doesn't auto-advance and
   * doesn't auto-close the overlay. The user dwells on the final card until
   * they explicitly close or pick another slide. Its progress segment is
   * snapped to full so the UI reads as "done".
   */
  stopOnLastSlide?: boolean
}

interface UseWrappedAutoAdvanceReturn {
  paused: boolean
  togglePause: () => void
  pause: () => void
  resume: () => void
}

/**
 * Drives the story-mode timer + per-segment progress fills shared between
 * mobile (`WrappedStory`) and desktop (`WrappedDesktop`).
 *
 * Two responsibilities:
 *
 * 1. **Per-segment normalization on `current` change.** Iterates every fill
 *    in `fillRefs` and snaps it: index < current → scaleX(1) (done), index ===
 *    current → scaleX(0) (active resets, RAF takes over), index > current →
 *    scaleX(0) (pending). This fixes the bug where leaving slide N mid-fill
 *    would leave its segment frozen at e.g. 50% — the navigation forward now
 *    snaps it to 100%, navigating back snaps it to 0%.
 *
 * 2. **Auto-advance + pause.** A `setTimeout(slideMs)` calls `onAdvance` and
 *    a RAF loop fills the active segment. `pause()` stops both and remembers
 *    how much time was already consumed; `resume()` re-anchors the timer to
 *    pick up where it left off (without restarting the slide from 0).
 *
 * `paused` is exposed for UI (icon swap on the pause/play button); `pause` /
 * `resume` are exposed so mobile can wire its hold-gesture to the same engine.
 */
export function useWrappedAutoAdvance({
  current,
  total,
  slideMs,
  autoAdvance,
  onAdvance,
  fillRefs,
  skipFirstSlide = false,
  stopOnLastSlide = false,
}: UseWrappedAutoAdvanceParams): UseWrappedAutoAdvanceReturn {
  const [paused, setPaused] = useState(false)

  const advanceTimerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const slideStartRef = useRef(0)
  const consumedRef = useRef(0)
  const pausedRef = useRef(false)

  // Latest values without re-creating timers when callers rebind callbacks.
  const onAdvanceRef = useRef(onAdvance)
  onAdvanceRef.current = onAdvance
  const slideMsRef = useRef(slideMs)
  slideMsRef.current = slideMs

  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const clearTimers = useCallback(() => {
    if (advanceTimerRef.current != null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const tickProgress = useCallback(() => {
    const fill = fillRefs.current[current]
    if (!fill) return
    const p = Math.min(1, (performance.now() - slideStartRef.current) / slideMsRef.current)
    fill.style.transform = `scaleX(${p})`
    consumedRef.current = p
    if (p < 1 && !pausedRef.current) {
      rafRef.current = requestAnimationFrame(tickProgress)
    }
  }, [current, fillRefs])

  // On every `current` change: snap all segments to their canonical position
  // (done / active / pending), then arm a fresh timer + RAF if conditions
  // allow. Critically, `paused` is NOT in deps — pause/resume manipulate
  // timers imperatively so resuming doesn't re-trigger this effect and
  // restart the slide from 0.
  useEffect(() => {
    clearTimers()
    slideStartRef.current = performance.now()
    consumedRef.current = 0

    const isLast = current === total - 1

    fillRefs.current.forEach((fill, i) => {
      if (!fill) return
      if (i < current) fill.style.transform = 'scaleX(1)'
      else if (i === current && isLast && stopOnLastSlide) {
        // Final slide with the dwell-forever behavior: snap the active
        // segment to full so the progress bar reads as "done".
        fill.style.transform = 'scaleX(1)'
        consumedRef.current = 1
      } else fill.style.transform = 'scaleX(0)'
    })

    if (!autoAdvance || pausedRef.current || reducedMotion.current) return
    if (skipFirstSlide && current === 0) return
    if (stopOnLastSlide && isLast) return
    advanceTimerRef.current = window.setTimeout(() => {
      onAdvanceRef.current()
    }, slideMsRef.current)
    rafRef.current = requestAnimationFrame(tickProgress)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, autoAdvance, skipFirstSlide, stopOnLastSlide, total])

  const pause = useCallback(() => {
    if (pausedRef.current) return
    pausedRef.current = true
    setPaused(true)
    clearTimers()
  }, [clearTimers])

  const resume = useCallback(() => {
    if (!pausedRef.current) return
    pausedRef.current = false
    setPaused(false)
    if (!autoAdvance || reducedMotion.current) return
    if (skipFirstSlide && current === 0) return
    if (stopOnLastSlide && current === total - 1) return
    const remaining = Math.max(200, slideMsRef.current * (1 - consumedRef.current))
    slideStartRef.current = performance.now() - slideMsRef.current * consumedRef.current
    advanceTimerRef.current = window.setTimeout(() => {
      onAdvanceRef.current()
    }, remaining)
    rafRef.current = requestAnimationFrame(tickProgress)
  }, [autoAdvance, current, skipFirstSlide, stopOnLastSlide, tickProgress, total])

  const togglePause = useCallback(() => {
    if (pausedRef.current) resume()
    else pause()
  }, [pause, resume])

  return { paused, togglePause, pause, resume }
}
