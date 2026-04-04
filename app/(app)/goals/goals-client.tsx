'use client'

import { useState, useEffect, useRef } from 'react'
import type { Goal, Currency, GoalStatus } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput, parseMoneyInput } from '@/components/money-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Target,
  Trash2,
  X,
  MoreVertical,
  ChevronDown,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Crosshair,
  PartyPopper,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Activa',
  completed: 'Completada',
  paused: 'Pausada',
}

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

// ─── Progress Ring (SVG) ────────────────────────────────────────────────────

function ProgressRing({
  percentage,
  color,
  size = 56,
  strokeWidth = 5,
  animate = true,
}: {
  percentage: number
  color: string
  size?: number
  strokeWidth?: number
  animate?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(animate ? circumference : circumference - (percentage / 100) * circumference)

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => {
      setOffset(circumference - (percentage / 100) * circumference)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage, circumference, animate])

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={0.12}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: animate ? 'stroke-dashoffset 0.6s ease-out' : 'none' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold font-mono text-foreground">
        {percentage}%
      </span>
    </div>
  )
}

// ─── Summary Hero ───────────────────────────────────────────────────────────

function GoalsSummary({ goals }: { goals: Goal[] }) {
  const active = goals.filter((g) => g.status === 'active')
  const completed = goals.filter((g) => g.status === 'completed')

  if (active.length === 0 && completed.length === 0) return null

  // Group by currency for totals
  const currencies = [...new Set(active.map((g) => g.currency))] as Currency[]

  const totals = currencies.map((cur) => {
    const filtered = active.filter((g) => g.currency === cur)
    const saved = filtered.reduce((s, g) => s + g.current_amount, 0)
    const target = filtered.reduce((s, g) => s + g.target_amount, 0)
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0
    return { currency: cur, saved, target, pct, count: filtered.length }
  })

  // If only one currency, use a single-currency layout
  const primaryTotal = totals.length === 1 ? totals[0] : null
  // If multiple currencies, pick the one with more goals for the ring
  const ringTotal = primaryTotal ?? (totals.length > 0 ? totals.reduce((a, b) => a.count >= b.count ? a : b) : null)

  return (
    <div className="bg-card border border-border rounded-2xl p-5 animate-fade-in-up" style={{ animationFillMode: 'both' }}>
      <div className="flex items-center gap-5">
        {/* Progress ring */}
        {ringTotal && (
          <ProgressRing percentage={ringTotal.pct} color="#10b981" size={64} strokeWidth={6} />
        )}

        {/* Metrics */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {totals.map((t) => (
              <div key={t.currency} className="flex flex-col">
                <span className="text-[18px] font-bold font-mono tabular-nums text-emerald-500 leading-tight">
                  {formatCurrency(t.saved, t.currency)}
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  de {formatCurrency(t.target, t.currency)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {active.length} meta{active.length !== 1 ? 's' : ''} activa{active.length !== 1 ? 's' : ''}
            {completed.length > 0 && ` · ${completed.length} completada${completed.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Deadline Helper ────────────────────────────────────────────────────────

function DeadlineLabel({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline + 'T00:00:00')
  const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const isOverdue = diff < 0
  const isUrgent = diff >= 0 && diff <= 30

  return (
    <p className={cn(
      'text-[10.5px] leading-none mt-0.5',
      isOverdue ? 'text-rose-500 font-medium' : isUrgent ? 'text-amber-500' : 'text-muted-foreground',
    )}>
      {isOverdue ? 'Vencida' : `Hasta ${formatDate(deadline)}`}
    </p>
  )
}

// ─── Goal Card ──────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  index,
  onDeposit,
  onDelete,
  onStatusChange,
}: {
  goal: Goal
  index: number
  onDeposit: (goal: Goal) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: GoalStatus) => void
}) {
  const pct = goal.target_amount > 0
    ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    : 0

  const isMuted = goal.status === 'completed' || goal.status === 'paused'

  return (
    <div
      className={cn(
        'group bg-card border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-[1px] animate-fade-in-up',
        isMuted ? 'opacity-60 hover:opacity-80' : 'opacity-100',
      )}
      style={{
        borderColor: isMuted ? undefined : goal.color + '30',
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: goal.color }}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-none truncate">
              {goal.name}
            </p>
            <DeadlineLabel deadline={goal.deadline} />
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {goal.status === 'completed' && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          )}
          {goal.status === 'paused' && (
            <PauseCircle className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {goal.status === 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'paused')}>
                  <PauseCircle className="w-3.5 h-3.5 mr-2" />
                  Pausar
                </DropdownMenuItem>
              )}
              {goal.status === 'paused' && (
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'active')}>
                  <PlayCircle className="w-3.5 h-3.5 mr-2" />
                  Reactivar
                </DropdownMenuItem>
              )}
              {goal.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'completed')}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                  Completar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(goal.id)}
                className="text-rose-500 focus:text-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ring + amounts */}
      <div className="flex items-center gap-3.5">
        <ProgressRing percentage={pct} color={goal.color} animate={!isMuted} />
        <div className="flex flex-col min-w-0">
          <span className="text-[16px] font-bold font-mono tabular-nums text-foreground leading-tight">
            {formatCurrency(goal.current_amount, goal.currency)}
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            de {formatCurrency(goal.target_amount, goal.currency)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: goal.color + '15' }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: goal.color,
          }}
        />
      </div>

      {/* Actions */}
      {goal.status === 'active' && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] w-full"
          onClick={() => onDeposit(goal)}
        >
          Depositar
        </Button>
      )}
    </div>
  )
}

// ─── Collapsible Section ────────────────────────────────────────────────────

function GoalSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 mb-3 group/section"
      >
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
          !open && '-rotate-90',
        )} />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          {title} ({count})
        </span>
      </button>
      {open && children}
    </div>
  )
}

// ─── Deposit Modal ──────────────────────────────────────────────────────────

function DepositModal({
  goal,
  open,
  onOpenChange,
  onDeposit,
}: {
  goal: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeposit: (goal: Goal, amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  if (!goal) return null

  const remaining = goal.target_amount - goal.current_amount
  const parsedAmount = parseMoneyInput(amount)
  const wouldComplete = parsedAmount > 0 && (goal.current_amount + parsedAmount) >= goal.target_amount

  async function handleSubmit() {
    if (!parsedAmount || parsedAmount <= 0 || !goal) return
    setLoading(true)
    await onDeposit(goal, parsedAmount)
    setLoading(false)
    if (wouldComplete) {
      setCompleted(true)
    } else {
      onOpenChange(false)
      setAmount('')
    }
  }

  function handleClose() {
    onOpenChange(false)
    setAmount('')
    setCompleted(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        {completed ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <PartyPopper className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Meta completada</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Alcanzaste tu objetivo de {formatCurrency(goal.target_amount, goal.currency)} en "{goal.name}"
              </p>
            </div>
            <Button onClick={handleClose} className="w-full h-9">
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-[14px] font-semibold">
                Depositar en {goal.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Saldo actual</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(goal.current_amount, goal.currency)}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Falta</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(Math.max(0, remaining), goal.currency)}
                </span>
              </div>

              <MoneyInput
                placeholder="Monto a depositar"
                value={amount}
                onChange={setAmount}
                className="h-10"
                autoFocus
              />

              {wouldComplete && (
                <p className="text-[11px] text-emerald-500 font-medium bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
                  Este depósito completa la meta. Se marcará como completada automáticamente.
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || !parsedAmount || parsedAmount <= 0}
                className="h-10 w-full"
              >
                {loading ? 'Depositando...' : 'Depositar'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface GoalsClientProps {
  goals: Goal[]
}

export function GoalsClient({ goals: initial }: GoalsClientProps) {
  const [goals, setGoals] = useState<Goal[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    currency: 'ARS' as Currency,
    deadline: '',
    color: PRESET_COLORS[0],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = goals.filter((g) => g.status === 'active')
  const completed = goals.filter((g) => g.status === 'completed')
  const paused = goals.filter((g) => g.status === 'paused')
  const hasMultipleSections = [active.length > 0, completed.length > 0, paused.length > 0].filter(Boolean).length > 1

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { createGoal } = await import('./actions')
    const { data, error } = await createGoal({
      name: form.name,
      target_amount: parseMoneyInput(form.target_amount),
      current_amount: parseMoneyInput(form.current_amount),
      currency: form.currency,
      deadline: form.deadline || null,
      color: form.color,
    })
    if (error) {
      setError(error)
      toast.error('No se pudo crear. Intentá de nuevo.', { duration: 5000 })
    } else if (data) {
      setGoals((prev) => [data, ...prev])
      setShowAdd(false)
      setForm({ name: '', target_amount: '', current_amount: '', currency: 'ARS', deadline: '', color: PRESET_COLORS[0] })
      toast.success('Meta creada')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { deleteGoal } = await import('./actions')
    const { error } = await deleteGoal(id)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
    setGoals((prev) => prev.filter((g) => g.id !== id))
    toast.success('Meta eliminada')
  }

  async function handleDeposit(goal: Goal, amount: number) {
    const newAmount = goal.current_amount + amount
    const status: GoalStatus = newAmount >= goal.target_amount ? 'completed' : 'active'
    const { depositToGoal } = await import('./actions')
    const { data, error } = await depositToGoal({
      id: goal.id,
      name: goal.name,
      target_amount: goal.target_amount,
      new_current_amount: newAmount,
      status,
    })
    if (error) { toast.error('No se pudo depositar. Intentá de nuevo.', { duration: 5000 }); return }
    if (data) {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? data : g)))
      if (status === 'completed') {
        toast.success(`Meta "${goal.name}" completada`)
      } else {
        toast.success(`Depósito registrado en ${goal.name}`)
      }
    }
  }

  async function handleStatusChange(id: string, status: GoalStatus) {
    const supabase = createClient()
    const { error } = await supabase
      .from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error('No se pudo actualizar. Intentá de nuevo.', { duration: 5000 }); return }
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, status } : g))
    toast.success(`Meta ${STATUS_LABELS[status].toLowerCase()}`)
  }

  function renderGrid(list: Goal[], startIndex = 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((goal, i) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            index={startIndex + i}
            onDeposit={setDepositGoal}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Metas</h1>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nueva meta
        </Button>
      </div>

      {/* Summary hero */}
      <GoalsSummary goals={goals} />

      {/* Empty state */}
      {goals.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center text-center py-20 gap-4 animate-fade-in-up" style={{ animationFillMode: 'both' }}>
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Crosshair className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground mb-1">Sin metas todavía</p>
            <p className="text-[12px] text-muted-foreground max-w-[260px]">
              Creá tu primera meta de ahorro para empezar a trackear tu progreso
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-1.5 mt-1">
            <Plus className="w-4 h-4" />
            Nueva meta
          </Button>
        </div>
      )}

      {/* Goals grid — single section or multiple */}
      {goals.length > 0 && (
        hasMultipleSections ? (
          <div className="flex flex-col gap-5">
            {active.length > 0 && (
              <GoalSection title="Activas" count={active.length}>
                {renderGrid(active)}
              </GoalSection>
            )}
            {paused.length > 0 && (
              <GoalSection title="Pausadas" count={paused.length} defaultOpen={false}>
                {renderGrid(paused, active.length)}
              </GoalSection>
            )}
            {completed.length > 0 && (
              <GoalSection title="Completadas" count={completed.length} defaultOpen={false}>
                {renderGrid(completed, active.length + paused.length)}
              </GoalSection>
            )}
          </div>
        ) : (
          renderGrid(active.length > 0 ? active : completed.length > 0 ? completed : paused)
        )
      )}

      {/* Deposit modal */}
      <DepositModal
        goal={depositGoal}
        open={!!depositGoal}
        onOpenChange={(open) => { if (!open) setDepositGoal(null) }}
        onDeposit={handleDeposit}
      />

      {/* Add goal modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-6 z-10 animate-fade-in-up" style={{ animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-card-foreground">Nueva meta</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <Input
                  placeholder="Ej: Fondo de emergencia"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="h-10"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Objetivo</Label>
                  <MoneyInput
                    placeholder="0"
                    value={form.target_amount}
                    onChange={(v) => setForm((f) => ({ ...f, target_amount: v }))}
                    required
                    className="h-10"
                  />
                </div>
                <div className="w-24">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Moneda</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Monto inicial (opcional)</Label>
                <MoneyInput
                  placeholder="0"
                  value={form.current_amount}
                  onChange={(v) => setForm((f) => ({ ...f, current_amount: v }))}
                  className="h-10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Fecha límite (opcional)</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={cn(
                        'w-7 h-7 rounded-full transition-transform',
                        form.color === c && 'ring-2 ring-offset-2 ring-foreground scale-110',
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Crear meta'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
