'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import type { CommunityPostEmbed } from '@/lib/types'
import { PERSONALITIES } from '@/lib/wrapped/personalities'
import { fmtARS } from '@/lib/wrapped/formatters'
import { Sparkline } from '@/components/wrapped/slide-primitives'
import { cn } from '@/lib/utils'
import '@/components/wrapped/wrapped-styles.css'

interface Props {
  data: Extract<CommunityPostEmbed, { kind: 'wrapped' }>
  variant?: 'compact' | 'rich'
  className?: string
}

/**
 * Renders a WrappedData snapshot as a live card inside the community feed.
 * The card stays interactive (hover/click) and honors light/dark via the
 * gradient itself — no image conversion.
 */
export function WrappedEmbed({ data, variant = 'compact', className }: Props) {
  const p = PERSONALITIES[data.personality]
  const peakIdx = data.daily.length > 0 ? data.daily.indexOf(Math.max(...data.daily)) : 0

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'wrapped-root relative overflow-hidden rounded-lg border p-3 flex items-center gap-3 grain text-white',
          className,
        )}
        style={{
          background: `linear-gradient(92deg, ${p.g1} 0%, ${p.g2} 100%)`,
          borderColor: 'rgba(255,255,255,.18)',
        }}
      >
        <div
          className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
          style={{ background: 'rgba(255,255,255,.18)' }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-white/75 font-medium">
            Tu Mes en MFI · {data.month_label} {data.year}
          </div>
          <div className="font-serif font-semibold text-sm truncate">{p.label}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[13px] text-white">
            {fmtARS(data.balance_ars, true)}
          </div>
          <div className="text-[10px] text-white/70">balance</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'wrapped-root relative overflow-hidden rounded-2xl grain text-white',
        className,
      )}
      style={{
        background: `linear-gradient(155deg, ${p.g1} 0%, ${p.g2} 100%)`,
      }}
    >
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="blob"
          style={{
            left: '-10%',
            top: '-14%',
            width: '65%',
            height: '45%',
            background: p.g1,
            opacity: 0.6,
          }}
        />
        <div
          className="blob"
          style={{
            right: '-12%',
            bottom: '-12%',
            width: '70%',
            height: '50%',
            background: p.g2,
            opacity: 0.6,
          }}
        />
      </div>

      <div className="relative p-5 flex flex-col gap-4" style={{ zIndex: 1 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md grid place-items-center bg-white font-serif font-bold text-[11px]"
              style={{ color: 'oklch(0.50 0.10 155)' }}
            >
              M
            </div>
            <div className="font-serif font-semibold text-[13px]">MFI · Tu Mes</div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] font-medium text-white/75">
            {data.month_label} · {data.year}
          </div>
        </div>

        <div>
          <div className="text-white/80 text-[11px] uppercase tracking-[0.22em] font-medium">Sos</div>
          <div className="font-serif font-bold text-white leading-[0.95] text-[34px] balance">
            {p.label}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Balance" value={fmtARS(data.balance_ars, true)} />
          <Stat label="Ahorro" value={fmtARS(data.savings_total_ars)} />
          <div
            className="rounded-xl p-3 col-span-2"
            style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                  Gastaste más en
                </div>
                <div className="mt-0.5 font-serif font-semibold text-white text-[15px]">
                  {data.top_category_name}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-white text-[13px]">
                  {fmtARS(data.top_category_amount_ars)}
                </div>
                <div className="text-[10px] text-white/70">{data.top_category_pct}% del total</div>
              </div>
            </div>
          </div>
        </div>

        {data.daily.length > 0 && (
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.20)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium mb-1">
              Ritmo de gasto
            </div>
            <Sparkline daily={data.daily} peakIdx={peakIdx} height={44} />
          </div>
        )}

        <div className="flex items-end justify-between">
          <div className="text-white/80 text-[11px]">
            <div className="font-mono">
              {data.user_initials} · {data.user_name}
            </div>
            <div className="text-white/60">mfi.app</div>
          </div>
          <div className="text-5xl leading-none">{p.emoji}</div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)' }}
    >
      <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium">{label}</div>
      <div className="mt-0.5 font-mono font-medium text-white text-[15px]">{value}</div>
    </div>
  )
}

// Export a link wrapper so post cards can make the embed clickable.
// Not used for wrapped kind (no detail page yet), but kept for future use.
export { Link as WrappedEmbedLink }
