'use client'

import type { WrappedData } from '@/lib/wrapped/types'
import { PERSONALITIES } from '@/lib/wrapped/personalities'
import { fmtARS } from '@/lib/wrapped/formatters'
import { Sparkline } from './slide-primitives'
import { cn } from '@/lib/utils'

interface ShareCardProps {
  data: WrappedData
  ratio?: 'feed' | 'story'
  className?: string
  /** When rendered inside a feed post (embed), we want the card compact and
   *  without the huge drop shadow that looks weird next to a white card. */
  flat?: boolean
}

export function ShareCard({ data, ratio = 'feed', className, flat = false }: ShareCardProps) {
  const p = PERSONALITIES[data.personality]
  const daily = data.peakDay?.daily ?? []
  const peakIdx = daily.length ? daily.indexOf(Math.max(...daily)) : 0
  const aspectCls = ratio === 'story' ? 'aspect-[9/16]' : 'aspect-[4/5]'

  return (
    <div
      className={cn(
        'wrapped-root relative w-full overflow-hidden rounded-2xl grain text-white',
        aspectCls,
        !flat && 'shadow-[0_30px_80px_-30px_oklch(0.2_0.02_260_/_0.45)]',
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

      <div className="relative h-full w-full flex flex-col p-6" style={{ zIndex: 1 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md grid place-items-center bg-white font-serif font-bold text-[11px]"
              style={{ color: 'oklch(0.50 0.10 155)' }}
            >
              M
            </div>
            <div className="font-serif font-semibold text-[13px]">MFI</div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] font-medium text-white/75">
            {data.month} · {data.year}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-white/80 text-[11px] uppercase tracking-[0.22em] font-medium">Sos</div>
          <div
            className="font-serif font-bold leading-[0.95] balance"
            style={{ fontSize: 'clamp(32px, 6vw, 56px)' }}
          >
            {p.label}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium">Balance</div>
            <div className="mt-0.5 font-mono font-medium text-white text-[15px]">
              {fmtARS(data.balance.ars, true)}
            </div>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium">Ahorro</div>
            <div className="mt-0.5 font-mono font-medium text-white text-[15px]">
              {fmtARS(data.savings.savings + data.savings.investment)}
            </div>
          </div>
          {data.topCategory && (
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
                    {data.topCategory.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-white text-[13px]">
                    {fmtARS(data.topCategory.amount)}
                  </div>
                  <div className="text-[10px] text-white/70">
                    {data.topCategory.pctOfExpenses}% del total
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {daily.length > 0 && (
          <div
            className="mt-4 rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.20)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium mb-1">
              Ritmo de gasto
            </div>
            <Sparkline daily={daily} peakIdx={peakIdx} height={44} />
          </div>
        )}

        <div className="mt-auto flex items-end justify-between">
          <div className="text-white/80 text-[11px]">
            <div className="font-mono">
              {data.user.initials} · {data.user.name}
            </div>
            <div className="text-white/60">mfi.app</div>
          </div>
          <div className="text-6xl leading-none">{p.emoji}</div>
        </div>
      </div>
    </div>
  )
}
