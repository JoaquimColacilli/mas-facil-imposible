/**
 * Goals — static category metadata + pure derivation helpers.
 *
 * Note on tokens: the prototype used custom `sage`/`copper`/`parchment`
 * OKLCH tokens. We map to the project's existing palette to stay
 * consistent across screens (see PR description). The 6 category hexes
 * are functional identifiers — they stay literal.
 */

import type {
  Goal,
  GoalCategory,
  Transaction,
  Currency,
} from '@/lib/types'
import {
  Plane,
  Car,
  Home,
  Shield,
  TrendingUp,
  Target,
  type LucideIcon,
} from 'lucide-react'

// ─── Category metadata (single source of truth) ─────────────────────────────

export interface CategoryMeta {
  id: GoalCategory
  label: string
  /** Functional identifier color — literal hex by design. */
  color: string
  icon: LucideIcon
}

export const CATEGORY_META: Record<GoalCategory, CategoryMeta> = {
  viaje:      { id: 'viaje',      label: 'Viaje',      color: '#3b82f6', icon: Plane },
  auto:       { id: 'auto',       label: 'Auto',       color: '#a855f7', icon: Car },
  casa:       { id: 'casa',       label: 'Casa',       color: '#10b981', icon: Home },
  emergencia: { id: 'emergencia', label: 'Emergencia', color: '#ef4444', icon: Shield },
  inversion:  { id: 'inversion',  label: 'Inversión',  color: '#f59e0b', icon: TrendingUp },
  otro:       { id: 'otro',       label: 'Otro',       color: '#64748b', icon: Target },
}

export const CATEGORY_LIST: CategoryMeta[] = Object.values(CATEGORY_META)

export function categoryOf(goal: Pick<Goal, 'category'>): CategoryMeta {
  return CATEGORY_META[goal.category] ?? CATEGORY_META.otro
}

// ─── Sort options ───────────────────────────────────────────────────────────

export type GoalSort = 'progress' | 'deadline' | 'amount' | 'recent'

export const SORT_LABELS: Record<GoalSort, string> = {
  progress: 'Más cerca de cumplir',
  deadline: 'Fecha más próxima',
  amount: 'Mayor monto',
  recent: 'Más recientes',
}

// ─── Derivation ─────────────────────────────────────────────────────────────

export interface GoalDerived {
  /** 0-100 integer. */
  pct: number
  remaining: number
  /** Days from today to deadline. Negative = overdue. Null = no deadline. */
  daysLeft: number | null
  /** Months from today to deadline (rounded). Null = no deadline. */
  monthsLeft: number | null
  /** Required monthly contribution to hit target by deadline.
   *  Equals `remaining` when there's no deadline (treats "now" as the window). */
  requiredMonthly: number
  /** True when monthly_target >= 95% of requiredMonthly. False if no
   *  monthly_target configured. */
  onTrack: boolean
  /** True when deadline is in the past and goal isn't completed/liquidated. */
  overdue: boolean
}

/** Derive computed fields. Pure — easy to unit-test. */
export function deriveGoal(goal: Goal, now: Date = new Date()): GoalDerived {
  const target = Math.max(0, goal.target_amount)
  const current = Math.max(0, goal.current_amount)
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const remaining = Math.max(0, target - current)

  let daysLeft: number | null = null
  let monthsLeft: number | null = null
  if (goal.deadline) {
    const deadline = new Date(goal.deadline + 'T00:00:00')
    const ms = deadline.getTime() - startOfDay(now).getTime()
    daysLeft = Math.round(ms / 86400000)
    monthsLeft = Math.max(0, Math.round(daysLeft / 30))
  }

  const requiredMonthly =
    monthsLeft != null && monthsLeft > 0 ? remaining / monthsLeft : remaining

  const monthlyTarget = goal.monthly_target ?? 0
  const onTrack = monthlyTarget > 0 && monthlyTarget >= requiredMonthly * 0.95

  const isClosed = goal.status === 'completed' || goal.status === 'liquidated'
  const overdue = !isClosed && daysLeft != null && daysLeft < 0

  return { pct, remaining, daysLeft, monthsLeft, requiredMonthly, onTrack, overdue }
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

// ─── USD-equivalent aggregation (uses MEP) ──────────────────────────────────

/** Convert a (amount, currency) tuple to USD using the provided MEP rate.
 *  ARS rate ≤ 0 returns the original ARS amount unchanged — caller should
 *  treat the rate as unavailable and avoid mixing. */
export function toUSD(amount: number, currency: Currency, mepArsPerUsd: number): number {
  if (currency === 'USD') return amount
  if (mepArsPerUsd <= 0) return amount
  return amount / mepArsPerUsd
}

export interface GoalsAggregate {
  totalSavedUSD: number
  totalTargetUSD: number
  globalPct: number
  activeCount: number
  completedCount: number
  overdueCount: number
}

export function aggregateGoals(goals: Goal[], mepArsPerUsd: number): GoalsAggregate {
  let totalSavedUSD = 0
  let totalTargetUSD = 0
  let activeCount = 0
  let completedCount = 0
  let overdueCount = 0
  const now = new Date()
  for (const g of goals) {
    totalSavedUSD += toUSD(g.current_amount, g.currency, mepArsPerUsd)
    totalTargetUSD += toUSD(g.target_amount, g.currency, mepArsPerUsd)
    if (g.status === 'active') activeCount++
    if (g.status === 'completed') completedCount++
    if (deriveGoal(g, now).overdue) overdueCount++
  }
  const globalPct = totalTargetUSD > 0
    ? Math.min(100, (totalSavedUSD / totalTargetUSD) * 100)
    : 0
  return {
    totalSavedUSD,
    totalTargetUSD,
    globalPct,
    activeCount,
    completedCount,
    overdueCount,
  }
}

// ─── Sorting ────────────────────────────────────────────────────────────────

export function sortGoals(goals: Goal[], sort: GoalSort): Goal[] {
  const xs = [...goals]
  const FAR_FUTURE = 8.64e15
  switch (sort) {
    case 'progress':
      return xs.sort((a, b) => deriveGoal(b).pct - deriveGoal(a).pct)
    case 'deadline':
      return xs.sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : FAR_FUTURE
        const db = b.deadline ? new Date(b.deadline).getTime() : FAR_FUTURE
        return da - db
      })
    case 'amount':
      return xs.sort((a, b) => b.target_amount - a.target_amount)
    case 'recent':
      return xs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
  }
}

// ─── Sparkline series from deposits ─────────────────────────────────────────

/** Build a cumulative-deposits series from raw transactions. Returns null
 *  when there are no deposits — the UI hides the sparkline rather than
 *  showing a flat zero line. */
export function buildSeries(deposits: Pick<Transaction, 'amount' | 'date'>[]): number[] | null {
  if (deposits.length === 0) return null
  const sorted = [...deposits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  let cum = 0
  return sorted.map((d) => (cum += d.amount))
}

// ─── Confetti seen-tracking (localStorage) ──────────────────────────────────
//
// We don't want to fire confetti every time a card with a completed goal is
// painted. Track per-goal whether the user has already seen the celebration
// for that completion (keyed by completed_at to fire again if the user
// re-completes a goal — edge case, but cheap).

const SEEN_KEY = 'mfi-goals-confetti-seen'

interface SeenMap {
  [goalId: string]: string // completed_at iso
}

function readSeen(): SeenMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as SeenMap
  } catch {
    return {}
  }
}

function writeSeen(map: SeenMap) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map))
  } catch {
    // quota — ignore
  }
}

/** Returns true exactly once per (goalId, completed_at) tuple. After the
 *  first call the entry is recorded and subsequent calls return false. */
export function shouldShowConfetti(goalId: string, completedAt: string | null | undefined): boolean {
  if (!completedAt) return false
  const map = readSeen()
  if (map[goalId] === completedAt) return false
  map[goalId] = completedAt
  writeSeen(map)
  return true
}

// ─── Currency formatting ────────────────────────────────────────────────────
//
// `formatCurrency` from lib/types.ts is fine for most cases, but the goals
// hero shows large USD-equivalent totals where rounded display feels right.

export function formatUSDRounded(n: number): string {
  return 'U$S ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n))
}

export function formatPct(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n) + '%'
}
