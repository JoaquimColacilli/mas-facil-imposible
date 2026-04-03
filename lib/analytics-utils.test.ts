import { describe, it, expect, vi } from 'vitest'
import {
  getPeriodRange,
  getComparisonRange,
  computeDelta,
  getGranularity,
  filterByPeriod,
  sumByType,
  groupByInterval,
  buildSparklineData,
  computeSavingsRates,
  computeExpenseByCategory,
  toDateStr,
} from './analytics-utils'
import type { Transaction } from './types'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function tx(overrides: Partial<Transaction> & { date: string; type: Transaction['type']; amount: number }): Transaction {
  return {
    id: Math.random().toString(),
    user_id: 'u1',
    category_id: null,
    currency: 'ARS',
    note: null,
    status: 'confirmed',
    payment_method: null,
    sheet_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

// ─── getComparisonRange ────────────────────────────────────────────────────────

describe('getComparisonRange', () => {
  it('month → previous month', () => {
    const comp = getComparisonRange('2026-04-01', '2026-04-30')
    expect(comp.startDate).toBe('2026-03-02')
    expect(comp.endDate).toBe('2026-03-31')
  })

  it('quarter → previous quarter', () => {
    const comp = getComparisonRange('2026-02-01', '2026-04-30')
    // 88 days in Feb-Apr, so comparison is 88 days before Feb 1
    expect(comp.endDate).toBe('2026-01-31')
  })

  it('custom 7 days → previous 7 days', () => {
    const comp = getComparisonRange('2026-04-10', '2026-04-16')
    expect(comp.startDate).toBe('2026-04-03')
    expect(comp.endDate).toBe('2026-04-09')
  })
})

// ─── computeDelta ──────────────────────────────────────────────────────────────

describe('computeDelta', () => {
  it('positive delta', () => {
    const d = computeDelta(120, 100)
    expect(d.value).toBe(20)
    expect(d.percentage).toBe(20)
    expect(d.isPositive).toBe(true)
  })

  it('negative delta', () => {
    const d = computeDelta(80, 100)
    expect(d.value).toBe(-20)
    expect(d.percentage).toBe(-20)
    expect(d.isPositive).toBe(false)
  })

  it('zero previous → 100% if current > 0', () => {
    const d = computeDelta(50, 0)
    expect(d.percentage).toBe(100)
    expect(d.isPositive).toBe(true)
  })

  it('zero both → 0%', () => {
    const d = computeDelta(0, 0)
    expect(d.percentage).toBe(0)
    expect(d.value).toBe(0)
  })

  it('inverted semantics for expenses — spending more is bad', () => {
    const d = computeDelta(150, 100, true)
    expect(d.value).toBe(50)
    expect(d.isPositive).toBe(false) // spending more = bad
  })

  it('inverted semantics — spending less is good', () => {
    const d = computeDelta(80, 100, true)
    expect(d.value).toBe(-20)
    expect(d.isPositive).toBe(true) // spending less = good
  })
})

// ─── getGranularity ────────────────────────────────────────────────────────────

describe('getGranularity', () => {
  it('1 month → day', () => {
    expect(getGranularity('2026-04-01', '2026-04-30')).toBe('day')
  })

  it('3 months → week', () => {
    expect(getGranularity('2026-02-01', '2026-04-30')).toBe('week')
  })

  it('12 months → month', () => {
    expect(getGranularity('2025-05-01', '2026-04-30')).toBe('month')
  })
})

// ─── groupByInterval ───────────────────────────────────────────────────────────

describe('groupByInterval', () => {
  const txs = [
    tx({ date: '2026-04-01', type: 'income', amount: 100 }),
    tx({ date: '2026-04-01', type: 'expense', amount: 30 }),
    tx({ date: '2026-04-05', type: 'income', amount: 200 }),
    tx({ date: '2026-04-15', type: 'expense', amount: 50 }),
  ]

  it('groups by day — totals match', () => {
    const points = groupByInterval(txs, '2026-04-01', '2026-04-30', 'day')
    expect(points.length).toBe(30)
    const totalIncome = points.reduce((s, p) => s + p.income, 0)
    const totalExpense = points.reduce((s, p) => s + p.expense, 0)
    expect(totalIncome).toBe(300)
    expect(totalExpense).toBe(80)
  })

  it('groups by week — totals match', () => {
    const points = groupByInterval(txs, '2026-04-01', '2026-04-30', 'week')
    const totalIncome = points.reduce((s, p) => s + p.income, 0)
    const totalExpense = points.reduce((s, p) => s + p.expense, 0)
    expect(totalIncome).toBe(300)
    expect(totalExpense).toBe(80)
  })

  it('groups by month — totals match', () => {
    const points = groupByInterval(txs, '2026-04-01', '2026-04-30', 'month')
    expect(points.length).toBe(1)
    expect(points[0].income).toBe(300)
    expect(points[0].expense).toBe(80)
  })

  it('groups multi-month by month correctly', () => {
    const txs2 = [
      tx({ date: '2026-03-15', type: 'income', amount: 500 }),
      tx({ date: '2026-04-10', type: 'income', amount: 300 }),
    ]
    const points = groupByInterval(txs2, '2026-03-01', '2026-04-30', 'month')
    expect(points.length).toBe(2)
    expect(points[0].label).toBe('Mar')
    expect(points[0].income).toBe(500)
    expect(points[1].label).toBe('Abr')
    expect(points[1].income).toBe(300)
  })
})

// ─── buildSparklineData ────────────────────────────────────────────────────────

describe('buildSparklineData', () => {
  it('produces correct number of buckets', () => {
    const txs = [
      tx({ date: '2026-04-01', type: 'income', amount: 100 }),
      tx({ date: '2026-04-15', type: 'income', amount: 200 }),
      tx({ date: '2026-04-30', type: 'income', amount: 50 }),
    ]
    const points = buildSparklineData(txs, 'income', '2026-04-01', '2026-04-30')
    expect(points.length).toBeLessThanOrEqual(10)
    expect(points.length).toBeGreaterThanOrEqual(3)
  })

  it('total across buckets matches sum of filtered transactions', () => {
    const txs = [
      tx({ date: '2026-04-01', type: 'income', amount: 100 }),
      tx({ date: '2026-04-15', type: 'income', amount: 200 }),
      tx({ date: '2026-04-15', type: 'expense', amount: 999 }), // should be excluded
    ]
    const points = buildSparklineData(txs, 'income', '2026-04-01', '2026-04-30')
    const total = points.reduce((s, p) => s + p.value, 0)
    expect(total).toBe(300)
  })
})

// ─── computeSavingsRates ───────────────────────────────────────────────────────

describe('computeSavingsRates', () => {
  it('normal case — positive savings rate', () => {
    const now = new Date()
    const thisMonth = toDateStr(new Date(now.getFullYear(), now.getMonth(), 5))
    const txs = [
      tx({ date: thisMonth, type: 'income', amount: 1000 }),
      tx({ date: thisMonth, type: 'expense', amount: 700 }),
    ]
    const rates = computeSavingsRates(txs, 1)
    expect(rates.length).toBe(1)
    expect(rates[0].rate).toBe(30) // (1000-700)/1000 = 30%
  })

  it('zero income → savings rate = 0 (not NaN)', () => {
    const now = new Date()
    const thisMonth = toDateStr(new Date(now.getFullYear(), now.getMonth(), 5))
    const txs = [
      tx({ date: thisMonth, type: 'expense', amount: 500 }),
    ]
    const rates = computeSavingsRates(txs, 1)
    expect(rates[0].rate).toBe(0)
  })

  it('expenses > income → negative savings rate', () => {
    const now = new Date()
    const thisMonth = toDateStr(new Date(now.getFullYear(), now.getMonth(), 5))
    const txs = [
      tx({ date: thisMonth, type: 'income', amount: 500 }),
      tx({ date: thisMonth, type: 'expense', amount: 800 }),
    ]
    const rates = computeSavingsRates(txs, 1)
    expect(rates[0].rate).toBe(-60) // (500-800)/500 = -60%
  })

  it('produces 12 points for 12 months', () => {
    const rates = computeSavingsRates([], 12)
    expect(rates.length).toBe(12)
  })
})

// ─── computeExpenseByCategory ──────────────────────────────────────────────────

describe('computeExpenseByCategory', () => {
  it('groups and sorts by value descending', () => {
    const txs = [
      tx({ date: '2026-04-01', type: 'expense', amount: 100, category: { id: '1', user_id: 'u1', name: 'Comida', icon: '', color: '#f00', type: 'expense', created_at: '' } }),
      tx({ date: '2026-04-02', type: 'expense', amount: 200, category: { id: '2', user_id: 'u1', name: 'Transporte', icon: '', color: '#0f0', type: 'expense', created_at: '' } }),
      tx({ date: '2026-04-03', type: 'expense', amount: 50, category: { id: '1', user_id: 'u1', name: 'Comida', icon: '', color: '#f00', type: 'expense', created_at: '' } }),
    ]
    const result = computeExpenseByCategory(txs)
    expect(result[0].name).toBe('Transporte')
    expect(result[0].value).toBe(200)
    expect(result[1].name).toBe('Comida')
    expect(result[1].value).toBe(150)
  })

  it('computes percentages correctly', () => {
    const txs = [
      tx({ date: '2026-04-01', type: 'expense', amount: 750, category: { id: '1', user_id: 'u1', name: 'A', icon: '', color: '#f00', type: 'expense', created_at: '' } }),
      tx({ date: '2026-04-01', type: 'expense', amount: 250, category: { id: '2', user_id: 'u1', name: 'B', icon: '', color: '#0f0', type: 'expense', created_at: '' } }),
    ]
    const result = computeExpenseByCategory(txs)
    expect(result[0].percentage).toBe(75)
    expect(result[1].percentage).toBe(25)
  })

  it('empty expenses → empty array', () => {
    expect(computeExpenseByCategory([])).toEqual([])
  })

  it('ignores non-expense transactions', () => {
    const txs = [
      tx({ date: '2026-04-01', type: 'income', amount: 5000 }),
    ]
    expect(computeExpenseByCategory(txs)).toEqual([])
  })
})

// ─── filterByPeriod ────────────────────────────────────────────────────────────

describe('filterByPeriod', () => {
  it('filters by date range and excludes cancelled', () => {
    const txs = [
      tx({ date: '2026-03-31', type: 'income', amount: 100 }),
      tx({ date: '2026-04-01', type: 'income', amount: 200 }),
      tx({ date: '2026-04-15', type: 'expense', amount: 50, status: 'cancelled' }),
      tx({ date: '2026-04-30', type: 'expense', amount: 75 }),
      tx({ date: '2026-05-01', type: 'income', amount: 300 }),
    ]
    const result = filterByPeriod(txs, '2026-04-01', '2026-04-30')
    expect(result.length).toBe(2)
    expect(result[0].amount).toBe(200)
    expect(result[1].amount).toBe(75)
  })

  it('march 15 expense included in march period, excluded from april', () => {
    const txs = [
      tx({ date: '2026-03-15', type: 'expense', amount: 500 }),
    ]
    const marchResult = filterByPeriod(txs, '2026-03-01', '2026-03-31')
    expect(marchResult.length).toBe(1)
    expect(marchResult[0].amount).toBe(500)

    const aprilResult = filterByPeriod(txs, '2026-04-01', '2026-04-30')
    expect(aprilResult.length).toBe(0)
  })

  it('handles dates with timestamp suffix (normalizes to YYYY-MM-DD)', () => {
    const txs = [
      tx({ date: '2026-03-31T00:00:00+00:00', type: 'expense', amount: 200 }),
    ]
    const result = filterByPeriod(txs, '2026-03-01', '2026-03-31')
    expect(result.length).toBe(1)
  })

  it('includes transactions on boundary dates (inclusive)', () => {
    const txs = [
      tx({ date: '2026-04-01', type: 'income', amount: 100 }),
      tx({ date: '2026-04-30', type: 'expense', amount: 50 }),
    ]
    const result = filterByPeriod(txs, '2026-04-01', '2026-04-30')
    expect(result.length).toBe(2)
  })
})

// ─── getPeriodRange ────────────────────────────────────────────────────────────

describe('getPeriodRange', () => {
  it('last-month returns correct range', () => {
    const range = getPeriodRange('last-month')
    const now = new Date()
    const expectedStart = toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const expectedEnd = toDateStr(new Date(now.getFullYear(), now.getMonth(), 0))
    expect(range.startDate).toBe(expectedStart)
    expect(range.endDate).toBe(expectedEnd)
  })
})
