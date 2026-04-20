'use client'

import {
  Sprout,
  PiggyBank,
  TrendingUp,
  Medal,
  Crown,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BadgeTier {
  id: 'novato' | 'ahorrista' | 'inversor' | 'veterano' | 'mentor'
  label: string
  min: number
  color: string
  Icon: LucideIcon
}

/** Ordered lowest → highest. `badgeFor()` walks from top until the
 *  user's karma meets the threshold. */
export const BADGE_TIERS: BadgeTier[] = [
  {
    id: 'novato',
    label: 'Novato',
    min: 0,
    color: 'oklch(0.55 0.008 260)',
    Icon: Sprout,
  },
  {
    id: 'ahorrista',
    label: 'Ahorrista',
    min: 100,
    color: 'oklch(0.55 0.12 230)',
    Icon: PiggyBank,
  },
  {
    id: 'inversor',
    label: 'Inversor',
    min: 500,
    color: 'oklch(0.55 0.14 295)',
    Icon: TrendingUp,
  },
  {
    id: 'veterano',
    label: 'Veterano',
    min: 2000,
    color: 'oklch(0.60 0.10 65)',
    Icon: Medal,
  },
  {
    id: 'mentor',
    label: 'Mentor',
    min: 5000,
    color: 'oklch(0.50 0.10 155)',
    Icon: Crown,
  },
]

export function badgeFor(karma: number): BadgeTier {
  let tier = BADGE_TIERS[0]
  for (const t of BADGE_TIERS) {
    if (karma >= t.min) tier = t
  }
  return tier
}

interface Props {
  /** Null → user opted out of `show_badges`; renders nothing. */
  karma: number | null | undefined
  size?: 'xs' | 'sm'
  showLabel?: boolean
  showKarma?: boolean
  className?: string
}

/** Inline badge for a user's community level. Icon lives inside a tonal
 *  circle; the icon itself recolors via `currentColor` through a CSS mask
 *  so it stays crisp in light/dark without needing light/dark variants. */
export function BadgePill({
  karma,
  size = 'xs',
  showLabel = true,
  showKarma = false,
  className,
}: Props) {
  if (karma === null || karma === undefined) return null
  const tier = badgeFor(karma)
  const Icon = tier.Icon
  const iconPx = size === 'sm' ? 11 : 9
  const ringPx = size === 'sm' ? 18 : 15
  const labelSize = size === 'sm' ? 'text-[12px]' : 'text-[10.5px]'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium whitespace-nowrap',
        labelSize,
        className,
      )}
      style={{ color: tier.color }}
      title={`${tier.label} · ${karma} karma`}
    >
      <span
        className="rounded-full grid place-items-center shrink-0"
        style={{
          width: ringPx,
          height: ringPx,
          background: `color-mix(in oklch, ${tier.color} 16%, transparent)`,
          border: `1px solid color-mix(in oklch, ${tier.color} 28%, transparent)`,
        }}
      >
        <Icon
          aria-hidden
          size={iconPx}
          strokeWidth={2.2}
          style={{ color: tier.color }}
        />
      </span>
      {showLabel && <span>{tier.label}</span>}
      {showKarma && (
        <span className="font-mono opacity-75">
          · {new Intl.NumberFormat('es-AR').format(karma)}
        </span>
      )}
    </span>
  )
}
