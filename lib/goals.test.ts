import { describe, it, expect } from 'vitest'
import { deriveGoal, sortGoals, buildSeries, aggregateGoals, toUSD } from './goals'
import type { Goal } from './types'

function mk(g: Partial<Goal>): Goal {
  return {
    id: g.id ?? 't1',
    user_id: 'u1',
    name: g.name ?? 'Test',
    target_amount: g.target_amount ?? 1000,
    current_amount: g.current_amount ?? 0,
    currency: g.currency ?? 'USD',
    deadline: g.deadline ?? null,
    status: g.status ?? 'active',
    category: g.category ?? 'otro',
    monthly_target: g.monthly_target ?? null,
    auto_enabled: g.auto_enabled ?? false,
    auto_amount: g.auto_amount ?? null,
    auto_day: g.auto_day ?? null,
    note: g.note ?? null,
    completed_at: g.completed_at ?? null,
    liquidated_at: g.liquidated_at ?? null,
    liquidation_transaction_id: g.liquidation_transaction_id ?? null,
    created_at: g.created_at ?? '2025-01-01T00:00:00Z',
    updated_at: g.updated_at ?? '2025-01-01T00:00:00Z',
  }
}

describe('deriveGoal', () => {
  const NOW = new Date('2026-04-25T12:00:00Z')

  it('computes pct, remaining and onTrack with deadline', () => {
    const g = mk({
      target_amount: 2400,
      current_amount: 1800,
      monthly_target: 200,
      deadline: '2026-07-25', // 3 months ahead
    })
    const d = deriveGoal(g, NOW)
    expect(d.pct).toBe(75)
    expect(d.remaining).toBe(600)
    expect(d.monthsLeft).toBe(3)
    // requiredMonthly = 600 / 3 = 200; monthly_target = 200 → onTrack
    expect(d.requiredMonthly).toBe(200)
    expect(d.onTrack).toBe(true)
    expect(d.overdue).toBe(false)
  })

  it('flags overdue when deadline is in the past and goal is open', () => {
    const g = mk({
      target_amount: 1000,
      current_amount: 200,
      deadline: '2026-04-10', // before NOW
    })
    expect(deriveGoal(g, NOW).overdue).toBe(true)
  })

  it('does NOT flag overdue when goal is completed', () => {
    const g = mk({
      target_amount: 1000,
      current_amount: 1000,
      status: 'completed',
      deadline: '2026-04-10',
    })
    expect(deriveGoal(g, NOW).overdue).toBe(false)
  })

  it('handles no deadline (treats requiredMonthly = remaining)', () => {
    const g = mk({ target_amount: 1000, current_amount: 600, deadline: null })
    const d = deriveGoal(g, NOW)
    expect(d.daysLeft).toBeNull()
    expect(d.monthsLeft).toBeNull()
    expect(d.requiredMonthly).toBe(400)
    expect(d.overdue).toBe(false)
  })

  it('handles target_amount = 0 without dividing by zero', () => {
    const g = mk({ target_amount: 0, current_amount: 0 })
    const d = deriveGoal(g, NOW)
    expect(d.pct).toBe(0)
    expect(d.remaining).toBe(0)
  })

  it('treats deadline = today as monthsLeft 0 with requiredMonthly = remaining', () => {
    const today = NOW.toISOString().slice(0, 10)
    const g = mk({ target_amount: 1000, current_amount: 200, deadline: today })
    const d = deriveGoal(g, NOW)
    expect(d.daysLeft).toBe(0)
    expect(d.monthsLeft).toBe(0)
    expect(d.requiredMonthly).toBe(800)
  })

  it('onTrack false when no monthly_target configured', () => {
    const g = mk({ target_amount: 1000, current_amount: 100, monthly_target: null, deadline: '2027-01-01' })
    expect(deriveGoal(g, NOW).onTrack).toBe(false)
  })

  it('onTrack uses 95% tolerance', () => {
    const g = mk({ target_amount: 1000, current_amount: 0, monthly_target: 95, deadline: addMonths(NOW, 10) })
    // requiredMonthly = 1000/10 = 100. 95 >= 100 * 0.95 = 95 → onTrack.
    expect(deriveGoal(g, NOW).onTrack).toBe(true)
    const g2 = mk({ ...g, monthly_target: 94 })
    expect(deriveGoal(g2, NOW).onTrack).toBe(false)
  })
})

describe('sortGoals', () => {
  it('sorts by progress descending', () => {
    const a = mk({ id: 'a', target_amount: 1000, current_amount: 200 })
    const b = mk({ id: 'b', target_amount: 1000, current_amount: 800 })
    const c = mk({ id: 'c', target_amount: 1000, current_amount: 500 })
    const sorted = sortGoals([a, b, c], 'progress').map((g) => g.id)
    expect(sorted).toEqual(['b', 'c', 'a'])
  })

  it('sorts by deadline (no-deadline goes last)', () => {
    const a = mk({ id: 'a', deadline: '2027-01-01' })
    const b = mk({ id: 'b', deadline: null })
    const c = mk({ id: 'c', deadline: '2026-06-01' })
    const sorted = sortGoals([a, b, c], 'deadline').map((g) => g.id)
    expect(sorted).toEqual(['c', 'a', 'b'])
  })
})

describe('buildSeries', () => {
  it('returns null on empty deposits (UI hides sparkline)', () => {
    expect(buildSeries([])).toBeNull()
  })

  it('returns cumulative sum sorted by date', () => {
    const series = buildSeries([
      { amount: 200, date: '2026-02-05' },
      { amount: 100, date: '2026-01-05' },
      { amount: 300, date: '2026-03-05' },
    ])
    expect(series).toEqual([100, 300, 600])
  })
})

describe('aggregateGoals', () => {
  it('combines USD and ARS using MEP', () => {
    const g1 = mk({ id: '1', currency: 'USD', target_amount: 1000, current_amount: 250 })
    const g2 = mk({ id: '2', currency: 'ARS', target_amount: 1_100_000, current_amount: 550_000 })
    const agg = aggregateGoals([g1, g2], 1100)
    // g2: 1.1M / 1100 = 1000 USD target, 500 USD saved
    expect(agg.totalSavedUSD).toBe(750)
    expect(agg.totalTargetUSD).toBe(2000)
    expect(Math.round(agg.globalPct)).toBe(38)
  })

  it('falls back to raw amounts when MEP rate unavailable (still sums but mixed)', () => {
    const g = mk({ currency: 'ARS', target_amount: 100, current_amount: 50 })
    const agg = aggregateGoals([g], 0)
    expect(agg.totalSavedUSD).toBe(50)
    expect(agg.totalTargetUSD).toBe(100)
  })
})

describe('toUSD', () => {
  it('USD passthrough', () => {
    expect(toUSD(100, 'USD', 1100)).toBe(100)
  })
  it('ARS divides by rate', () => {
    expect(toUSD(1100, 'ARS', 1100)).toBe(1)
  })
  it('rate = 0 returns raw ARS (caller should handle)', () => {
    expect(toUSD(1100, 'ARS', 0)).toBe(1100)
  })
})

function addMonths(d: Date, n: number): string {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r.toISOString().slice(0, 10)
}
