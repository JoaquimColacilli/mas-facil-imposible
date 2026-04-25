'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Goal } from '@/lib/types'
import { formatCurrency } from '@/lib/types'
import {
  aggregateGoals,
  deriveGoal,
  formatUSDRounded,
  formatPct,
} from '@/lib/goals'
import { Ring } from './primitives/ring'
import { ProgressBar } from './primitives/progress-bar'

interface GoalsHeroProps {
  goals: Goal[]
  /** ARS-per-USD rate. <= 0 = unavailable; the hero falls back to a notice. */
  mepRate: number
  monthLabel: string
  onNew: () => void
}

export function GoalsHero({ goals, mepRate, monthLabel, onNew }: GoalsHeroProps) {
  const open = goals.filter((g) => g.status === 'active' || g.status === 'paused' || g.status === 'completed')
  const agg = aggregateGoals(open, mepRate)
  const next = pickNextMilestone(open)
  const rateAvailable = mepRate > 0

  return (
    <div className="relative rounded-3xl overflow-hidden p-6 md:p-8 text-white"
      style={{
        background:
          'radial-gradient(60% 80% at 12% 0%, oklch(0.70 0.13 155 / 0.25), transparent 60%),' +
          'radial-gradient(50% 70% at 100% 100%, oklch(0.70 0.13 65 / 0.20), transparent 60%),' +
          'linear-gradient(135deg, oklch(0.20 0.014 260) 0%, oklch(0.23 0.018 220) 100%)',
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        <div className="lg:col-span-7">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/65 font-mono">
            Tus metas · {monthLabel}
          </div>
          <h1
            className="font-bold leading-[0.95] mt-2"
            style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', textWrap: 'balance' as never }}
          >
            {rateAvailable ? (
              <>Llevás <span className="text-emerald-300">{formatUSDRounded(agg.totalSavedUSD)}</span> ahorrados</>
            ) : (
              <>Tus metas, en marcha</>
            )}
          </h1>
          <p className="mt-3 text-white/75 text-[15px] max-w-lg" style={{ textWrap: 'pretty' as never }}>
            En {agg.activeCount} {agg.activeCount === 1 ? 'meta activa' : 'metas activas'}
            {agg.completedCount > 0 && `, ${agg.completedCount} ya cumplida${agg.completedCount > 1 ? 's' : ''}`}
            {rateAvailable && <>. Es un {formatPct(agg.globalPct)} del total que te propusiste.</>}
            {!rateAvailable && <>. Cotización MEP no disponible — totales por moneda en cada card.</>}
          </p>
          {rateAvailable && (
            <div className="mt-5 max-w-lg">
              <ProgressBar pct={agg.globalPct} tone="emerald" height={10} milestones={[25, 50, 75]} />
              <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-white/55">
                <span>0</span>
                <span className="text-white">
                  {formatUSDRounded(agg.totalSavedUSD)} / {formatUSDRounded(agg.totalTargetUSD)}
                </span>
                <span>{formatPct(agg.globalPct)}</span>
              </div>
            </div>
          )}
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <Button onClick={onNew} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="w-4 h-4" />
              Nueva meta
            </Button>
          </div>
        </div>

        {/* Next milestone card */}
        <div className="lg:col-span-5">
          {next ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/60 font-mono mb-3">
                Tu próximo hito
              </div>
              <div className="flex items-center gap-4">
                <Ring pct={next.pct} size={72} stroke={7} color="oklch(0.78 0.13 155)" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-[18px] truncate">{next.goal.name}</div>
                  <div className="text-[12px] font-mono text-white/65 mt-0.5">
                    {next.pct}% → {next.nextPct}% · faltan {formatCurrency(next.remaining, next.goal.currency)}
                  </div>
                </div>
              </div>
              {next.goal.monthly_target && next.goal.monthly_target > 0 && (
                <div className="mt-4 text-[13px] text-white/80" style={{ textWrap: 'pretty' as never }}>
                  Con {formatCurrency(next.goal.monthly_target, next.goal.currency)} por mes, llegás
                  al {next.nextPct}% en aprox. {Math.max(1, Math.ceil(next.remaining / next.goal.monthly_target))} {next.remaining > next.goal.monthly_target ? 'meses' : 'mes'}.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/60 font-mono">
                Sin hitos pendientes
              </div>
              <div className="font-semibold text-white mt-1">
                {agg.completedCount > 0 ? '¡Todas tus metas están cumplidas!' : 'Creá tu primera meta y arrancamos.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface NextMilestone {
  goal: Goal
  pct: number
  nextPct: 25 | 50 | 75 | 100
  remaining: number
}

function pickNextMilestone(goals: Goal[]): NextMilestone | null {
  let best: NextMilestone | null = null
  for (const g of goals) {
    if (g.status !== 'active') continue
    const d = deriveGoal(g)
    const nextPct = ([25, 50, 75, 100] as const).find((p) => d.pct < p)
    if (!nextPct) continue
    const remaining = (nextPct / 100) * g.target_amount - g.current_amount
    if (!best || remaining < best.remaining) {
      best = { goal: g, pct: d.pct, nextPct, remaining }
    }
  }
  return best
}
