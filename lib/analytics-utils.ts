import type { Transaction, TransactionType } from './types'

export type PeriodPreset = 'this-month' | 'last-month' | '3-months' | '6-months' | '12-months' | 'custom'
export type Granularity = 'day' | 'week' | 'month'

export interface PeriodRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface DeltaResult {
  value: number
  percentage: number
  isPositive: boolean
}

export interface TimeSeriesPoint {
  label: string
  income: number
  expense: number
  compIncome?: number
  compExpense?: number
}

export interface SparklinePoint {
  value: number
}

export interface SavingsRatePoint {
  label: string
  rate: number
}

export interface CategoryBreakdown {
  name: string
  value: number
  color: string
  percentage: number
}

export const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getPeriodRange(preset: PeriodPreset, customStart?: string, customEnd?: string): PeriodRange {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (preset) {
    case 'this-month':
      return { startDate: toDateStr(new Date(y, m, 1)), endDate: toDateStr(now) }
    case 'last-month':
      return { startDate: toDateStr(new Date(y, m - 1, 1)), endDate: toDateStr(new Date(y, m, 0)) }
    case '3-months':
      return { startDate: toDateStr(new Date(y, m - 2, 1)), endDate: toDateStr(now) }
    case '6-months':
      return { startDate: toDateStr(new Date(y, m - 5, 1)), endDate: toDateStr(now) }
    case '12-months':
      return { startDate: toDateStr(new Date(y, m - 11, 1)), endDate: toDateStr(now) }
    case 'custom':
      return {
        startDate: customStart ?? toDateStr(new Date(y, m, 1)),
        endDate: customEnd ?? toDateStr(now),
      }
  }
}

export function getComparisonRange(startDate: string, endDate: string): PeriodRange {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const durationMs = end.getTime() - start.getTime()
  const compEnd = new Date(start.getTime() - 86_400_000) // day before start
  const compStart = new Date(compEnd.getTime() - durationMs)
  return { startDate: toDateStr(compStart), endDate: toDateStr(compEnd) }
}

export function computeDelta(current: number, previous: number, invertSemantics = false): DeltaResult {
  const value = current - previous
  const percentage = previous === 0 ? (current > 0 ? 100 : 0) : (value / previous) * 100
  const rawPositive = value >= 0
  return { value, percentage, isPositive: invertSemantics ? !rawPositive : rawPositive }
}

export function getGranularity(startDate: string, endDate: string): Granularity {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  if (days <= 35) return 'day'
  if (days <= 180) return 'week'
  return 'month'
}

export function filterByPeriod(txs: Transaction[], startDate: string, endDate: string): Transaction[] {
  return txs.filter((t) => {
    const d = t.date.slice(0, 10) // normalize to YYYY-MM-DD in case of timestamp suffix
    return d >= startDate && d <= endDate && t.status !== 'cancelled'
  })
}

export function sumByType(txs: Transaction[], type: TransactionType): number {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)
}

export function groupByInterval(
  txs: Transaction[],
  startDate: string,
  endDate: string,
  granularity: Granularity,
): TimeSeriesPoint[] {
  const buckets = new Map<string, TimeSeriesPoint>()

  if (granularity === 'day') {
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toDateStr(d)
      buckets.set(key, { label: String(d.getDate()), income: 0, expense: 0 })
    }
  } else if (granularity === 'week') {
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    const dayOfWeek = start.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(start)
    weekStart.setDate(weekStart.getDate() + mondayOffset)
    for (let d = new Date(weekStart); d <= end; d.setDate(d.getDate() + 7)) {
      const key = toDateStr(d)
      buckets.set(key, { label: `${d.getDate()}/${d.getMonth() + 1}`, income: 0, expense: 0 })
    }
  } else {
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    let yr = start.getFullYear(), mo = start.getMonth()
    while (yr < end.getFullYear() || (yr === end.getFullYear() && mo <= end.getMonth())) {
      const key = `${yr}-${String(mo + 1).padStart(2, '0')}`
      buckets.set(key, { label: MONTH_LABELS[mo], income: 0, expense: 0 })
      mo++
      if (mo > 11) { mo = 0; yr++ }
    }
  }

  for (const tx of txs) {
    if (tx.type !== 'income' && tx.type !== 'expense') continue
    const txDate = new Date(tx.date + 'T00:00:00')
    let key: string

    if (granularity === 'day') {
      key = tx.date
    } else if (granularity === 'week') {
      const day = txDate.getDay()
      const off = day === 0 ? -6 : 1 - day
      const monday = new Date(txDate)
      monday.setDate(monday.getDate() + off)
      key = toDateStr(monday)
    } else {
      key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
    }

    const bucket = buckets.get(key)
    if (bucket) {
      if (tx.type === 'income') bucket.income += tx.amount
      else bucket.expense += tx.amount
    }
  }

  return Array.from(buckets.values())
}

export function buildSparklineData(
  txs: Transaction[],
  type: TransactionType,
  startDate: string,
  endDate: string,
): SparklinePoint[] {
  const filtered = txs.filter((t) => t.type === type)
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000))
  const bucketCount = Math.min(10, Math.max(3, totalDays))
  const bucketSize = totalDays / bucketCount

  const points: SparklinePoint[] = Array.from({ length: bucketCount }, () => ({ value: 0 }))

  for (const tx of filtered) {
    const txDate = new Date(tx.date + 'T00:00:00')
    const dayIndex = (txDate.getTime() - start.getTime()) / 86_400_000
    const bucket = Math.min(Math.floor(dayIndex / bucketSize), bucketCount - 1)
    if (bucket >= 0) points[bucket].value += tx.amount
  }

  return points
}

export function computeSavingsRates(txs: Transaction[], months = 12): SavingsRatePoint[] {
  const now = new Date()
  const points: SavingsRatePoint[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = toDateStr(d)
    const end = toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    const monthTxs = filterByPeriod(txs, start, end)
    const income = sumByType(monthTxs, 'income')
    const expense = sumByType(monthTxs, 'expense')

    points.push({
      label: MONTH_LABELS[d.getMonth()],
      rate: income === 0 ? 0 : Math.round(((income - expense) / income) * 100),
    })
  }

  return points
}

export function computeExpenseByCategory(txs: Transaction[]): CategoryBreakdown[] {
  const expenses = txs.filter((t) => t.type === 'expense')
  const total = expenses.reduce((s, t) => s + t.amount, 0)
  if (total === 0) return []

  const map: Record<string, { value: number; color: string }> = {}
  for (const tx of expenses) {
    const name = tx.category?.name ?? 'Sin categoría'
    const color = tx.category?.color ?? '#6b7280'
    if (!map[name]) map[name] = { value: 0, color }
    map[name].value += tx.amount
  }

  return Object.entries(map)
    .map(([name, { value, color }]) => ({ name, value, color, percentage: Math.round((value / total) * 100) }))
    .sort((a, b) => b.value - a.value)
}

export function getPeriodLabel(preset: PeriodPreset, startDate: string, endDate: string): string {
  switch (preset) {
    case 'this-month':
    case 'last-month': {
      const d = new Date(startDate + 'T00:00:00')
      const name = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    case '3-months': return 'Últimos 3 meses'
    case '6-months': return 'Últimos 6 meses'
    case '12-months': return 'Últimos 12 meses'
    case 'custom': {
      const s = new Date(startDate + 'T00:00:00')
      const e = new Date(endDate + 'T00:00:00')
      const fmt = (d: Date) => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
      return `${fmt(s)} — ${fmt(e)}`
    }
  }
}
