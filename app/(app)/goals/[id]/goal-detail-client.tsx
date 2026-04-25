'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit3,
  Pause,
  PlayCircle,
  Plus,
  Sparkles,
  Flag,
  Check,
  RefreshCw,
  Wallet,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { Goal, Category, Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/types'
import {
  buildSeries,
  categoryOf,
  deriveGoal,
  formatPct,
} from '@/lib/goals'
import { CatBadge } from '../_components/primitives/cat-badge'
import { Sparkline } from '../_components/primitives/sparkline'
import { ProgressBar } from '../_components/primitives/progress-bar'
import { Confetti } from '../_components/primitives/confetti'
import { CreateGoalModal, type CreateModalSubmit } from '../_components/create-goal-modal'
import { DepositModal } from '../_components/deposit-modal'
import { LiquidateGoalModal } from '../_components/liquidate-goal-modal'
import {
  updateGoal,
  setGoalStatus,
  depositToGoal,
  liquidateGoal,
  deleteGoal,
} from '../actions'

interface GoalDetailClientProps {
  goal: Goal
  movements: Pick<Transaction, 'id' | 'amount' | 'date' | 'type' | 'currency' | 'source' | 'note'>[]
  incomeCategories: Category[]
}

export function GoalDetailClient({
  goal: initialGoal,
  movements,
  incomeCategories,
}: GoalDetailClientProps) {
  const router = useRouter()
  const [goal, setGoal] = useState<Goal>(initialGoal)
  const [editing, setEditing] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [liquidateOpen, setLiquidateOpen] = useState(false)

  const meta = categoryOf(goal)
  const d = deriveGoal(goal)
  const isClosed = goal.status === 'completed' || goal.status === 'liquidated'
  const accent = goal.status === 'completed' ? '#10b981' : d.overdue ? '#ef4444' : meta.color

  const series = useMemo(() => buildSeries(movements.filter((m) => m.type === 'savings')), [movements])

  // Simulator
  const initialSim = goal.monthly_target ?? 0
  const [simAmount, setSimAmount] = useState(initialSim > 0 ? Math.round(initialSim) : Math.round(d.requiredMonthly))
  const monthsToTarget = simAmount > 0 ? Math.ceil(d.remaining / simAmount) : null
  const simEta = useMemo(() => {
    if (!monthsToTarget) return null
    const eta = new Date()
    eta.setMonth(eta.getMonth() + monthsToTarget)
    return eta
  }, [monthsToTarget])
  const simStep = goal.currency === 'ARS' ? 5000 : 25
  const simMax = Math.max(simStep * 4, Math.round((goal.monthly_target ?? d.requiredMonthly) * 4))

  const milestones = [
    { pct: 25, label: 'Primer cuarto' },
    { pct: 50, label: 'Mitad de camino' },
    { pct: 75, label: 'Recta final' },
    { pct: 100, label: 'Meta cumplida' },
  ]

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleEdit(input: CreateModalSubmit) {
    const { data, error } = await updateGoal({
      id: goal.id,
      name: input.name,
      category: input.category,
      target_amount: input.target_amount,
      current_amount: goal.current_amount,
      currency: input.currency,
      deadline: input.deadline,
      monthly_target: input.monthly_target,
      note: input.note,
      auto: input.auto,
    })
    if (error) {
      toast.error('No se pudo guardar.')
      return { error }
    }
    if (data) {
      setGoal(data)
      toast.success('Meta actualizada')
    }
    return { error: null }
  }

  async function handlePause() {
    const next = goal.status === 'paused' ? 'active' : 'paused'
    const { data, error } = await setGoalStatus(goal.id, next)
    if (error) { toast.error('No se pudo actualizar.'); return }
    if (data) setGoal(data)
    toast.success(next === 'paused' ? 'Meta pausada' : 'Meta reactivada')
  }

  async function handleDeposit(input: { goal: Goal; amount: number; note: string | null; date: string }) {
    const { data, error } = await depositToGoal(input)
    if (error) {
      toast.error('No se pudo depositar.')
      return { error }
    }
    if (data) {
      setGoal(data)
      toast.success(data.status === 'completed' ? `¡Cumpliste “${data.name}”!` : `Depósito en ${data.name}`)
      // No refetch del feed — la próxima visita lo trae actualizado.
    }
    return { error: null }
  }

  async function handleLiquidate(input: { goalId: string; categoryId: string | null; note: string | null }) {
    const { data, error } = await liquidateGoal(input)
    if (error) {
      toast.error('No se pudo liquidar.')
      return { error }
    }
    if (data) {
      setGoal(data)
      toast.success('Meta liquidada · movimiento creado')
    }
    return { error: null }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${goal.name}"? Los depósitos quedan en el histórico de movimientos.`)) return
    const { error } = await deleteGoal(goal.id)
    if (error) { toast.error('No se pudo eliminar.'); return }
    toast.success('Meta eliminada')
    router.push('/goals')
  }

  return (
    <div className="space-y-5">
      {/* Top: back + title */}
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0">
          <Link href="/goals" aria-label="Volver">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">/metas / detalle</div>
          <div className="font-semibold text-foreground text-[15px] truncate">{goal.name}</div>
        </div>
        {!isClosed && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePause} className="gap-1.5">
              {goal.status === 'paused' ? (
                <><PlayCircle className="w-3.5 h-3.5" /> Reactivar</>
              ) : (
                <><Pause className="w-3.5 h-3.5" /> Pausar</>
              )}
            </Button>
          </>
        )}
        {goal.status === 'completed' && (
          <Button variant="outline" size="sm" onClick={() => setLiquidateOpen(true)} className="gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            Liquidar
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-1.5 text-rose-500 hover:text-rose-600">
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar
        </Button>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6">
        {goal.status === 'completed' && <Confetti />}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <CatBadge category={goal.category} size={48} />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">{meta.label}</div>
                <h2 className="font-semibold text-[22px] text-foreground leading-tight">{goal.name}</h2>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ahorrado</div>
              <div
                className="font-bold text-foreground leading-[0.95] font-mono tabular-nums mt-1"
                style={{ fontSize: 'clamp(40px, 5.5vw, 64px)' }}
              >
                {formatCurrency(goal.current_amount, goal.currency)}
              </div>
              <div className="text-[14px] text-muted-foreground font-mono mt-1">
                de {formatCurrency(goal.target_amount, goal.currency)}
                {!isClosed && d.remaining > 0 && (
                  <> · faltan <span className="text-foreground">{formatCurrency(d.remaining, goal.currency)}</span></>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="Progreso" value={formatPct(d.pct)} tone="emerald" />
              <Stat
                label={goal.deadline ? 'Días restantes' : 'Sin fecha'}
                value={goal.deadline ? (d.overdue ? `−${Math.abs(d.daysLeft!)}d` : `${d.daysLeft}d`) : '—'}
                tone={d.overdue ? 'rose' : 'neutral'}
              />
              <Stat
                label="Aporte mensual"
                value={goal.monthly_target ? formatCurrency(goal.monthly_target, goal.currency) : '—'}
                tone={d.onTrack ? 'emerald' : 'amber'}
              />
            </div>
            {goal.note && (
              <div className="mt-5 rounded-xl bg-muted/40 border border-border p-3 text-[13px] text-foreground" style={{ textWrap: 'pretty' as never }}>
                {goal.note}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                  Aportes acumulados
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {movements.filter((m) => m.type === 'savings').length} depósitos
                </div>
              </div>
              {series && series.length > 1 ? (
                <Sparkline data={series} target={goal.target_amount} color={accent} height={140} showDots />
              ) : (
                <div className="text-[12px] text-muted-foreground py-10 text-center">
                  Todavía no hay depósitos. Cargá el primero y empezamos a graficar.
                </div>
              )}
            </div>
            <div className="mt-3">
              <ProgressBar pct={d.pct} tone={goal.status === 'completed' ? 'emerald' : d.overdue ? 'rose' : 'emerald'} height={10} />
              <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-muted-foreground">
                <span>0</span>
                <span className="text-foreground font-semibold">{formatPct(d.pct)}</span>
                <span>{formatCurrency(goal.target_amount, goal.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator + Milestones */}
      {!isClosed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-[15px] text-foreground">Simulador</h3>
            </div>
            <p className="text-[12px] text-muted-foreground" style={{ textWrap: 'pretty' as never }}>
              ¿Cuánto tarda en llegar si depositás distinto?
            </p>
            <div className="mt-5">
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Aporte mensual</label>
                <div className="font-mono font-semibold text-foreground tabular-nums">
                  {formatCurrency(simAmount, goal.currency)}
                </div>
              </div>
              <Slider
                min={0}
                max={simMax}
                step={simStep}
                value={[simAmount]}
                onValueChange={(vals) => setSimAmount(vals[0] ?? 0)}
                aria-label="Simular aporte mensual"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Meses para llegar</div>
                <div className="font-bold text-foreground font-mono tabular-nums mt-0.5" style={{ fontSize: 26 }}>
                  {monthsToTarget ?? '—'}
                </div>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Llegás en</div>
                <div className="font-bold text-foreground mt-0.5" style={{ fontSize: 16 }}>
                  {simEta ? simEta.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : '—'}
                </div>
              </div>
            </div>
            {goal.deadline && simEta && (
              <div className="mt-4 text-[12px]" style={{ textWrap: 'pretty' as never }}>
                {simEta.getTime() <= new Date(goal.deadline + 'T00:00:00').getTime() ? (
                  <span className="text-emerald-600">
                    ✓ Llegás a tiempo para tu fecha límite ({formatDate(goal.deadline)}).
                  </span>
                ) : (
                  <span className="text-rose-500">
                    Te pasás {Math.ceil((simEta.getTime() - new Date(goal.deadline + 'T00:00:00').getTime()) / 86400000)} días de la fecha. Subí el aporte o corré la fecha.
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-[15px] text-foreground">Hitos</h3>
            </div>
            <p className="text-[12px] text-muted-foreground">Marcadores del recorrido.</p>
            <div className="mt-4 space-y-3">
              {milestones.map((m) => {
                const reached = d.pct >= m.pct
                const amt = (goal.target_amount * m.pct) / 100
                return (
                  <div key={m.pct} className="flex items-center gap-3">
                    <div
                      className={
                        'w-7 h-7 rounded-full grid place-items-center shrink-0 ' +
                        (reached ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')
                      }
                    >
                      {reached ? <Check className="w-3.5 h-3.5" /> : <span className="font-mono text-[11px]">{m.pct}</span>}
                    </div>
                    <div className="flex-1">
                      <div className={'font-medium text-[13px] ' + (reached ? 'text-foreground' : 'text-muted-foreground')}>
                        {m.label}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {formatCurrency(amt, goal.currency)}
                      </div>
                    </div>
                    {reached && (
                      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-medium">
                        Logrado
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[15px] text-foreground">Movimientos de esta meta</h3>
          <span className="inline-flex items-center px-2 h-6 rounded-full bg-muted text-muted-foreground text-[11px] font-medium font-mono">
            {movements.length}
          </span>
        </div>
        {movements.length === 0 ? (
          <div className="text-[13px] text-muted-foreground">Sin movimientos todavía.</div>
        ) : (
          <ul className="divide-y divide-border">
            {movements.map((m) => {
              const isLiquidation = m.source === 'goal_liquidation'
              const isAuto = m.source === 'auto_goal'
              return (
                <li key={m.id} className="py-3 flex items-center gap-3">
                  <div
                    className={
                      'w-8 h-8 rounded-lg grid place-items-center shrink-0 ' +
                      (isLiquidation
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-500/10 text-emerald-600')
                    }
                  >
                    {isLiquidation ? (
                      <Wallet className="w-4 h-4" />
                    ) : isAuto ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px] text-foreground">
                      {isLiquidation
                        ? 'Liquidación de la meta'
                        : isAuto
                          ? 'Depósito automático'
                          : 'Depósito manual'}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {formatDate(m.date)}
                      {m.note ? ` · ${m.note}` : ''}
                    </div>
                  </div>
                  <div
                    className={
                      'font-mono font-semibold tabular-nums text-[14px] ' +
                      (isLiquidation ? 'text-emerald-600' : 'text-foreground')
                    }
                  >
                    {isLiquidation ? '−' : '+'}
                    {formatCurrency(m.amount, m.currency)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Sticky CTA */}
      {goal.status === 'active' && (
        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" onClick={() => setDepositOpen(true)} className="gap-1.5 shadow-lg">
            <Plus className="w-4 h-4" />
            Depositar a {goal.name}
          </Button>
        </div>
      )}

      <CreateGoalModal
        open={editing}
        onClose={() => setEditing(false)}
        editing={goal}
        onSubmit={handleEdit}
      />

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        goal={goal}
        onConfirm={handleDeposit}
      />

      <LiquidateGoalModal
        open={liquidateOpen}
        onClose={() => setLiquidateOpen(false)}
        goal={goal}
        incomeCategories={incomeCategories}
        onConfirm={handleLiquidate}
      />
    </div>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'emerald' | 'rose' | 'amber' | 'neutral' }) {
  const colors = {
    emerald: 'text-emerald-600',
    rose: 'text-rose-500',
    amber: 'text-amber-500',
    neutral: 'text-foreground',
  } as const
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={'font-bold mt-0.5 font-mono tabular-nums ' + colors[tone]} style={{ fontSize: 22 }}>
        {value}
      </div>
    </div>
  )
}
