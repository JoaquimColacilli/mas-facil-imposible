'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Plus, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Goal, Category, GoalCategory } from '@/lib/types'
import {
  buildSeries,
  sortGoals,
  type GoalSort,
  CATEGORY_LIST,
} from '@/lib/goals'
import { useUsdRate } from '@/hooks/use-usd-rate'
import { GoalsHero } from './_components/goals-hero'
import { GoalsFilters, type FilterValue } from './_components/goals-filters'
import { GoalCard } from './_components/goal-card'
import { GoalsEmpty, type GoalTemplate } from './_components/empty-state'
import { CreateGoalModal, type CreateModalSubmit } from './_components/create-goal-modal'
import { LiquidateGoalModal } from './_components/liquidate-goal-modal'
import { DepositModal } from './_components/deposit-modal'
import { DebugPanel, useDebugScenario } from './_components/debug-panel'
import {
  createGoal,
  updateGoal,
  setGoalStatus,
  depositToGoal,
  liquidateGoal,
  deleteGoal,
} from './actions'

export type GoalSeries = { amount: number; date: string }[]

interface GoalsClientProps {
  goals: Goal[]
  seriesByGoal: Record<string, GoalSeries>
  incomeCategories: Category[]
}

export function GoalsClient({
  goals: initialGoals,
  seriesByGoal,
  incomeCategories,
}: GoalsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { rate: mepRate } = useUsdRate()

  // ?debug=1 swaps the data with synthetic scenarios.
  const debugScenario = useDebugScenario()
  const goalsFromState = useState<Goal[]>(initialGoals)
  const [goals, setGoals] = goalsFromState
  const effectiveGoals = debugScenario?.goals ?? goals

  // URL state
  const filter: FilterValue = (searchParams.get('cat') as FilterValue) || 'all'
  const sort: GoalSort = (searchParams.get('sort') as GoalSort) || 'progress'

  function setQuery(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) params.delete(k)
      else params.set(k, v)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [createTemplate, setCreateTemplate] = useState<GoalTemplate | null>(null)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null)
  const [liquidateGoalState, setLiquidateGoalState] = useState<Goal | null>(null)

  // Filter + sort
  const visibleGoals = useMemo(() => {
    const filtered = filter === 'all' ? effectiveGoals : effectiveGoals.filter((g) => g.category === filter)
    return sortGoals(filtered, sort)
  }, [effectiveGoals, filter, sort])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: effectiveGoals.length }
    for (const cat of CATEGORY_LIST) c[cat.id] = 0
    for (const g of effectiveGoals) c[g.category] = (c[g.category] ?? 0) + 1
    return c
  }, [effectiveGoals])

  const sections = useMemo(() => {
    const active = visibleGoals.filter((g) => g.status === 'active')
    const paused = visibleGoals.filter((g) => g.status === 'paused')
    const completed = visibleGoals.filter((g) => g.status === 'completed')
    const liquidated = visibleGoals.filter((g) => g.status === 'liquidated')
    return { active, paused, completed, liquidated }
  }, [visibleGoals])

  const monthLabel = useMemo(() =>
    new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
  [])

  // ─── Mutation wrappers (skipped when debug scenario active) ────────────────

  const isDebug = !!debugScenario

  const handleCreate = useCallback(
    async (input: CreateModalSubmit) => {
      if (isDebug) {
        toast.info('Modo debug: la meta no se guarda.')
        return { error: null }
      }
      const { data, error } = await createGoal(input)
      if (error) {
        toast.error('No se pudo crear la meta.')
        return { error }
      }
      if (data) {
        setGoals((prev) => [data, ...prev])
        toast.success('Meta creada')
      }
      return { error: null }
    },
    [isDebug, setGoals],
  )

  const handleUpdate = useCallback(
    async (id: string, input: CreateModalSubmit) => {
      if (isDebug) {
        toast.info('Modo debug: cambios no se guardan.')
        return { error: null }
      }
      const { data, error } = await updateGoal({ id, ...input, current_amount: 0 } as Parameters<typeof updateGoal>[0])
      if (error) {
        toast.error('No se pudo guardar.')
        return { error }
      }
      if (data) {
        setGoals((prev) => prev.map((g) => (g.id === id ? data : g)))
        toast.success('Meta actualizada')
      }
      return { error: null }
    },
    [isDebug, setGoals],
  )

  const handleDeposit = useCallback(
    async (input: { goal: Goal; amount: number; note: string | null; date: string }) => {
      if (isDebug) {
        toast.info('Modo debug: depósito no se guarda.')
        return { error: null }
      }
      const { data, error } = await depositToGoal({
        goal: input.goal,
        amount: input.amount,
        date: input.date,
        note: input.note,
      })
      if (error) {
        toast.error('No se pudo depositar.')
        return { error }
      }
      if (data) {
        setGoals((prev) => prev.map((g) => (g.id === data.id ? data : g)))
        // Note: the cumulative series for this goal will only reflect the new
        // deposit on next page load. Acceptable trade-off — we'd need to
        // revalidate or push to seriesByGoal in state otherwise.
        toast.success(
          data.status === 'completed'
            ? `¡Cumpliste “${data.name}”!`
            : `Depósito en ${data.name}`,
        )
      }
      return { error: null }
    },
    [isDebug, setGoals],
  )

  const handleLiquidate = useCallback(
    async (input: { goalId: string; categoryId: string | null; note: string | null }) => {
      if (isDebug) {
        toast.info('Modo debug: liquidación no se ejecuta.')
        return { error: null }
      }
      const { data, error } = await liquidateGoal(input)
      if (error) {
        toast.error('No se pudo liquidar.')
        return { error }
      }
      if (data) {
        setGoals((prev) => prev.map((g) => (g.id === data.id ? data : g)))
        toast.success('Meta liquidada · movimiento creado')
      }
      return { error: null }
    },
    [isDebug, setGoals],
  )

  const handlePause = useCallback(async (goal: Goal) => {
    if (isDebug) return
    const { data, error } = await setGoalStatus(goal.id, 'paused')
    if (error) { toast.error('No se pudo pausar.'); return }
    if (data) setGoals((prev) => prev.map((g) => (g.id === goal.id ? data : g)))
    toast.success('Meta pausada')
  }, [isDebug, setGoals])

  const handleReactivate = useCallback(async (goal: Goal) => {
    if (isDebug) return
    const { data, error } = await setGoalStatus(goal.id, 'active')
    if (error) { toast.error('No se pudo reactivar.'); return }
    if (data) setGoals((prev) => prev.map((g) => (g.id === goal.id ? data : g)))
    toast.success('Meta reactivada')
  }, [isDebug, setGoals])

  const handleDelete = useCallback(async (goal: Goal) => {
    if (isDebug) return
    if (!confirm(`¿Eliminar "${goal.name}"? Los depósitos quedan en el histórico de movimientos.`)) return
    const { error } = await deleteGoal(goal.id)
    if (error) { toast.error('No se pudo eliminar.'); return }
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    toast.success('Meta eliminada')
  }, [isDebug, setGoals])

  // ─── Render ────────────────────────────────────────────────────────────────

  const showEmpty = effectiveGoals.length === 0
  const noResults = effectiveGoals.length > 0 && visibleGoals.length === 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader onNew={() => { setCreateTemplate(null); setEditing(null); setCreateOpen(true) }} count={effectiveGoals.length} />

      {showEmpty ? (
        <GoalsEmpty onNew={(t) => {
          setCreateTemplate(t ?? null)
          setEditing(null)
          setCreateOpen(true)
        }} />
      ) : (
        <>
          <GoalsHero
            goals={effectiveGoals}
            mepRate={mepRate}
            monthLabel={monthLabel}
            onNew={() => { setCreateTemplate(null); setEditing(null); setCreateOpen(true) }}
          />

          <GoalsFilters
            filter={filter}
            setFilter={(v) => setQuery({ cat: v === 'all' ? null : v })}
            sort={sort}
            setSort={(v) => setQuery({ sort: v === 'progress' ? null : v })}
            counts={counts}
          />

          {noResults ? (
            <div className="rounded-2xl bg-card border border-border p-10 text-center">
              <p className="text-foreground font-medium">No hay metas en esa categoría.</p>
              <p className="text-muted-foreground text-sm mt-1">Probá quitar el filtro o crear una.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sections.active.length > 0 && (
                <Section title="Activas" hint="Tus metas en marcha" count={sections.active.length}>
                  {sections.active.map((g) => (
                    <GoalCard
                      key={g.id}
                      goal={g}
                      series={buildSeries(seriesByGoal[g.id] ?? [])}
                      onDeposit={(goal) => setDepositGoal(goal)}
                      onPause={handlePause}
                      onEdit={(goal) => { setEditing(goal); setCreateTemplate(null); setCreateOpen(true) }}
                      onDelete={handleDelete}
                    />
                  ))}
                </Section>
              )}
              {sections.paused.length > 0 && (
                <Section title="Pausadas" count={sections.paused.length}>
                  {sections.paused.map((g) => (
                    <GoalCard
                      key={g.id}
                      goal={g}
                      series={buildSeries(seriesByGoal[g.id] ?? [])}
                      onReactivate={handleReactivate}
                      onEdit={(goal) => { setEditing(goal); setCreateTemplate(null); setCreateOpen(true) }}
                      onDelete={handleDelete}
                    />
                  ))}
                </Section>
              )}
              {sections.completed.length > 0 && (
                <Section title="Cumplidas" hint="Buen trabajo" count={sections.completed.length}>
                  {sections.completed.map((g) => (
                    <GoalCard
                      key={g.id}
                      goal={g}
                      series={buildSeries(seriesByGoal[g.id] ?? [])}
                      onLiquidate={(goal) => setLiquidateGoalState(goal)}
                      onDelete={handleDelete}
                    />
                  ))}
                </Section>
              )}
              {sections.liquidated.length > 0 && (
                <Section title="Liquidadas" hint="Histórico" count={sections.liquidated.length}>
                  {sections.liquidated.map((g) => (
                    <GoalCard
                      key={g.id}
                      goal={g}
                      series={buildSeries(seriesByGoal[g.id] ?? [])}
                      onDelete={handleDelete}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </>
      )}

      <CreateGoalModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateTemplate(null); setEditing(null) }}
        template={createTemplate}
        editing={editing}
        onSubmit={(input) => editing ? handleUpdate(editing.id, input) : handleCreate(input)}
      />

      <DepositModal
        open={!!depositGoal}
        onClose={() => setDepositGoal(null)}
        goal={depositGoal}
        onConfirm={handleDeposit}
      />

      <LiquidateGoalModal
        open={!!liquidateGoalState}
        onClose={() => setLiquidateGoalState(null)}
        goal={liquidateGoalState}
        incomeCategories={incomeCategories}
        onConfirm={handleLiquidate}
      />

      <DebugPanel />
    </div>
  )
}

function PageHeader({ onNew, count }: { onNew: () => void; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">/metas</div>
        <h1 className="font-bold text-foreground" style={{ fontSize: 28 }}>
          Metas
          {count > 0 && <span className="ml-2 font-mono text-muted-foreground font-semibold text-[15px]">{count}</span>}
        </h1>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 hidden md:inline-flex">
            <Info className="w-3.5 h-3.5" />
            Cómo funcionan
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 text-[13px] leading-relaxed space-y-2">
          <p className="font-semibold text-foreground">Cómo funcionan las metas</p>
          <p className="text-muted-foreground" style={{ textWrap: 'pretty' as never }}>
            Una meta es un objetivo de ahorro con un monto y, opcionalmente, una fecha límite.
            Cada depósito que registres queda en tu historial de movimientos vinculado a la meta.
          </p>
          <p className="text-muted-foreground" style={{ textWrap: 'pretty' as never }}>
            Configurá un <span className="font-medium text-foreground">aporte mensual</span> para
            que la app te avise si vas en ritmo o atrás. Si activás{' '}
            <span className="font-medium text-foreground">ahorro automático</span>, queda anotado
            como configuración (el cron real entra en una próxima versión).
          </p>
          <p className="text-muted-foreground" style={{ textWrap: 'pretty' as never }}>
            Cuando la cumplas, podés <span className="font-medium text-foreground">liquidarla</span>:
            se genera un movimiento de ingreso por el total y la meta queda en histórico.
          </p>
        </PopoverContent>
      </Popover>
      <Button onClick={onNew} className="gap-1.5">
        <Plus className="w-4 h-4" />
        Nueva meta
      </Button>
    </div>
  )
}

function Section({
  title,
  count,
  hint,
  children,
}: {
  title: string
  count: number
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-semibold text-foreground text-[18px]">{title}</h2>
          <span className="font-mono text-muted-foreground text-[13px]">{count}</span>
        </div>
        {hint && (
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">{hint}</span>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{children}</div>
    </section>
  )
}
