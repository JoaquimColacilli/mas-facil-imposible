import type { WrappedPersonalityId } from '@/lib/types'

export interface WrappedUser {
  name: string
  initials: string
  mood: string
}

export interface WrappedTotals {
  movements: number
  flowARS: number
  flowUSD: number
}

export interface WrappedBalance {
  ars: number
  usd: number
  income: number
  expense: number
  /** Delta in % of (income − expense) vs previous month. 0 if no baseline. */
  deltaVsPrev: number
}

export interface WrappedCategoryBreakdownItem {
  name: string
  amount: number
  color: string
}

export interface WrappedTopCategory {
  name: string
  icon: string
  color: string
  amount: number
  pctOfExpenses: number
  breakdown: WrappedCategoryBreakdownItem[]
}

export interface WrappedEquivalent {
  emoji: string
  n: number
  label: string
  ref: number
}

export interface WrappedPeakDayItem {
  cat: string
  amount: number
}

export interface WrappedPeakDay {
  date: string
  amount: number
  items: WrappedPeakDayItem[]
  daily: number[]
}

export interface WrappedInvestmentSeries {
  /** Currency of the portfolios this series aggregates. */
  currency: 'ARS' | 'USD'
  /**
   * Chronological points `(day-of-month 1-based, balance)` derived from
   * `portfolio_logs.new_balance`. Sparse — one point per log date, not
   * every calendar day. Consumers interpolate linearly for the chart.
   */
  points: { day: number; balance: number }[]
}

export interface WrappedSavings {
  /** ARS savings added this month (from transactions). */
  savings: number
  /** ARS investment movements this month (deposits − rescues, from portfolio_logs + tx). */
  investment: number
  /** USD savings added this month. Shown aparte — nunca convertimos moneda. */
  savingsUSD: number
  /** USD investment movements this month. */
  investmentUSD: number
  /**
   * All-time cumulative ARS savings balance up to end of month — sum of every
   * non-cancelled `savings` transaction across history. Shown as the Ahorro
   * hero; the `savings` field above is then shown as the "este mes" chip.
   */
  savingsBalanceARS: number
  /** Same as savingsBalanceARS, for USD savings. */
  savingsBalanceUSD: number
  /**
   * Total portfolio balance in ARS at end of month — the "total invertido"
   * shown as the Inversión hero. Sum of latest `new_balance` per ARS portfolio.
   */
  investmentBalanceARS: number
  /** Same as investmentBalanceARS, for USD portfolios. */
  investmentBalanceUSD: number
  /**
   * Absolute gain/loss in the month for ARS portfolios — sum of `yield` log
   * absolute_change. Positive = ganancia, negative = pérdida.
   */
  investmentGainARS: number
  /** Same for USD portfolios. */
  investmentGainUSD: number
  /** Delta in % of (savings + investment) ARS vs previous month. 0 if no baseline. */
  deltaVsPrev: number
  /** Portfolio yield % for the month (0 if no portfolio logs). */
  yield: number
  /**
   * Daily balance trajectory across portfolios in the currency with the most
   * total balance at end of month. Used to draw a stock-style line chart on
   * slide 7. `null` when the user has no portfolio logs in the month.
   */
  investmentSeries: WrappedInvestmentSeries | null
}

export interface WrappedGoal {
  name: string
  icon: string
  color: string
  current: number
  target: number
  pct: number
  completedThisMonth: number
}

/**
 * Full shape consumed by the slides. `null` goal means "omit slide 8".
 */
export interface WrappedData {
  month: string
  monthKey: string
  year: number
  user: WrappedUser
  totals: WrappedTotals
  balance: WrappedBalance
  topCategory: WrappedTopCategory | null
  equivalents: WrappedEquivalent[]
  peakDay: WrappedPeakDay | null
  savings: WrappedSavings
  goal: WrappedGoal | null
  personality: WrappedPersonalityId
  /** True when the month has no usable transactions — consumer should render empty state. */
  empty: boolean
}
