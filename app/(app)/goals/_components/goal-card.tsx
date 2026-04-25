'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Bolt, Check, Info, RefreshCw, Plus, Wallet, MoreVertical, Pause, PlayCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Goal } from '@/lib/types'
import { formatCurrency } from '@/lib/types'
import {
  categoryOf,
  deriveGoal,
  formatPct,
  shouldShowConfetti,
} from '@/lib/goals'
import { CatBadge } from './primitives/cat-badge'
import { Ring } from './primitives/ring'
import { ProgressBar } from './primitives/progress-bar'
import { Sparkline } from './primitives/sparkline'
import { Confetti } from './primitives/confetti'

interface GoalCardProps {
  goal: Goal
  /** Cumulative deposits series for the sparkline. Null = hide sparkline. */
  series: number[] | null
  onDeposit?: (goal: Goal) => void
  onLiquidate?: (goal: Goal) => void
  onPause?: (goal: Goal) => void
  onReactivate?: (goal: Goal) => void
  onEdit?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
}

export function GoalCard({
  goal,
  series,
  onDeposit,
  onLiquidate,
  onPause,
  onReactivate,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const meta = categoryOf(goal)
  const d = deriveGoal(goal)
  const isClosed = goal.status === 'completed' || goal.status === 'liquidated'
  const accent = goal.status === 'completed'
    ? '#10b981'
    : d.overdue
      ? '#ef4444'
      : meta.color

  const tone: 'emerald' | 'amber' | 'rose' = goal.status === 'completed'
    ? 'emerald'
    : d.overdue
      ? 'rose'
      : 'emerald'

  // Confetti only the first time we see a fresh completion.
  const [fireConfetti, setFireConfetti] = useState(false)
  useEffect(() => {
    if (goal.status === 'completed') {
      setFireConfetti(shouldShowConfetti(goal.id, goal.completed_at ?? null))
    }
  }, [goal.id, goal.status, goal.completed_at])

  const monthlyTarget = goal.monthly_target ?? 0
  const monthlyDelta = monthlyTarget - d.requiredMonthly

  const statusBadge = renderStatusBadge(goal, d.onTrack, d.overdue)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-shadow',
        goal.status === 'completed' && 'ring-1 ring-emerald-500/30',
        goal.status === 'liquidated' && 'opacity-70',
      )}
    >
      {fireConfetti && <Confetti />}

      {/* Header */}
      <div className="flex items-start gap-4 relative">
        <CatBadge category={goal.category} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/goals/${goal.id}`}
              className="font-semibold text-[16px] text-foreground truncate hover:underline"
            >
              {goal.name}
            </Link>
            {statusBadge}
            {goal.auto_enabled && !isClosed && (
              <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                <RefreshCw className="w-3 h-3" />
                Auto día {goal.auto_day ?? '—'}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground font-mono">
            {meta.label}
            {goal.deadline && !isClosed && (
              <> · {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
            )}
            {goal.status === 'completed' && goal.completed_at && (
              <> · cumplida {new Date(goal.completed_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</>
            )}
            {goal.status === 'liquidated' && goal.liquidated_at && (
              <> · liquidada {new Date(goal.liquidated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</>
            )}
          </div>
        </div>
        <Ring pct={d.pct} size={56} stroke={6} color={accent} label={`${meta.label} — ${d.pct}%`} />
      </div>

      {/* Numbers + sparkline */}
      <div className="mt-5 grid grid-cols-12 gap-3 items-end">
        <div className="col-span-7">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ahorrado</div>
          <div className="font-bold text-foreground leading-none mt-1 font-mono tabular-nums" style={{ fontSize: 28 }}>
            {formatCurrency(goal.current_amount, goal.currency)}
          </div>
          <div className="text-[12px] text-muted-foreground font-mono mt-1">
            de {formatCurrency(goal.target_amount, goal.currency)}
            {!isClosed && d.remaining > 0 && (
              <> · faltan {formatCurrency(d.remaining, goal.currency)}</>
            )}
          </div>
        </div>
        <div className="col-span-5">
          {series && series.length > 1 && (
            <Sparkline data={series} target={goal.target_amount} color={accent} height={56} />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <ProgressBar pct={d.pct} tone={tone} height={8} />
        <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-muted-foreground">
          <span>{formatPct(d.pct)}</span>
          {d.daysLeft != null && !isClosed && (
            <span className={d.overdue ? 'text-rose-500 font-medium' : ''}>
              {d.overdue
                ? `Vencida hace ${Math.abs(d.daysLeft)}d`
                : `${d.daysLeft} días restantes`}
            </span>
          )}
          {goal.status === 'completed' && <span className="text-emerald-600">100%</span>}
        </div>
      </div>

      {/* Footer */}
      {goal.status === 'active' || goal.status === 'paused' ? (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Aporte mensual</div>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <div className="font-semibold text-[15px] text-foreground font-mono tabular-nums">
                {monthlyTarget > 0 ? formatCurrency(monthlyTarget, goal.currency) : '—'}
              </div>
              {d.monthsLeft != null && d.monthsLeft > 0 && monthlyTarget > 0 && (
                <div className="text-[11px] font-mono text-muted-foreground">
                  {monthlyDelta >= 0 ? (
                    <>sugerido {formatCurrency(d.requiredMonthly, goal.currency)}<span className="text-emerald-600"> · suficiente</span></>
                  ) : (
                    <>necesitás {formatCurrency(d.requiredMonthly, goal.currency)}<span className="text-rose-500"> · falta {formatCurrency(Math.abs(monthlyDelta), goal.currency)}</span></>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/goals/${goal.id}`}>Ver detalle</Link>
            </Button>
            {goal.status === 'active' && onDeposit && (
              <Button size="sm" onClick={() => onDeposit(goal)} className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Depositar
              </Button>
            )}
            <CardMenu
              goal={goal}
              onEdit={onEdit}
              onPause={onPause}
              onReactivate={onReactivate}
              onDelete={onDelete}
            />
          </div>
        </div>
      ) : goal.status === 'completed' ? (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-3 flex-wrap">
          <div className="flex-1 text-[13px] text-foreground">
            🎉 Lo hiciste. ¿Pasás los fondos a tu cuenta o arrancás otra?
          </div>
          {onLiquidate && (
            <Button variant="outline" size="sm" onClick={() => onLiquidate(goal)} className="gap-1">
              <Wallet className="w-3.5 h-3.5" />
              Liquidar
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-border text-[13px] text-muted-foreground">
          Liquidada. Los fondos se transfirieron a tu cuenta.
        </div>
      )}
    </div>
  )
}

// ─── Status badge ───────────────────────────────────────────────────────────

function renderStatusBadge(goal: Goal, onTrack: boolean, overdue: boolean) {
  if (goal.status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-medium">
        <Check className="w-3 h-3" /> Cumplida
      </span>
    )
  }
  if (goal.status === 'liquidated') {
    return (
      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
        Liquidada
      </span>
    )
  }
  if (goal.status === 'paused') {
    return (
      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
        <Pause className="w-3 h-3" /> Pausada
      </span>
    )
  }
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-rose-500/10 text-rose-600 text-[11px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Vencida
      </span>
    )
  }
  if (goal.monthly_target && goal.monthly_target > 0) {
    return onTrack ? (
      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-medium">
        <Bolt className="w-3 h-3" /> En ritmo
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-medium">
        <Info className="w-3 h-3" /> Atrás del ritmo
      </span>
    )
  }
  return null
}

// ─── Card menu ──────────────────────────────────────────────────────────────

function CardMenu({
  goal,
  onEdit,
  onPause,
  onReactivate,
  onDelete,
}: {
  goal: Goal
  onEdit?: (goal: Goal) => void
  onPause?: (goal: Goal) => void
  onReactivate?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Más acciones"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(goal)}>Editar</DropdownMenuItem>
        )}
        {goal.status === 'active' && onPause && (
          <DropdownMenuItem onClick={() => onPause(goal)}>
            <Pause className="w-3.5 h-3.5 mr-2" />
            Pausar
          </DropdownMenuItem>
        )}
        {goal.status === 'paused' && onReactivate && (
          <DropdownMenuItem onClick={() => onReactivate(goal)}>
            <PlayCircle className="w-3.5 h-3.5 mr-2" />
            Reactivar
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(goal)} className="text-rose-500 focus:text-rose-500">
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
