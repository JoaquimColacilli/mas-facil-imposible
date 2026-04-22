import type { Portfolio, PortfolioLog, PortfolioLogType, Currency } from '@/lib/types'

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

// ─── Log type resolution ──────────────────────────────────────────────────────

// Backwards-compat: rows inserted before migration 009 have type = null.
// The heuristic is only a fallback — new rows write explicit `type`.
export function resolveLogType(
  log: Pick<PortfolioLog, 'type' | 'percentage_change' | 'absolute_change'>,
): PortfolioLogType {
  if (log.type) return log.type
  if (log.percentage_change < -5 && log.absolute_change < 0) return 'rescue'
  if (log.percentage_change > 8 && log.absolute_change > 0) return 'deposit'
  return 'yield'
}

function cashflowAmount(log: Pick<PortfolioLog, 'type' | 'percentage_change' | 'absolute_change'>): number {
  const t = resolveLogType(log)
  return t === 'deposit' || t === 'rescue' ? log.absolute_change : 0
}

// ─── Data types ───────────────────────────────────────────────────────────────

export interface PortfolioLogWithPortfolio extends PortfolioLog {
  portfolio: Pick<Portfolio, 'name' | 'currency'>
}

export interface ChartCashflowEvent {
  portfolio_id: string
  type: 'deposit' | 'rescue'
  amount: number // signed: + deposit, − rescue
}

export interface ChartPoint {
  date: string
  total: number                               // actual portfolio value (post-cashflow)
  baseInvested: number                        // starting balance + cumulative net cashflow
  byPortfolio: Record<string, number>         // per-portfolio value
  byPortfolioBase: Record<string, number>     // per-portfolio base invested
  cashflow: ChartCashflowEvent[]              // cashflow events on this date
}

export interface PortfolioHolding {
  id: string
  name: string
  currency: Currency
  currentBalance: number
  weight: number // 0-100
  periodReturn: number // absolute, excluding cashflows
  periodReturnPct: number // TWR percentage
}

export interface MonthlyReturn {
  year: number
  month: number // 0-11
  returnPct: number
}

// ─── Core calculations ────────────────────────────────────────────────────────

/**
 * Build chart data points for the period. Each point tracks:
 *  - `total`: actual portfolio value at EOD (post-cashflow)
 *  - `baseInvested`: starting balance at period open + cumulative net cashflow.
 *    The gap between `total` and `baseInvested` is the market P&L.
 *  - `cashflow`: deposit/rescue events that landed on this date.
 *
 * Starting balance is derived from the log immediately prior to the period
 * (or 0 for MAX / portfolios with no prior logs).
 */
export function buildChartData(
  logs: PortfolioLogWithPortfolio[],
  period: InvestmentPeriod,
  portfolios: Portfolio[] = [],
): ChartPoint[] {
  const startDate = getPeriodStartDate(period)
  const startStr = startDate ? toDateStr(startDate) : null

  const portfolioIds = portfolios.length > 0
    ? portfolios.map(p => p.id)
    : [...new Set(logs.map(l => l.portfolio_id))]

  // Starting balance per portfolio at period open.
  //  1. Prefer the last log strictly before the period.
  //  2. If none (portfolio existed but was never logged pre-period), derive
  //     the pre-activity balance from the first-in-period log(s):
  //     final_first_day_balance − Σ first_day_absolute_changes.
  //     Without this, `baseInvested` starts at 0 and the "Rendimiento" of the
  //     period swallows the portfolio's entire pre-existing value.
  //  3. MAX period: fall back to 0 (show full history from inception).
  const startingBalance: Record<string, number> = {}
  for (const pid of portfolioIds) startingBalance[pid] = 0
  for (const pid of portfolioIds) {
    if (startStr) {
      let latestPrior: PortfolioLogWithPortfolio | null = null
      for (const l of logs) {
        if (l.portfolio_id !== pid || l.date >= startStr) continue
        if (!latestPrior || l.date > latestPrior.date) latestPrior = l
      }
      if (latestPrior) {
        startingBalance[pid] = latestPrior.new_balance
        continue
      }
    }
    // Fallback: derive from first-in-period logs
    const inPeriod = logs.filter(
      l => l.portfolio_id === pid && (!startStr || l.date >= startStr),
    )
    if (inPeriod.length === 0) continue
    const firstDate = inPeriod.reduce((min, l) => (l.date < min ? l.date : min), inPeriod[0].date)
    const firstDayLogs = inPeriod
      .filter(l => l.date === firstDate)
      .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    if (firstDayLogs.length === 0) continue
    const finalBalance = firstDayLogs[firstDayLogs.length - 1].new_balance
    const sumChange = firstDayLogs.reduce((s, l) => s + l.absolute_change, 0)
    // Only apply fallback for ranged periods — MAX shows from inception (0).
    if (startStr) startingBalance[pid] = finalBalance - sumChange
  }

  const filtered = startStr ? logs.filter(l => l.date >= startStr) : logs
  if (filtered.length === 0) return []

  // Group logs by date
  const logsByDate = new Map<string, PortfolioLogWithPortfolio[]>()
  for (const l of filtered) {
    if (!logsByDate.has(l.date)) logsByDate.set(l.date, [])
    logsByDate.get(l.date)!.push(l)
  }
  const sortedDates = [...logsByDate.keys()].sort()

  const lastKnown: Record<string, number> = { ...startingBalance }
  const cumulativeCashflow: Record<string, number> = {}
  for (const pid of portfolioIds) cumulativeCashflow[pid] = 0

  const points: ChartPoint[] = []

  for (const date of sortedDates) {
    const dayLogs = logsByDate.get(date)!
    const cashflow: ChartCashflowEvent[] = []

    for (const log of dayLogs) {
      lastKnown[log.portfolio_id] = log.new_balance
      const t = resolveLogType(log)
      if (t === 'deposit' || t === 'rescue') {
        cumulativeCashflow[log.portfolio_id] =
          (cumulativeCashflow[log.portfolio_id] ?? 0) + log.absolute_change
        cashflow.push({ portfolio_id: log.portfolio_id, type: t, amount: log.absolute_change })
      }
    }

    const byPortfolio: Record<string, number> = {}
    const byPortfolioBase: Record<string, number> = {}
    let total = 0
    let baseInvested = 0
    for (const pid of portfolioIds) {
      byPortfolio[pid] = lastKnown[pid] ?? 0
      byPortfolioBase[pid] = (startingBalance[pid] ?? 0) + (cumulativeCashflow[pid] ?? 0)
      total += byPortfolio[pid]
      baseInvested += byPortfolioBase[pid]
    }

    points.push({ date, total, baseInvested, byPortfolio, byPortfolioBase, cashflow })
  }

  return points
}

/**
 * Period P&L, cashflow-adjusted.
 *  - `absolute`: `end_total − end_baseInvested` (pure market P&L in currency).
 *  - `pct`: Time-Weighted Return (TWR) — returns chained between cashflows,
 *    insensitive to the size/timing of deposits and rescues. Industry standard
 *    for measuring pure investment performance.
 */
export function calcPeriodReturn(chartData: ChartPoint[]): { absolute: number; pct: number } {
  if (chartData.length === 0) return { absolute: 0, pct: 0 }

  const last = chartData[chartData.length - 1]
  const absolute = last.total - last.baseInvested

  let twr = 1
  let prevTotal: number | null = null

  for (let i = 0; i < chartData.length; i++) {
    const p = chartData[i]
    const dayCashflow = p.cashflow.reduce((s, c) => s + c.amount, 0)
    const marketEnd = p.total - dayCashflow

    // Sub-period start: for the first point, use starting balance (pre-cashflow);
    // otherwise, prior point's post-cashflow total.
    const subStart = i === 0 ? p.baseInvested - dayCashflow : prevTotal!
    if (subStart > 0) twr *= marketEnd / subStart
    prevTotal = p.total
  }

  return { absolute, pct: (twr - 1) * 100 }
}

/**
 * Per-portfolio holdings with cashflow-adjusted period return.
 * `periodReturn` excludes net cashflows; `periodReturnPct` uses TWR.
 */
export function buildHoldings(
  portfolios: Portfolio[],
  logs: PortfolioLogWithPortfolio[],
  period: InvestmentPeriod,
): PortfolioHolding[] {
  const startDate = getPeriodStartDate(period)
  const startStr = startDate ? toDateStr(startDate) : null
  const totalValue = portfolios.reduce((sum, p) => sum + Number(p.balance), 0)

  return portfolios.map(p => {
    const portfolioLogs = logs
      .filter(l => l.portfolio_id === p.id)
      .sort((a, b) => a.date.localeCompare(b.date))

    const periodLogs = startStr
      ? portfolioLogs.filter(l => l.date >= startStr)
      : portfolioLogs

    // Starting balance mirrors buildChartData: prior log → first-in-period
    // fallback → 0 for MAX. See buildChartData for the rationale.
    let startBalance = 0
    if (startStr) {
      const prior = portfolioLogs.filter(l => l.date < startStr)
      if (prior.length > 0) {
        startBalance = prior[prior.length - 1].new_balance
      } else if (periodLogs.length > 0) {
        const firstDate = periodLogs[0].date
        const firstDayLogs = periodLogs
          .filter(l => l.date === firstDate)
          .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
        const finalBalance = firstDayLogs[firstDayLogs.length - 1].new_balance
        const sumChange = firstDayLogs.reduce((s, l) => s + l.absolute_change, 0)
        startBalance = finalBalance - sumChange
      }
    }

    const netCashflow = periodLogs.reduce((s, l) => s + cashflowAmount(l), 0)
    const endBalance = Number(p.balance)
    const periodReturn = endBalance - startBalance - netCashflow

    // TWR over the log sequence
    let twr = 1
    let subStart = startBalance
    for (const log of periodLogs) {
      const cf = cashflowAmount(log)
      const marketEnd = log.new_balance - cf
      if (subStart > 0) twr *= marketEnd / subStart
      subStart = log.new_balance
    }
    const periodReturnPct = periodLogs.length > 0 && startBalance > 0
      ? (twr - 1) * 100
      : 0

    return {
      id: p.id,
      name: p.name,
      currency: p.currency,
      currentBalance: endBalance,
      weight: totalValue > 0 ? (endBalance / totalValue) * 100 : 0,
      periodReturn,
      periodReturnPct,
    }
  })
}

/**
 * Monthly returns grid for the heatmap — TWR per month, so deposits/rescues
 * don't pollute the percentage.
 */
export function buildMonthlyReturns(logs: PortfolioLogWithPortfolio[]): MonthlyReturn[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return []

  const allPids = [...new Set(sorted.map(l => l.portfolio_id))]
  const lastKnown: Record<string, number> = {}

  // Aggregate to daily totals + daily cashflow
  const dailyTotal = new Map<string, number>()
  const dailyCashflow = new Map<string, number>()

  const datesOrdered: string[] = []
  for (const log of sorted) {
    if (!dailyTotal.has(log.date)) {
      datesOrdered.push(log.date)
      dailyTotal.set(log.date, 0)
      dailyCashflow.set(log.date, 0)
    }
  }
  for (const log of sorted) {
    lastKnown[log.portfolio_id] = log.new_balance
    let total = 0
    for (const pid of allPids) total += lastKnown[pid] ?? 0
    dailyTotal.set(log.date, total)
    dailyCashflow.set(log.date, (dailyCashflow.get(log.date) ?? 0) + cashflowAmount(log))
  }

  // Group dates by YYYY-MM
  const monthGroups = new Map<string, string[]>()
  for (const date of datesOrdered) {
    const ym = date.slice(0, 7)
    if (!monthGroups.has(ym)) monthGroups.set(ym, [])
    monthGroups.get(ym)!.push(date)
  }

  const results: MonthlyReturn[] = []
  const sortedMonths = [...monthGroups.keys()].sort()

  // Starting value for the TWR chain: last month's ending balance.
  // For the first month, derive it from the first date's pre-cashflow total.
  let prevEnd: number | null = null

  for (const ym of sortedMonths) {
    const dates = monthGroups.get(ym)!.sort()
    const year = Number(ym.slice(0, 4))
    const month = Number(ym.slice(5, 7)) - 1

    let subStart: number
    if (prevEnd !== null) {
      subStart = prevEnd
    } else {
      const first = dailyTotal.get(dates[0])!
      subStart = first - (dailyCashflow.get(dates[0]) ?? 0)
    }

    if (subStart <= 0) {
      prevEnd = dailyTotal.get(dates[dates.length - 1])!
      continue
    }

    let twr = 1
    let runningStart = subStart
    for (const d of dates) {
      const end = dailyTotal.get(d)!
      const cf = dailyCashflow.get(d) ?? 0
      const marketEnd = end - cf
      if (runningStart > 0) twr *= marketEnd / runningStart
      runningStart = end
    }

    results.push({ year, month, returnPct: (twr - 1) * 100 })
    prevEnd = dailyTotal.get(dates[dates.length - 1])!
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
