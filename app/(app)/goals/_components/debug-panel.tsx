'use client'

/**
 * Debug panel for /metas — toggleable via ?debug=1.
 *
 * Replaces the user's real goals with synthetic data so QA / design can
 * walk through the 7 scenarios from the prototype without seeding the DB.
 *
 * Gated behind NEXT_PUBLIC_DEBUG_PANELS=true so it can never reach prod
 * builds. The route also requires ?debug=1 — visiting /metas normally
 * never sees this.
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Goal } from '@/lib/types'

const SCENARIOS = ['empty', 'one', 'many', 'mixed', 'completed', 'overdue', 'detail'] as const
export type DebugScenario = (typeof SCENARIOS)[number]

const SCENARIO_LABELS: Record<DebugScenario, string> = {
  empty: 'Vacío',
  one: '1 meta',
  many: 'Varias',
  mixed: 'Mix',
  completed: 'Cumplidas',
  overdue: 'Vencida',
  detail: 'Detalle',
}

function isEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_PANELS === 'true'
}

/** Read scenario from `?debug=<scenario>`. Returns null when the panel is
 *  disabled or no scenario is selected, in which case the page renders
 *  real data normally. */
export function useDebugScenario(): { scenario: DebugScenario; goals: Goal[] } | null {
  const searchParams = useSearchParams()
  const debug = searchParams.get('debug')
  const enabled = isEnabled() && debug !== null && debug !== '0' && debug !== 'false'
  const scenario = (SCENARIOS as readonly string[]).includes(debug ?? '')
    ? (debug as DebugScenario)
    : 'many'

  const goals = useMemo(() => (enabled ? buildScenarioGoals(scenario) : []), [enabled, scenario])
  if (!enabled) return null
  return { scenario, goals }
}

export function DebugPanel() {
  const enabled = isEnabled()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debug = searchParams.get('debug')
  const active = enabled && debug !== null && debug !== '0' && debug !== 'false'
  const [open, setOpen] = useState(true)

  if (!enabled) return null

  function setScenario(s: DebugScenario | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (s === null) params.delete('debug')
    else params.set('debug', s)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-[280px]">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/60 shadow-xl backdrop-blur p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
              Debug · /metas
            </span>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline"
          >
            {open ? 'minimizar' : 'expandir'}
          </button>
        </div>

        {open && (
          <>
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-amber-700/70 dark:text-amber-400/70 font-medium mb-1.5">
                Escenario
              </div>
              <div className="flex flex-wrap gap-1">
                <ScenarioChip
                  label="Real"
                  active={!active}
                  onClick={() => setScenario(null)}
                />
                {SCENARIOS.map((s) => (
                  <ScenarioChip
                    key={s}
                    label={SCENARIO_LABELS[s]}
                    active={active && (debug === s || (debug === '1' && s === 'many'))}
                    onClick={() => setScenario(s)}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 text-[10px] text-amber-700/70 dark:text-amber-400/70 leading-relaxed">
              Los datos en pantalla son sintéticos. Las acciones (crear / depositar / liquidar) no se persisten.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ScenarioChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        'h-6 px-2 rounded-full text-[10px] font-medium transition ' +
        (active
          ? 'bg-amber-500 text-white'
          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20')
      }
    >
      {label}
    </button>
  )
}

// ─── Synthetic data ─────────────────────────────────────────────────────────
//
// Mirror the prototype's ALL_GOALS (design-refs/goals/goals-data.jsx) but
// adapted to the real Goal shape. We do not include `series` here — the
// real seriesByGoal in the page is empty in debug mode, which means the
// sparkline doesn't render (matches the "hide on no deposits" rule).

const TODAY = new Date()

function offsetDate(months: number): string {
  const d = new Date(TODAY)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function isoOffset(days: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const G = {
  bariloche: (): Goal => ({
    id: 'dbg-1',
    user_id: 'debug',
    name: 'Bariloche en julio',
    target_amount: 2400,
    current_amount: 1800,
    currency: 'USD',
    deadline: offsetDate(3),
    status: 'active',
    category: 'viaje',
    monthly_target: 200,
    auto_enabled: true,
    auto_amount: 200,
    auto_day: 5,
    note: null,
    completed_at: null,
    created_at: isoOffset(-270),
    updated_at: isoOffset(-2),
  }),
  auto: (): Goal => ({
    id: 'dbg-2',
    user_id: 'debug',
    name: 'Auto 0km',
    target_amount: 18000,
    current_amount: 6300,
    currency: 'USD',
    deadline: offsetDate(20),
    status: 'active',
    category: 'auto',
    monthly_target: 700,
    auto_enabled: true,
    auto_amount: 700,
    auto_day: 5,
    note: null,
    completed_at: null,
    created_at: isoOffset(-420),
    updated_at: isoOffset(-1),
  }),
  emergencia: (): Goal => ({
    id: 'dbg-3',
    user_id: 'debug',
    name: 'Fondo de emergencia',
    target_amount: 6000,
    current_amount: 5400,
    currency: 'USD',
    deadline: null,
    status: 'active',
    category: 'emergencia',
    monthly_target: 200,
    auto_enabled: true,
    auto_amount: 200,
    auto_day: 5,
    note: null,
    completed_at: null,
    created_at: isoOffset(-660),
    updated_at: isoOffset(-3),
  }),
  notebook: (): Goal => ({
    id: 'dbg-4',
    user_id: 'debug',
    name: 'Notebook nueva',
    target_amount: 2200000,
    current_amount: 540000,
    currency: 'ARS',
    deadline: offsetDate(6),
    status: 'active',
    category: 'otro',
    monthly_target: 220000,
    auto_enabled: false,
    auto_amount: null,
    auto_day: null,
    note: null,
    completed_at: null,
    created_at: isoOffset(-90),
    updated_at: isoOffset(-1),
  }),
  depto: (): Goal => ({
    id: 'dbg-5',
    user_id: 'debug',
    name: 'Cuotas iniciales depto',
    target_amount: 25000,
    current_amount: 8200,
    currency: 'USD',
    deadline: offsetDate(28),
    status: 'active',
    category: 'casa',
    monthly_target: 850,
    auto_enabled: true,
    auto_amount: 850,
    auto_day: 10,
    note: null,
    completed_at: null,
    created_at: isoOffset(-270),
    updated_at: isoOffset(-1),
  }),
  curso: (): Goal => ({
    id: 'dbg-6',
    user_id: 'debug',
    name: 'Curso de UX research',
    target_amount: 1500,
    current_amount: 1500,
    currency: 'USD',
    deadline: offsetDate(-1),
    status: 'completed',
    category: 'inversion',
    monthly_target: 250,
    auto_enabled: false,
    auto_amount: null,
    auto_day: null,
    note: null,
    completed_at: isoOffset(-7),
    created_at: isoOffset(-180),
    updated_at: isoOffset(-7),
  }),
  bici: (): Goal => ({
    id: 'dbg-7',
    user_id: 'debug',
    name: 'Bicicleta gravel',
    target_amount: 1800,
    current_amount: 720,
    currency: 'USD',
    deadline: offsetDate(-1),
    status: 'active',
    category: 'otro',
    monthly_target: 180,
    auto_enabled: false,
    auto_amount: null,
    auto_day: null,
    note: null,
    completed_at: null,
    created_at: isoOffset(-150),
    updated_at: isoOffset(-30),
  }),
}

function buildScenarioGoals(scenario: DebugScenario): Goal[] {
  switch (scenario) {
    case 'empty':
      return []
    case 'one':
      return [G.bariloche()]
    case 'many':
      return [G.bariloche(), G.auto(), G.emergencia(), G.notebook(), G.depto()]
    case 'completed':
      return [G.curso(), { ...G.bariloche(), id: 'dbg-c2', name: 'Notebook M2', current_amount: 1800, target_amount: 1800, status: 'completed', completed_at: isoOffset(-2) }]
    case 'overdue':
      return [G.bici(), G.bariloche(), G.auto()]
    case 'detail':
      return [G.bariloche()]
    case 'mixed':
    default:
      return [G.bariloche(), G.auto(), G.emergencia(), G.notebook(), G.depto(), G.curso(), G.bici()]
  }
}
