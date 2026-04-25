'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  format: (v: number) => string
  duration?: number
  className?: string
  style?: React.CSSProperties
  /** Reset counter when this changes (e.g. slide index). */
  trigger?: unknown
}

/**
 * Animated count-up. Writes the final value immediately on reduced-motion so
 * numbers are never blank, then eases in with requestAnimationFrame otherwise.
 */
export function CountUp({
  value,
  format,
  duration = 900,
  className,
  style,
  trigger,
}: CountUpProps) {
  const [current, setCurrent] = useState(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || document.hidden) {
      setCurrent(value)
      return
    }
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setCurrent(Math.round(from + (value - from) * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, trigger])

  return (
    <span className={className} style={style}>
      {format(current)}
    </span>
  )
}
