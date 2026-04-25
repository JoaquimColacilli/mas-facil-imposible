import type {
  Transaction,
  Goal,
  Profile,
  Portfolio,
  PortfolioLog,
  WrappedPersonalityId,
} from '@/lib/types'
import type {
  WrappedBalance,
  WrappedData,
  WrappedGoal,
  WrappedInvestmentSeries,
  WrappedPeakDay,
  WrappedSavings,
  WrappedTopCategory,
  WrappedTotals,
  WrappedUser,
} from './types'
import { derivePersonality, isSocialCategory } from './personality'
import { pickEquivalents } from './equivalents'

const MONTH_LABELS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const WEEKDAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

function monthLabel(m0: number): string {
  return MONTH_LABELS_ES[m0]
}

function formatPeakDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const weekday = WEEKDAYS_ES[d.getDay()]
  const month = monthLabel(d.getMonth()).toLowerCase()
  return `${weekday} ${day} de ${month}`
}

function activeTxs(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => t.status !== 'cancelled')
}

function sumByType(txs: Transaction[], type: Transaction['type'], currency: 'ARS' | 'USD') {
  return activeTxs(txs)
    .filter((t) => t.type === type && t.currency === currency)
    .reduce((s, t) => s + t.amount, 0)
}

function flowByCurrency(txs: Transaction[], currency: 'ARS' | 'USD') {
  return activeTxs(txs)
    .filter((t) => t.currency === currency)
    .reduce((s, t) => s + t.amount, 0)
}

function buildUser(profile: Pick<Profile, 'full_name' | 'nickname' | 'mood_emoji'> | null): WrappedUser {
  const raw = profile?.nickname?.trim() || profile?.full_name?.trim() || 'Vos'
  const parts = raw.split(/\s+/).filter(Boolean)
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : raw.slice(0, 2).toUpperCase()
  return {
    name: raw,
    initials,
    mood: profile?.mood_emoji || '🌤️',
  }
}

function buildTotals(txs: Transaction[]): WrappedTotals {
  const active = activeTxs(txs)
  return {
    movements: active.length,
    flowARS: flowByCurrency(active, 'ARS'),
    flowUSD: flowByCurrency(active, 'USD'),
  }
}

function buildBalance(
  txs: Transaction[],
  prevTxs: Transaction[],
): WrappedBalance {
  const incomeARS = sumByType(txs, 'income', 'ARS')
  const expenseARS = sumByType(txs, 'expense', 'ARS')
  const incomeUSD = sumByType(txs, 'income', 'USD')
  const expenseUSD = sumByType(txs, 'expense', 'USD')
  const balanceARS = incomeARS - expenseARS
  const balanceUSD = incomeUSD - expenseUSD

  const prevIncomeARS = sumByType(prevTxs, 'income', 'ARS')
  const prevExpenseARS = sumByType(prevTxs, 'expense', 'ARS')
  const prevBalanceARS = prevIncomeARS - prevExpenseARS

  let deltaVsPrev = 0
  if (prevTxs.length > 0 && prevBalanceARS !== 0) {
    deltaVsPrev = Math.round(((balanceARS - prevBalanceARS) / Math.abs(prevBalanceARS)) * 100)
  } else if (prevTxs.length > 0 && prevBalanceARS === 0 && balanceARS !== 0) {
    deltaVsPrev = balanceARS > 0 ? 100 : -100
  }

  return {
    ars: balanceARS,
    usd: balanceUSD,
    income: incomeARS,
    expense: expenseARS,
    deltaVsPrev,
  }
}

function buildTopCategory(txs: Transaction[]): WrappedTopCategory | null {
  const expenses = activeTxs(txs).filter(
    (t) => t.type === 'expense' && t.currency === 'ARS',
  )
  if (expenses.length === 0) return null

  const totals = new Map<string, { amount: number; color: string; icon: string }>()
  let totalExpense = 0
  for (const t of expenses) {
    const name = t.category?.name ?? 'Sin categoría'
    const color = t.category?.color ?? '#6b7280'
    const icon = t.category?.icon ?? 'Circle'
    const entry = totals.get(name) ?? { amount: 0, color, icon }
    entry.amount += t.amount
    totals.set(name, entry)
    totalExpense += t.amount
  }

  const sorted = Array.from(totals.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)

  const top = sorted[0]
  return {
    name: top.name,
    icon: top.icon,
    color: top.color,
    amount: top.amount,
    pctOfExpenses: totalExpense > 0 ? Math.round((top.amount / totalExpense) * 100) : 0,
    breakdown: sorted.slice(0, 3).map((s) => ({
      name: s.name,
      amount: s.amount,
      color: s.color,
    })),
  }
}

function buildPeakDay(
  txs: Transaction[],
  year: number,
  month0: number,
): WrappedPeakDay | null {
  const expenses = activeTxs(txs).filter(
    (t) => t.type === 'expense' && t.currency === 'ARS',
  )
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const daily = new Array(daysInMonth).fill(0) as number[]

  const perDay = new Map<string, { amount: number; items: Map<string, number> }>()
  for (const t of expenses) {
    const d = new Date(t.date + 'T00:00:00')
    if (d.getFullYear() !== year || d.getMonth() !== month0) continue
    const idx = d.getDate() - 1
    daily[idx] += t.amount
    const entry = perDay.get(t.date) ?? { amount: 0, items: new Map() }
    entry.amount += t.amount
    const catName = t.category?.name ?? 'Sin categoría'
    entry.items.set(catName, (entry.items.get(catName) ?? 0) + t.amount)
    perDay.set(t.date, entry)
  }

  if (expenses.length === 0) return null

  let peakDate: string | null = null
  let peakAmount = 0
  for (const [d, v] of perDay) {
    if (v.amount > peakAmount) {
      peakAmount = v.amount
      peakDate = d
    }
  }
  if (!peakDate) return null

  const items = Array.from(perDay.get(peakDate)!.items.entries())
    .map(([cat, amount]) => ({ cat, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  return {
    date: formatPeakDate(peakDate),
    amount: peakAmount,
    items,
    daily,
  }
}

/**
 * Daily balance trajectory for portfolios in `currency`. One point per log
 * date (sparse — consumers lerp for rendering). If multiple portfolios in the
 * same currency log on the same day, we sum their new_balance; if a portfolio
 * didn't log on a given date we carry forward its last known balance.
 */
function buildInvestmentSeries(
  portfolioLogs: PortfolioLog[],
  portfolios: Pick<Portfolio, 'id' | 'currency'>[],
  currency: 'ARS' | 'USD',
): WrappedInvestmentSeries | null {
  const currencyByPortfolio = new Map<string, 'ARS' | 'USD'>()
  for (const p of portfolios) currencyByPortfolio.set(p.id, p.currency)

  const logs = portfolioLogs
    .filter((l) => currencyByPortfolio.get(l.portfolio_id) === currency)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (logs.length === 0) return null

  // Per-portfolio latest balance up to each date, summed across portfolios.
  const lastBalance = new Map<string, number>()
  const dayOfMonth = (iso: string) => Number(iso.slice(8, 10))
  const byDay = new Map<number, number>()

  for (const log of logs) {
    lastBalance.set(log.portfolio_id, log.new_balance)
    const total = Array.from(lastBalance.values()).reduce((s, v) => s + v, 0)
    byDay.set(dayOfMonth(log.date), total)
  }

  const points = Array.from(byDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, balance]) => ({ day, balance }))

  return { currency, points }
}

function buildSavings(
  txs: Transaction[],
  prevTxs: Transaction[],
  portfolioLogs: PortfolioLog[],
  portfolios: Pick<Portfolio, 'id' | 'currency'>[],
  allSavingsTxs: Transaction[],
): WrappedSavings {
  // Start with transactions of type 'savings' / 'investment' (the manual
  // recording flow). Most users who also use the Portfolios feature log
  // their deposits *only* there to avoid double-counting, so we then top
  // up investment totals with net portfolio deposits.
  let savingsARS = sumByType(txs, 'savings', 'ARS')
  let investmentARS = sumByType(txs, 'investment', 'ARS')
  let savingsUSD = sumByType(txs, 'savings', 'USD')
  let investmentUSD = sumByType(txs, 'investment', 'USD')
  const prevSavingsARS = sumByType(prevTxs, 'savings', 'ARS')
  const prevInvestmentARS = sumByType(prevTxs, 'investment', 'ARS')

  // Portfolio deposits (aportes) and rescues in the month — bucketed by the
  // parent portfolio's currency so we never mix ARS and USD. `deposit` adds
  // to investment, `rescue` subtracts. Yield logs stay out (those move the
  // balance but not the invested principal).
  const currencyByPortfolio = new Map<string, 'ARS' | 'USD'>()
  for (const p of portfolios) currencyByPortfolio.set(p.id, p.currency)

  for (const log of portfolioLogs) {
    if (log.type !== 'deposit' && log.type !== 'rescue') continue
    const cur = currencyByPortfolio.get(log.portfolio_id)
    if (!cur) continue
    // Supabase returns absolute_change as-signed: deposit > 0, rescue < 0 —
    // Math.abs handles the sign convention so we never double-flip.
    const delta = log.type === 'deposit' ? Math.abs(log.absolute_change) : -Math.abs(log.absolute_change)
    if (cur === 'ARS') investmentARS += delta
    else investmentUSD += delta
  }
  // Don't let netting below zero leak as negative "invertiste": if rescues
  // dominate in a month, clamp to 0 — the narrative copy doesn't have a
  // reasonable rendering for "apartaste -$500".
  if (investmentARS < 0) investmentARS = 0
  if (investmentUSD < 0) investmentUSD = 0

  const curTotal = savingsARS + investmentARS
  const prevTotal = prevSavingsARS + prevInvestmentARS

  let deltaVsPrev = 0
  if (prevTxs.length > 0 && prevTotal !== 0) {
    deltaVsPrev = Math.round(((curTotal - prevTotal) / Math.abs(prevTotal)) * 100)
  } else if (prevTxs.length > 0 && prevTotal === 0 && curTotal > 0) {
    deltaVsPrev = 100
  }

  // Yield: aggregate portfolio_logs of type 'yield' in the month.
  // We compute both the absolute change (per currency, for the chip) and a
  // single percentage (across all currencies — approximation). The chip
  // shows the absolute value which is what users actually care about: "este
  // mes gané U$S 53".
  let yieldSum = 0
  let yieldBase = 0
  let investmentGainARS = 0
  let investmentGainUSD = 0
  for (const log of portfolioLogs) {
    if (log.type !== 'yield') continue
    const cur = currencyByPortfolio.get(log.portfolio_id)
    yieldSum += log.absolute_change
    yieldBase += log.new_balance - log.absolute_change
    if (cur === 'ARS') investmentGainARS += log.absolute_change
    else if (cur === 'USD') investmentGainUSD += log.absolute_change
  }
  const yieldPct =
    yieldBase > 0 ? Math.round((yieldSum / yieldBase) * 1000) / 10 : 0

  // End-of-month total balance per currency: latest new_balance per portfolio,
  // summed inside its currency bucket. This is the "total invertido" hero —
  // matches what the user sees on /investments: "tengo U$S 16.017 invertidos"
  // rather than just "este mes puse U$S 2.061".
  const latestBalanceByPortfolio = new Map<string, number>()
  // Walk sorted by date so the last write for each portfolio is its latest.
  const sortedLogs = [...portfolioLogs].sort((a, b) => a.date.localeCompare(b.date))
  for (const log of sortedLogs) {
    latestBalanceByPortfolio.set(log.portfolio_id, log.new_balance)
  }
  let investmentBalanceARS = 0
  let investmentBalanceUSD = 0
  for (const [pid, bal] of latestBalanceByPortfolio) {
    const cur = currencyByPortfolio.get(pid)
    if (cur === 'ARS') investmentBalanceARS += bal
    else if (cur === 'USD') investmentBalanceUSD += bal
  }

  // Chart: pick the currency with the heaviest total balance at end of month.
  // Matches what the hero shows — one consistent primary currency per user.
  const chartCurrency: 'ARS' | 'USD' =
    investmentBalanceUSD >= investmentBalanceARS ? 'USD' : 'ARS'
  const investmentSeries = buildInvestmentSeries(portfolioLogs, portfolios, chartCurrency)

  // Cumulative savings balance up to end of month: sum every non-cancelled
  // `savings` tx. The caller can pass the full history; if none was provided
  // (tests, legacy flows), fall back to this month's contribution so the
  // card still shows something meaningful.
  let savingsBalanceARS = 0
  let savingsBalanceUSD = 0
  if (allSavingsTxs.length > 0) {
    for (const t of allSavingsTxs) {
      if (t.status === 'cancelled') continue
      if (t.currency === 'ARS') savingsBalanceARS += t.amount
      else if (t.currency === 'USD') savingsBalanceUSD += t.amount
    }
  } else {
    savingsBalanceARS = savingsARS
    savingsBalanceUSD = savingsUSD
  }

  return {
    savings: savingsARS,
    investment: investmentARS,
    savingsUSD,
    investmentUSD,
    savingsBalanceARS,
    savingsBalanceUSD,
    investmentBalanceARS,
    investmentBalanceUSD,
    investmentGainARS,
    investmentGainUSD,
    deltaVsPrev,
    yield: yieldPct,
    investmentSeries,
  }
}

function buildGoal(goals: Goal[], year: number, month0: number): WrappedGoal | null {
  if (goals.length === 0) return null

  const active = goals.filter((g) => g.status === 'active' && g.target_amount > 0)
  const byClosest = [...active].sort((a, b) => {
    const pctA = Math.min(1, a.current_amount / a.target_amount)
    const pctB = Math.min(1, b.current_amount / b.target_amount)
    return pctB - pctA
  })
  const featured = byClosest[0]

  // Count goals completed this month.
  const monthKey = `${year}-${String(month0 + 1).padStart(2, '0')}`
  const completedThisMonth = goals.filter((g) => {
    if (g.status !== 'completed') return false
    // updated_at moves when we mark as completed in this project.
    return (g.updated_at ?? '').startsWith(monthKey)
  }).length

  if (!featured) {
    if (completedThisMonth === 0) return null
    return {
      name: '—',
      icon: 'Target',
      color: '#3b82f6',
      current: 0,
      target: 1,
      pct: 100,
      completedThisMonth,
    }
  }

  const pct = Math.min(
    100,
    Math.round((featured.current_amount / Math.max(featured.target_amount, 1)) * 100),
  )
  return {
    name: featured.name,
    icon: featured.icon,
    color: featured.color,
    current: featured.current_amount,
    target: featured.target_amount,
    pct,
    completedThisMonth,
  }
}

export interface ComputeWrappedInput {
  year: number
  /** 0-indexed month (0 = Enero, 3 = Abril). */
  month0: number
  transactions: Transaction[]
  previousTransactions: Transaction[]
  goals: Goal[]
  portfolioLogs: PortfolioLog[]
  /**
   * Portfolios owned by the user. Needed so we can attribute each portfolio
   * log to ARS or USD when aggregating investment movements. Only `id` and
   * `currency` are read, but callers may pass fuller rows. Optional — tests
   * and legacy callers can omit it; we just skip the portfolio-deposit
   * contribution in that case.
   */
  portfolios?: Pick<Portfolio, 'id' | 'currency'>[]
  /**
   * All-time `savings` transactions up to end of the target month. Used to
   * derive `savingsBalance{ARS,USD}` — the user's current savings balance,
   * not just what they added this month. Optional; callers that only care
   * about month-only numbers can omit it and the balance fields will match
   * the monthly contribution.
   */
  allSavingsTxs?: Transaction[]
  profile: Pick<Profile, 'full_name' | 'nickname' | 'mood_emoji'> | null
}

/**
 * Pure function — no I/O. Given the month's data (plus the previous month for
 * deltas), produce the WrappedData consumed by the slides.
 */
export function computeWrapped(input: ComputeWrappedInput): WrappedData {
  const { year, month0, transactions, previousTransactions, goals, portfolioLogs, portfolios, allSavingsTxs, profile } = input
  const active = activeTxs(transactions)
  const prevActive = activeTxs(previousTransactions)

  const user = buildUser(profile)
  const totals = buildTotals(active)
  const balance = buildBalance(active, prevActive)
  const topCategory = buildTopCategory(active)
  const peakDay = buildPeakDay(active, year, month0)
  const savings = buildSavings(active, prevActive, portfolioLogs, portfolios ?? [], allSavingsTxs ?? [])
  const goal = buildGoal(goals, year, month0)

  // Personality needs aggregate signals we already computed.
  const socialSpend = active
    .filter((t) => t.type === 'expense' && t.currency === 'ARS' && isSocialCategory(t.category?.name))
    .reduce((s, t) => s + t.amount, 0)
  const prevExpenseARS = sumByType(prevActive, 'expense', 'ARS')
  const expenseDeltaVsPrev =
    prevExpenseARS > 0
      ? Math.round(((balance.expense - prevExpenseARS) / prevExpenseARS) * 100)
      : 0

  const personality: WrappedPersonalityId = derivePersonality({
    income: balance.income,
    expense: balance.expense,
    savings: savings.savings,
    investment: savings.investment,
    expenseDeltaVsPrev: prevActive.length > 0 ? expenseDeltaVsPrev : 0,
    socialSpend,
    movementCount: totals.movements,
  })

  const equivalents = topCategory
    ? pickEquivalents(topCategory.amount)
    : []

  const empty = totals.movements === 0

  return {
    month: monthLabel(month0),
    monthKey: `${year}-${String(month0 + 1).padStart(2, '0')}`,
    year,
    user,
    totals,
    balance,
    topCategory,
    equivalents,
    peakDay,
    savings,
    goal,
    personality,
    empty,
  }
}
