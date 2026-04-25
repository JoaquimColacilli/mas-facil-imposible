'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  pct: number
  /** Tailwind-friendly tone. Maps to the project palette. */
  tone?: 'emerald' | 'amber' | 'rose'
  height?: number
  milestones?: number[]
  className?: string
}

const TONE_CSS: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
}

export function ProgressBar({
  pct,
  tone = 'emerald',
  height = 8,
  milestones = [25, 50, 75],
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div
      className={cn('relative w-full rounded-full bg-muted overflow-hidden', className)}
      style={{ height }}
    >
      <div
        className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out', TONE_CSS[tone])}
        style={{ width: `${clamped}%` }}
      />
      {milestones.map((m) => (
        <div
          key={m}
          className="absolute top-1/2 -translate-y-1/2 w-px bg-background/70"
          style={{ left: `${m}%`, height: height + 4 }}
        />
      ))}
    </div>
  )
}
