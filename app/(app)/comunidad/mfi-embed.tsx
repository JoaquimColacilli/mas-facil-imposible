'use client'

import { Target, Receipt } from 'lucide-react'
import { formatCurrency, type CommunityPostEmbed } from '@/lib/types'
import { cn } from '@/lib/utils'

const TXN_ACCENT = 'oklch(0.60 0.14 15)'
const GOAL_ACCENT = 'oklch(0.50 0.10 155)'

interface Props {
  data: CommunityPostEmbed
  variant?: 'compact' | 'rich'
  className?: string
}

export function MfiEmbed({ data, variant = 'compact', className }: Props) {
  const isGoal = data.kind === 'goal'
  const accent = isGoal ? GOAL_ACCENT : TXN_ACCENT
  const Icon = isGoal ? Target : Receipt
  const title = data.title

  const mainAmount = isGoal
    ? formatCurrency(data.current_amount, data.currency)
    : formatCurrency(data.amount, data.currency)
  const targetAmount = isGoal
    ? formatCurrency(data.target_amount, data.currency)
    : null
  const pct = isGoal
    ? Math.min(
        100,
        Math.round(
          (data.current_amount / Math.max(data.target_amount, 1)) * 100,
        ),
      )
    : null

  if (variant === 'rich' && isGoal) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-muted/40 p-3',
          className,
        )}
      >
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Target
            className="w-3.5 h-3.5"
            strokeWidth={2.2}
            style={{ color: accent }}
          />
          <span className="font-medium uppercase tracking-wider">
            Meta de MFI
          </span>
          {typeof data.months === 'number' &&
            typeof data.total_months === 'number' && (
              <span className="ml-auto font-mono">
                {data.months}/{data.total_months} meses
              </span>
            )}
        </div>
        <div className="mt-1 font-serif font-semibold">{title}</div>
        <div className="mt-2 flex items-end justify-between">
          <div className="font-mono text-lg" style={{ color: accent }}>
            {mainAmount}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            de {targetAmount}
          </div>
        </div>
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: accent }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/40 p-2.5 flex items-center gap-3',
        className,
      )}
    >
      <span
        className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
        style={{
          background: `color-mix(in oklch, ${accent} 14%, transparent)`,
          color: accent,
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {isGoal ? 'Meta de MFI' : 'Movimiento de MFI'}
          {!isGoal && data.category ? ` · ${data.category}` : ''}
        </div>
        <div className="font-medium text-sm truncate">{title}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm" style={{ color: accent }}>
          {!isGoal ? '−' : ''}
          {mainAmount}
        </div>
        {isGoal && (
          <div className="font-mono text-[11px] text-muted-foreground">
            {pct}%
          </div>
        )}
      </div>
    </div>
  )
}
