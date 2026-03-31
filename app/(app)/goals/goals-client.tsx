'use client'

import { useState } from 'react'
import type { Goal, Currency, GoalStatus } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput, parseMoneyInput } from '@/components/money-input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Target, Trash2, X, CheckCircle2, PauseCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoalsClientProps {
  goals: Goal[]
}

const STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Activa',
  completed: 'Completada',
  paused: 'Pausada',
}

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

export function GoalsClient({ goals: initial }: GoalsClientProps) {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
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
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')

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
    } else if (data) {
      setGoals((prev) => [data, ...prev])
      setShowAdd(false)
      setForm({ name: '', target_amount: '', current_amount: '', currency: 'ARS', deadline: '', color: PRESET_COLORS[0] })
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { deleteGoal } = await import('./actions')
    const { error } = await deleteGoal(id)
    if (!error) setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  async function handleDeposit(goal: Goal) {
    const amt = parseMoneyInput(depositAmount)
    if (!amt || amt <= 0) return
    const newAmount = goal.current_amount + amt
    const status: GoalStatus = newAmount >= goal.target_amount ? 'completed' : 'active'
    const { depositToGoal } = await import('./actions')
    const { data, error } = await depositToGoal({
      id: goal.id,
      name: goal.name,
      target_amount: goal.target_amount,
      new_current_amount: newAmount,
      status,
    })
    if (!error && data) {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? data : g)))
    }
    setDepositGoalId(null)
    setDepositAmount('')
  }

  const active = goals.filter((g) => g.status === 'active')
  const completed = goals.filter((g) => g.status === 'completed')
  const paused = goals.filter((g) => g.status === 'paused')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Metas</h1>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nueva meta
        </Button>
      </div>

      {goals.length === 0 && !showAdd && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Target className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-0.5">Sin metas todavía</p>
              <p className="text-xs text-muted-foreground">Creá tu primera meta de ahorro o inversión.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Crear meta
            </Button>
          </CardContent>
        </Card>
      )}

      {[{ list: active, label: 'Activas' }, { list: paused, label: 'Pausadas' }, { list: completed, label: 'Completadas' }].map(
        ({ list, label }) =>
          list.length > 0 && (
            <div key={label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{label}</p>
              <div className="flex flex-col gap-3">
                {list.map((goal) => {
                  const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
                  return (
                    <Card key={goal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: goal.color + '22' }}
                            >
                              <Target className="w-4.5 h-4.5" style={{ color: goal.color }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                              {goal.deadline && (
                                <p className="text-xs text-muted-foreground">Hasta {formatDate(goal.deadline)}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {goal.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {goal.status === 'paused' && <PauseCircle className="w-4 h-4 text-muted-foreground" />}
                            <button
                              onClick={() => handleDelete(goal.id)}
                              className="text-muted-foreground hover:text-destructive-foreground transition-colors p-1"
                              aria-label="Eliminar meta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">{formatCurrency(goal.current_amount, goal.currency)}</span>
                          <span className="text-xs font-semibold text-foreground">{pct}%</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(goal.target_amount, goal.currency)}</span>
                        </div>
                        <Progress value={pct} className="h-2 mb-3" style={{ '--progress-color': goal.color } as React.CSSProperties} />

                        {goal.status === 'active' && (
                          depositGoalId === goal.id ? (
                            <div className="flex gap-2">
                              <MoneyInput
                                placeholder="Monto a depositar"
                                value={depositAmount}
                                onChange={setDepositAmount}
                                className="h-8 text-sm"
                              />
                              <Button size="sm" className="h-8" onClick={() => handleDeposit(goal)}>Guardar</Button>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => setDepositGoalId(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => setDepositGoalId(goal.id)}
                            >
                              Registrar depósito
                            </Button>
                          )
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ),
      )}

      {/* Add goal modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-6 z-10">
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
