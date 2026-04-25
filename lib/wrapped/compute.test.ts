import { describe, expect, it } from 'vitest'
import type { Goal, PortfolioLog, Transaction } from '@/lib/types'
import { computeWrapped } from './compute'
import { pickEquivalents } from './equivalents'
import { derivePersonality } from './personality'

const YEAR = 2026
const MONTH0 = 3 // Abril

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? crypto.randomUUID(),
    user_id: 'u1',
    category_id: partial.category_id ?? null,
    type: partial.type ?? 'expense',
    amount: partial.amount ?? 0,
    currency: partial.currency ?? 'ARS',
    date: partial.date ?? '2026-04-14',
    note: partial.note ?? null,
    status: partial.status ?? 'confirmed',
    payment_method: null,
    sheet_id: null,
    is_recurring: false,
    recurring_source_id: null,
    created_at: '2026-04-14T00:00:00Z',
    updated_at: '2026-04-14T00:00:00Z',
    category: partial.category ?? null,
  }
}

function cat(name: string, color = '#ef4444', icon = 'ShoppingCart') {
  return { id: 'c1', user_id: 'u1', name, icon, color, type: 'expense' as const, created_at: '' }
}

describe('computeWrapped — positive month', () => {
  it('builds totals, balance and top category for a standard month', () => {
    const transactions: Transaction[] = [
      tx({ type: 'income', amount: 485_000, date: '2026-04-05' }),
      tx({ type: 'expense', amount: 142_300, date: '2026-04-14', category: cat('Supermercado') }),
      tx({ type: 'expense', amount: 58_200, date: '2026-04-10', category: cat('Delivery', '#f59e0b') }),
      tx({ type: 'expense', amount: 41_800, date: '2026-04-22', category: cat('Transporte', '#3b82f6') }),
      tx({ type: 'expense', amount: 117_300, date: '2026-04-05', category: cat('Supermercado') }),
      tx({ type: 'savings', amount: 45_000, date: '2026-04-28' }),
      tx({ type: 'investment', amount: 42_000, date: '2026-04-28' }),
      tx({ type: 'income', amount: 50, currency: 'USD', date: '2026-04-05' }),
    ]
    const result = computeWrapped({
      year: YEAR,
      month0: MONTH0,
      transactions,
      previousTransactions: [
        tx({ type: 'income', amount: 400_000, date: '2026-03-01' }),
        tx({ type: 'expense', amount: 300_000, date: '2026-03-20' }),
        tx({ type: 'savings', amount: 30_000, date: '2026-03-30' }),
      ],
      goals: [],
      portfolioLogs: [],
      profile: { full_name: 'Lucía Romero', nickname: null, mood_emoji: '🌤️' },
    })

    expect(result.empty).toBe(false)
    expect(result.totals.movements).toBe(8)
    expect(result.balance.income).toBe(485_000)
    expect(result.balance.expense).toBe(359_600)
    expect(result.balance.ars).toBe(125_400)
    expect(result.topCategory?.name).toBe('Supermercado')
    // top = 259600; total expense = 359600 → ≈72%
    expect(result.topCategory?.pctOfExpenses).toBe(72)
    expect(result.user.initials).toBe('LR')
    expect(result.savings.savings + result.savings.investment).toBe(87_000)
  })

  it('derives "ahorrista" when apartado/income >= 20%', () => {
    const p = derivePersonality({
      income: 500_000,
      expense: 300_000,
      savings: 80_000,
      investment: 40_000,
      expenseDeltaVsPrev: 0,
      socialSpend: 20_000,
      movementCount: 40,
    })
    expect(p).toBe('ahorrista')
  })

  it('derives "inversor" when investment > savings', () => {
    const p = derivePersonality({
      income: 500_000,
      expense: 300_000,
      savings: 20_000,
      investment: 80_000,
      expenseDeltaVsPrev: 0,
      socialSpend: 0,
      movementCount: 40,
    })
    expect(p).toBe('inversor')
  })

  it('derives "austero" only when previous month exists and drop >= 18% with low count', () => {
    const p = derivePersonality({
      income: 200_000,
      expense: 80_000,
      savings: 0,
      investment: 0,
      expenseDeltaVsPrev: -25,
      socialSpend: 0,
      movementCount: 10,
    })
    expect(p).toBe('austero')
  })

  it('defaults to "equilibrado" when no other rule hits', () => {
    const p = derivePersonality({
      income: 500_000,
      expense: 400_000,
      savings: 10_000,
      investment: 10_000,
      expenseDeltaVsPrev: 5,
      socialSpend: 10_000,
      movementCount: 50,
    })
    expect(p).toBe('equilibrado')
  })
})

describe('computeWrapped — negative month', () => {
  it('produces negative balance with amable copy hooks', () => {
    const transactions: Transaction[] = [
      tx({ type: 'income', amount: 412_000, date: '2026-04-05' }),
      tx({ type: 'expense', amount: 480_400, date: '2026-04-22', category: cat('Delivery', '#f59e0b') }),
    ]
    const result = computeWrapped({
      year: YEAR,
      month0: MONTH0,
      transactions,
      previousTransactions: [
        tx({ type: 'income', amount: 400_000, date: '2026-03-01' }),
        tx({ type: 'expense', amount: 350_000, date: '2026-03-20' }),
      ],
      goals: [],
      portfolioLogs: [],
      profile: { full_name: 'Lucía Romero', nickname: null, mood_emoji: '😬' },
    })

    expect(result.balance.ars).toBe(-68_400)
    expect(result.balance.deltaVsPrev).toBeLessThan(0)
    expect(result.topCategory?.name).toBe('Delivery')
  })
})

describe('computeWrapped — empty and low-activity months', () => {
  it('flags empty when there are no transactions', () => {
    const result = computeWrapped({
      year: YEAR,
      month0: MONTH0,
      transactions: [],
      previousTransactions: [],
      goals: [],
      portfolioLogs: [],
      profile: null,
    })

    expect(result.empty).toBe(true)
    expect(result.topCategory).toBeNull()
    expect(result.peakDay).toBeNull()
    expect(result.totals.movements).toBe(0)
  })

  it('ignores cancelled transactions everywhere', () => {
    const result = computeWrapped({
      year: YEAR,
      month0: MONTH0,
      transactions: [
        tx({ type: 'income', amount: 100_000, date: '2026-04-01' }),
        tx({ type: 'expense', amount: 50_000, date: '2026-04-10', status: 'cancelled', category: cat('Ignored') }),
      ],
      previousTransactions: [],
      goals: [],
      portfolioLogs: [],
      profile: null,
    })
    expect(result.totals.movements).toBe(1)
    expect(result.balance.expense).toBe(0)
  })

  it('handles a month with a single movement (no crash, no comparisons)', () => {
    const result = computeWrapped({
      year: YEAR,
      month0: MONTH0,
      transactions: [
        tx({ type: 'expense', amount: 15_000, date: '2026-04-03', category: cat('Delivery', '#f59e0b') }),
      ],
      previousTransactions: [],
      goals: [],
      portfolioLogs: [],
      profile: null,
    })
    expect(result.empty).toBe(false)
    expect(result.topCategory?.name).toBe('Delivery')
    expect(result.peakDay?.daily.length).toBe(30)
    expect(result.peakDay?.daily[2]).toBe(15_000)
  })
})

describe('pickEquivalents', () => {
  it('picks 3 varied equivalents for a typical top expense (142.300)', () => {
    const picks = pickEquivalents(142_300)
    expect(picks.length).toBe(3)
    const emojis = new Set(picks.map((p) => p.emoji))
    expect(emojis.size).toBe(3)
    picks.forEach((p) => {
      const ratio = p.n
      expect(ratio).toBeGreaterThanOrEqual(5)
      expect(ratio).toBeLessThanOrEqual(400)
    })
  })

  it('widens the window for extreme amounts', () => {
    const small = pickEquivalents(500)
    expect(small.length).toBeGreaterThan(0)
    const huge = pickEquivalents(50_000_000)
    expect(huge.length).toBe(3)
  })

  it('returns empty for non-positive amounts', () => {
    expect(pickEquivalents(0)).toEqual([])
    expect(pickEquivalents(-100)).toEqual([])
  })
})

describe('goal selection', () => {
  const goal = (partial: Partial<Goal>): Goal => ({
    id: partial.id ?? 'g1',
    user_id: 'u1',
    name: partial.name ?? 'Meta',
    target_amount: partial.target_amount ?? 100_000,
    current_amount: partial.current_amount ?? 0,
    currency: 'ARS',
    deadline: null,
    status: partial.status ?? 'active',
    category: partial.category ?? 'otro',
    auto_enabled: false,
    created_at: '',
    updated_at: partial.updated_at ?? '',
  })

  it('features the active goal closest to completion', () => {
    const result = computeWrapped({
      year: YEAR,
      month0: MONTH0,
      transactions: [tx({ type: 'income', amount: 1_000 })],
      previousTransactions: [],
      goals: [
        goal({ id: 'a', name: 'Lejos', current_amount: 100_000, target_amount: 1_000_000 }),
        goal({ id: 'b', name: 'Viaje a Bariloche', current_amount: 400_000, target_amount: 500_000 }),
      ],
      portfolioLogs: [],
      profile: null,
    })
    expect(result.goal?.name).toBe('Viaje a Bariloche')
    expect(result.goal?.pct).toBe(80)
  })

  it('counts goals completed during the month', () => {
    const result = computeWrapped({
      year: YEAR,
      month0: MONTH0,
      transactions: [tx({ type: 'income', amount: 1 })],
      previousTransactions: [],
      goals: [
        goal({
          id: 'c',
          name: 'Completada',
          status: 'completed',
          current_amount: 100,
          target_amount: 100,
          updated_at: '2026-04-20T00:00:00Z',
        }),
      ],
      portfolioLogs: [],
      profile: null,
    })
    expect(result.goal?.completedThisMonth).toBe(1)
  })
})

describe('portfolio yield aggregation', () => {
  it('computes month yield % from yield-type portfolio logs', () => {
    const logs: PortfolioLog[] = [
      {
        id: 'l1',
        portfolio_id: 'p1',
        date: '2026-04-10',
        percentage_change: 2,
        absolute_change: 2_000,
        new_balance: 102_000,
        type: 'yield',
        created_at: '',
      },
      {
        id: 'l2',
        portfolio_id: 'p1',
        date: '2026-04-25',
        percentage_change: 1,
        absolute_change: 1_020,
        new_balance: 103_020,
        type: 'yield',
        created_at: '',
      },
    ]
    const result = computeWrapped({
      year: YEAR,
      month0: MONTH0,
      transactions: [tx({ type: 'income', amount: 1 })],
      previousTransactions: [],
      goals: [],
      portfolioLogs: logs,
      profile: null,
    })
    expect(result.savings.yield).toBeGreaterThan(0)
  })
})
