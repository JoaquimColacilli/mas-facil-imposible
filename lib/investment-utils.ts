import type { Portfolio, PortfolioLog, Currency } from '@/lib/types'

// ─── Period types ─────────────────────────────────────────────────────────────

export type InvestmentPeriod = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'MAX'

export const PERIOD_OPTIONS: { key: InvestmentPeriod; label: string }[] = [
  { key: '1W', label: '1S' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '6M', label: '6M' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y', label: '1A' },
  { key: 'MAX', label: 'Máx' },
]

// ─── Period range calculation ─────────────────────────────────────────────────

export function getPeriodStartDate(period: InvestmentPeriod): Date | null {
  const now = new Date()
  switch (period) {
    case '1W': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return d
    }
    case '1M': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 1)
      return d
    }
    case '3M': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      return d
    }
    case '6M': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 6)
      return d
    }
    case 'YTD':
      return new Date(now.getFullYear(), 0, 1)
    case '1Y': {
      const d = new Date(now)
      d.setFullYear(d.getFullYear() - 1)
      return d
    }
    case 'MAX':
      return null
  }
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Data types ───────────────────────────────────────────────────────────────

export interface PortfolioLogWithPortfolio extends PortfolioLog {
  portfolio: Pick<Portfolio, 'name' | 'currency'>
}

export interface ChartPoint {
  date: string
  total: number
  byPortfolio: Record<string, number>
}

export interface PortfolioHolding {
  id: string
  name: string
  currency: Currency
  currentBalance: number
  weight: number // 0-100
  periodReturn: number // absolute
  periodReturnPct: number // percentage
}

export interface MonthlyReturn {
  year: number
  month: number // 0-11
  returnPct: number
}

// ─── Core calculations ────────────────────────────────────────────────────────

/**
 * Filter logs by period range, then build chart data points.
 * Each date gets one point with the total across all portfolios
 * and per-portfolio values.
 */
export function buildChartData(
  logs: PortfolioLogWithPortfolio[],
  period: InvestmentPeriod,
): ChartPoint[] {
  const startDate = getPeriodStartDate(period)
  const filtered = startDate
    ? logs.filter(l => l.date >= toDateStr(startDate))
    : logs

  // Group by date, aggregate per portfolio
  const dateMap = new Map<string, Record<string, number>>()

  for (const log of filtered) {
    if (!dateMap.has(log.date)) dateMap.set(log.date, {})
    const entry = dateMap.get(log.date)!
    entry[log.portfolio_id] = log.new_balance
  }

  // We need to carry forward balances for portfolios that don't have entries on every date
  const allPortfolioIds = [...new Set(filtered.map(l => l.portfolio_id))]
  const sortedDates = [...dateMap.keys()].sort()
  const lastKnown: Record<string, number> = {}

  const points: ChartPoint[] = []
  for (const date of sortedDates) {
    const entry = dateMap.get(date)!
    // Update known balances
    for (const pid of Object.keys(entry)) {
      lastKnown[pid] = entry[pid]
    }
    // Build point with carry-forward
    const byPortfolio: Record<string, number> = {}
    let total = 0
    for (const pid of allPortfolioIds) {
      const val = lastKnown[pid] ?? 0
      byPortfolio[pid] = val
      total += val
    }
    points.push({ date, total, byPortfolio })
  }

  return points
}

/**
 * Calculate period return: (endValue - startValue) and percentage.
 */
export function calcPeriodReturn(chartData: ChartPoint[]): { absolute: number; pct: number } {
  if (chartData.length < 1) return { absolute: 0, pct: 0 }
  const start = chartData[0].total
  const end = chartData[chartData.length - 1].total
  const absolute = end - start
  const pct = start > 0 ? ((end / start) - 1) * 100 : 0
  return { absolute, pct }
}

/**
 * Calculate holdings data for each portfolio.
 */
export function buildHoldings(
  portfolios: Portfolio[],
  logs: PortfolioLogWithPortfolio[],
  period: InvestmentPeriod,
): PortfolioHolding[] {
  const startDate = getPeriodStartDate(period)
  const totalValue = portfolios.reduce((sum, p) => sum + Number(p.balance), 0)

  return portfolios.map(p => {
    const portfolioLogs = logs
      .filter(l => l.portfolio_id === p.id)
      .sort((a, b) => a.date.localeCompare(b.date))

    const periodLogs = startDate
      ? portfolioLogs.filter(l => l.date >= toDateStr(startDate))
      : portfolioLogs

    let periodReturn = 0
    let periodReturnPct = 0

    if (periodLogs.length > 0) {
      // Find the starting balance: the new_balance of the log just before the period,
      // or the first log's new_balance minus its absolute_change
      const firstLog = periodLogs[0]
      const startBalance = firstLog.new_balance - firstLog.absolute_change
      const endBalance = Number(p.balance)
      periodReturn = endBalance - startBalance
      periodReturnPct = startBalance > 0 ? ((endBalance / startBalance) - 1) * 100 : 0
    }

    return {
      id: p.id,
      name: p.name,
      currency: p.currency,
      currentBalance: Number(p.balance),
      weight: totalValue > 0 ? (Number(p.balance) / totalValue) * 100 : 0,
      periodReturn,
      periodReturnPct,
    }
  })
}

/**
 * Build monthly returns grid for the heatmap.
 */
export function buildMonthlyReturns(logs: PortfolioLogWithPortfolio[]): MonthlyReturn[] {
  // Group all logs by month, aggregate total balance per date
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return []

  // Build daily totals across all portfolios
  const dailyTotals = new Map<string, number>()
  const lastKnown: Record<string, number> = {}
  const allPids = [...new Set(sorted.map(l => l.portfolio_id))]

  for (const log of sorted) {
    lastKnown[log.portfolio_id] = log.new_balance
    let total = 0
    for (const pid of allPids) total += lastKnown[pid] ?? 0
    dailyTotals.set(log.date, total)
  }

  // Group dates by year-month
  const monthGroups = new Map<string, string[]>()
  for (const date of dailyTotals.keys()) {
    const ym = date.slice(0, 7)
    if (!monthGroups.has(ym)) monthGroups.set(ym, [])
    monthGroups.get(ym)!.push(date)
  }

  const results: MonthlyReturn[] = []
  const sortedMonths = [...monthGroups.keys()].sort()

  // We need the end-of-previous-month total as starting point
  let prevMonthEnd: number | null = null

  for (const ym of sortedMonths) {
    const dates = monthGroups.get(ym)!.sort()
    const year = Number(ym.slice(0, 4))
    const month = Number(ym.slice(5, 7)) - 1

    const lastDate = dates[dates.length - 1]
    const endVal = dailyTotals.get(lastDate)!

    if (prevMonthEnd !== null && prevMonthEnd > 0) {
      results.push({
        year,
        month,
        returnPct: ((endVal / prevMonthEnd) - 1) * 100,
      })
    } else if (dates.length >= 2) {
      // First month with data: use first and last date within month
      const startVal = dailyTotals.get(dates[0])!
      if (startVal > 0) {
        results.push({
          year,
          month,
          returnPct: ((endVal / startVal) - 1) * 100,
        })
      }
    }

    prevMonthEnd = endVal
  }

  return results
}

/**
 * Get the portfolio name map for chart labels.
 */
export function buildPortfolioNameMap(portfolios: Portfolio[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const p of portfolios) map[p.id] = p.name
  return map
}
