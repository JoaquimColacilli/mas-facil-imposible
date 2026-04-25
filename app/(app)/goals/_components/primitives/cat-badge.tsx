'use client'

import { CATEGORY_META } from '@/lib/goals'
import type { GoalCategory } from '@/lib/types'

interface CatBadgeProps {
  category: GoalCategory
  size?: number
}

export function CatBadge({ category, size = 36 }: CatBadgeProps) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.otro
  const Icon = meta.icon
  return (
    <div
      className="rounded-xl grid place-items-center shrink-0"
      style={{
        width: size,
        height: size,
        background: meta.color + '22',
        color: meta.color,
      }}
      aria-label={meta.label}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2} />
    </div>
  )
}
