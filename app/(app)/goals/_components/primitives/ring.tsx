'use client'

import { useEffect, useState } from 'react'

interface RingProps {
  pct: number
  size?: number
  stroke?: number
  color: string
  children?: React.ReactNode
  /** Accessible label for the progressbar role. */
  label?: string
}

export function Ring({ pct, size = 56, stroke = 6, color, children, label }: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const target = c - (c * Math.min(100, Math.max(0, pct))) / 100

  // Animate from full circle (0%) to the target offset on mount.
  const [offset, setOffset] = useState(c)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div
        className="absolute inset-0 grid place-items-center font-mono font-semibold tabular-nums"
        style={{ fontSize: Math.max(10, size * 0.22) }}
      >
        {children ?? `${Math.round(pct)}%`}
      </div>
    </div>
  )
}
