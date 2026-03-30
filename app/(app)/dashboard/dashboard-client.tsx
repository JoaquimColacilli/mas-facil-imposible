// v8 — 3-zone layout: area chart + 5 KPIs + right panel (Quick Actions, Goals donut, Spending donut)
'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Transaction, Goal, Profile } from '@/lib/types'
import { formatCurrency, formatDate, TRANSACTION_TYPE_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  PiggyBank,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Target,
  Wallet,
  Zap,
  Pencil,
  ArrowLeftRight,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuickAddTransaction } from '@/components/quick-add-transaction'
import { EditTransactionModal } from '@/components/edit-transaction-modal'
import { CategoryManagerButton } from '@/components/category-manager'
import { PendingLoans } from '@/components/pending-loans'
import { TransactionTypeModal } from '@/components/transaction-type-modal'
import type { Loan } from '@/lib/types'

type ModalType = 'income' | 'savings' | 'investment'

interface DashboardClientProps {
  profile: Profile | null
  transactions: Transaction[]
  goals: Goal[]
  loans: Loan[]
  userEmail: string
  currentMonth: string // "YYYY-MM"
}

const TYPE_CFG = {
  income:     { label: 'Ingresos',    icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  expense:    { label: 'Gastos',      icon: ArrowUpRight,  color: 'text-rose-500',    bg: 'bg-rose-500/10'    },
  savings:    { label: 'Ahorros',     icon: PiggyBank,     color: 'text-sky-500',     bg: 'bg-sky-500/10'     },
  investment: { label: 'Inversiones', icon: TrendingUp,    color: 'text-violet-500',  bg: 'bg-violet-500/10'  },
} as const

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const month = d.toLocaleString('es-AR', { month: 'long' })
  const now = new Date()
  const isCurrentMonth = y === now.getFullYear() && m - 1 === now.getMonth()
  const label = `${month.charAt(0).toUpperCase() + month.slice(1)} ${y}`
  return { label, isCurrentMonth }
}

function navigateMonth(current: string, delta: number) {
  const [y, m] = current.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function MonthNavigator({ currentMonth }: { currentMonth: string }) {
  const router = useRouter()
  const { label, isCurrentMonth } = formatMonthLabel(currentMonth)
  const now = new Date()
  const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isNow = currentMonth === nowYM

  function go(delta: number) {
    router.push(`/dashboard?month=${navigateMonth(currentMonth, delta)}`)
  }

  return (
    <div className="flex items-center gap-0 bg-muted rounded-xl overflow-hidden border border-border h-9">
      <button
        onClick={() => go(-1)}
        className="h-9 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/60 transition-colors duration-100"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onDoubleClick={() => router.push('/dashboard')}
        className={cn(
          'h-9 px-3 text-[12px] font-semibold transition-colors duration-100 whitespace-nowrap',
          isNow ? 'text-primary' : 'text-foreground',
        )}
        title="Doble clic para volver al mes actual"
      >
        {isCurrentMonth ? 'Este mes' : label}
      </button>
      <button
        onClick={() => go(+1)}
        disabled={isNow}
        className="h-9 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/60 transition-colors duration-100 disabled:opacity-25 disabled:pointer-events-none"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Build per-day income vs expenses for the AreaChart
function buildChartData(transactions: Transaction[], ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const map: Record<number, { income: number; expenses: number; expensesUSD: number }> = {}
  for (let d = 1; d <= daysInMonth; d++) map[d] = { income: 0, expenses: 0, expensesUSD: 0 }
  for (const tx of transactions) {
    const day = new Date(tx.date + 'T00:00:00').getDate()
    if (tx.type === 'income')  map[day].income += tx.amount
    if (tx.type === 'expense') {
      if (tx.currency === 'USD') map[day].expensesUSD += tx.amount
      else                       map[day].expenses    += tx.amount
    }
  }
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    income:      map[i + 1].income,
    expenses:    map[i + 1].expenses,
    expensesUSD: map[i + 1].expensesUSD,
  }))
}

// Custom tooltip for the area chart
function ChartTooltip({ active, payload, label, currency }: {
  active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: number; currency: string
}) {
  if (!active || !payload?.length) return null
  const labels: Record<string, string> = {
    income:      'Ingresos',
    expenses:    `Gastos (${currency})`,
    expensesUSD: 'Gastos (USD)',
  }
  const colors: Record<string, string> = {
    income:      'text-emerald-500',
    expenses:    'text-rose-500',
    expensesUSD: 'text-orange-400',
  }
  const txCurrency = (key: string): 'ARS' | 'USD' => key === 'expensesUSD' ? 'USD' : currency as 'ARS' | 'USD'
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2.5 shadow-lg text-[12px]">
      <p className="text-muted-foreground mb-1.5 font-medium">Día {label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <p key={p.dataKey} className={cn('font-semibold font-mono', colors[p.dataKey] ?? 'text-foreground')}>
          {labels[p.dataKey] ?? p.dataKey}: {formatCurrency(p.value, txCurrency(p.dataKey))}
        </p>
      ))}
    </div>
  )
}

// Spending breakdown donut data (separated by currency to keep values comparable)
function buildSpendingData(transactions: Transaction[]) {
  const map: Record<string, { name: string; value: number; color: string; currency: 'ARS' | 'USD' }> = {}
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const baseName = tx.category?.name ?? 'Otros'
    const cur = tx.currency ?? 'ARS'
    const key = `${baseName}__${cur}`
    const color = tx.category?.color ?? '#94a3b8'
    const displayName = cur === 'USD' ? `${baseName} (USD)` : baseName
    if (!map[key]) map[key] = { name: displayName, value: 0, color, currency: cur }
    map[key].value += tx.amount
  }
  return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6)
}

// Custom donut center label
function DonutLabel({ cx, cy, pct }: { cx: number; cy: number; pct: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.3em" className="fill-foreground" style={{ fontSize: 18, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
        {pct}%
      </tspan>
      <tspan x={cx} dy="1.4em" style={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        completado
      </tspan>
    </text>
  )
}

export function DashboardClient({
  profile,
  transactions: initialTransactions,
  goals,
  loans,
  userEmail,
  currentMonth,
}: DashboardClientProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddType, setQuickAddType] = useState<string | undefined>(undefined)
  const [greeting, setGreeting] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [mounted, setMounted] = useState(false)
  const [openTypeModal, setOpenTypeModal] = useState<ModalType | null>(null)
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense' | 'savings' | 'investment'>('all')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches')
  }, [])

  useEffect(() => {
    const handler = () => setShowQuickAdd(true)
    window.addEventListener('open-quick-add', handler)
    return () => window.removeEventListener('open-quick-add', handler)
  }, [])

  useEffect(() => {
    setTransactions(initialTransactions)
  }, [initialTransactions])

  useEffect(() => { setMounted(true) }, [])

  const firstName = profile?.full_name?.split(' ')[0] ?? userEmail.split('@')[0]
  const currency  = profile?.default_currency ?? 'ARS'

  const income      = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses    = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savings     = transactions.filter((t) => t.type === 'savings').reduce((s, t) => s + t.amount, 0)
  const investments = transactions.filter((t) => t.type === 'investment').reduce((s, t) => s + t.amount, 0)
  const balance     = income - expenses - savings - investments
  const filteredTxs = txFilter === 'all' ? transactions : transactions.filter((t) => t.type === txFilter)
  const recent      = filteredTxs.slice(0, 8)

  const { label: monthLabel, isCurrentMonth } = formatMonthLabel(currentMonth)
  const chartData      = useMemo(() => buildChartData(transactions, currentMonth), [transactions, currentMonth])
  const spendingData   = useMemo(() => buildSpendingData(transactions), [transactions])

  const kpiCards = [
    { label: 'Balance total',  value: balance,     icon: Wallet,       color: 'text-primary',          bg: 'bg-primary/10'          },
    { label: 'Ingresos',       value: income,      icon: ArrowDownLeft, color: 'text-emerald-500',     bg: 'bg-emerald-500/10'      },
    { label: 'Gastos',         value: expenses,    icon: ArrowUpRight,  color: 'text-rose-500',        bg: 'bg-rose-500/10'         },
    { label: 'Ahorros',        value: savings,     icon: PiggyBank,     color: 'text-sky-500',         bg: 'bg-sky-500/10'          },
    { label: 'Inversiones',    value: investments, icon: TrendingUp,    color: 'text-violet-500',      bg: 'bg-violet-500/10'       },
  ]

  function openQuickAdd(type?: string) {
    setQuickAddType(type)
    setShowQuickAdd(true)
  }

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.1em] uppercase">
            {greeting || '\u00A0'}
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] font-semibold text-foreground leading-tight tracking-tight capitalize mt-0.5">
            {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <MonthNavigator currentMonth={currentMonth} />
          <Button
            onClick={() => openQuickAdd()}
            size="sm"
            className="gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-xl shadow-none transition-all duration-150 hover:scale-[1.02] hover:shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>
      </div>

      {/* ── 3-zone layout ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-5 items-start">

        {/* ── CENTER ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 min-w-0 min-h-0">

          {/* 5 KPI cards — ABOVE the chart */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpiCards.map(({ label, value, icon: Icon, color, bg }, idx) => {
              const modalType: ModalType | null =
                label === 'Ingresos'    ? 'income'     :
                label === 'Ahorros'     ? 'savings'    :
                label === 'Inversiones' ? 'investment' : null
              const borderHover =
                label === 'Ingresos'    ? 'hover:border-emerald-500/50 hover:ring-1 hover:ring-emerald-500/20' :
                label === 'Ahorros'     ? 'hover:border-sky-500/50 hover:ring-1 hover:ring-sky-500/20'        :
                label === 'Inversiones' ? 'hover:border-violet-500/50 hover:ring-1 hover:ring-violet-500/20'  : ''
              const activeBorder =
                label === 'Ingresos'    ? 'border-emerald-500/30' :
                label === 'Ahorros'     ? 'border-sky-500/30'     :
                label === 'Inversiones' ? 'border-violet-500/30'  : 'border-border'

              return modalType ? (
                <button
                  key={label}
                  onClick={() => setOpenTypeModal(modalType)}
                  className={cn(
                    'group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-[2px] animate-fade-in-up text-left cursor-pointer',
                    activeBorder, borderHover,
                  )}
                  style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
                >
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110', bg)}>
                    <Icon className={cn('w-3.5 h-3.5', color)} />
                  </div>
                  <div>
                    <p className="font-mono tabular-nums font-bold text-[17px] leading-none tracking-tight text-foreground">
                      {formatCurrency(value, currency as 'ARS' | 'USD')}
                    </p>
                    <p className={cn('text-[10px] font-semibold mt-1.5 uppercase tracking-wider leading-none flex items-center gap-1', color.replace('text-', 'text-').replace('500', '400'))}>
                      {label}
                      <span className="opacity-60 text-[9px]">↗</span>
                    </p>
                  </div>
                </button>
              ) : (
                <div
                  key={label}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-[2px] animate-fade-in-up"
                  style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
                >
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110', bg)}>
                    <Icon className={cn('w-3.5 h-3.5', color)} />
                  </div>
                  <div>
                    <p className="font-mono tabular-nums font-bold text-[17px] leading-none tracking-tight text-foreground">
                      {formatCurrency(value, currency as 'ARS' | 'USD')}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1.5 uppercase tracking-wider leading-none">
                      {label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Monthly Overview chart — BELOW the KPIs */}
          <div className="bg-card border border-border rounded-2xl p-5 overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[14px] font-semibold text-foreground leading-none">Monthly Overview</h2>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Income vs. Expenses &mdash; {monthLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
                  Ingresos
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse-slow" style={{ animationDelay: '0.5s' }} />
                  Gastos
                </span>
                <span className="flex items-center gap-1.5 text-orange-400">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse-slow" style={{ animationDelay: '1s' }} />
                  Gastos USD
                </span>
              </div>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpensesUSD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    yAxisId="income"
                    orientation="left"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v === 0 ? '0' : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                    width={40}
                  />
                  <YAxis
                    yAxisId="expenses"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v === 0 ? '0' : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                    width={40}
                  />
                  <YAxis yAxisId="expensesUSD" orientation="right" hide />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Area
                    yAxisId="income"
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorIncome)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981' }}
                  />
                  <Area
                    yAxisId="expenses"
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#colorExpenses)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#f43f5e' }}
                  />
                  <Area
                    yAxisId="expensesUSD"
                    type="monotone"
                    dataKey="expensesUSD"
                    stroke="#fb923c"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    fill="url(#colorExpensesUSD)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#fb923c' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions — grows to fill remaining height in center column */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col grow">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-[11px] font-bold text-muted-foreground tracking-[0.1em] uppercase">
                Movimientos recientes
              </h2>
              <div className="flex items-center gap-2">
                <CategoryManagerButton />
                <Link
                  href="/transactions"
                  className="text-[12px] text-muted-foreground hover:text-primary transition-colors duration-150 flex items-center gap-0.5 font-medium"
                >
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border overflow-x-auto scrollbar-none">
              {([
                { key: 'all',        label: 'Todos'       },
                { key: 'income',     label: 'Ingresos'    },
                { key: 'expense',    label: 'Gastos'      },
                { key: 'savings',    label: 'Ahorros'     },
                { key: 'investment', label: 'Inversiones' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTxFilter(key)}
                  className={cn(
                    'px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
                    txFilter === key
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground mb-1">Empezá a registrar</p>
                  <p className="text-[12px] text-muted-foreground">Tu primer movimiento aparecerá aquí.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openQuickAdd()}
                  className="h-8 rounded-xl text-[13px] gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-150"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar movimiento
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recent.map((tx) => {
                  const cfg = TYPE_CFG[tx.type as keyof typeof TYPE_CFG]
                  const Icon = cfg.icon
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-150 hover:bg-muted/30 group cursor-default"
                    >
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-110', cfg.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-medium text-foreground truncate leading-none">
                          {tx.note ?? (tx.category?.name ?? TRANSACTION_TYPE_LABELS[tx.type])}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-none">
                          {tx.category?.name && tx.note ? `${tx.category.name} · ` : ''}
                          {formatDate(tx.date)}
                          {tx.status !== 'confirmed' && (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                              {tx.status === 'pending' ? 'pendiente' : 'cancelado'}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'text-[13.5px] font-bold tabular-nums font-mono',
                          tx.type === 'income'  ? 'text-emerald-500' :
                          tx.type === 'expense' ? 'text-rose-500'    : 'text-foreground',
                        )}>
                          {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                        <button
                          onClick={() => setEditingTx(tx)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100"
                          title="Editar"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-5">

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-[11px] font-bold text-muted-foreground tracking-[0.1em] uppercase">Acciones rápidas</h2>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {([
                {
                  label: 'Agregar movimiento',
                  icon: Plus,
                  color: 'text-primary',
                  bg: 'hover:bg-primary/8 hover:border-primary/30',
                  action: () => openQuickAdd(),
                },
                {
                  label: 'Nueva meta',
                  icon: Target,
                  color: 'text-violet-500',
                  bg: 'hover:bg-violet-500/8 hover:border-violet-500/30',
                  action: () => { window.location.href = '/goals' },
                },
                {
                  label: 'Transferir fondos',
                  icon: ArrowLeftRight,
                  color: 'text-muted-foreground',
                  bg: '',
                  disabled: true,
                },
                {
                  label: 'Generar reporte',
                  icon: FileText,
                  color: 'text-muted-foreground',
                  bg: '',
                  disabled: true,
                },
              ] as const).map(({ label, icon: Icon, color, bg, action, disabled }: {
                label: string
                icon: React.ElementType
                color: string
                bg: string
                action?: () => void
                disabled?: boolean
              }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled}
                  title={disabled ? 'Próximamente' : undefined}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-transparent text-[13px] font-medium text-left',
                    'transition-all duration-150',
                    disabled
                      ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                      : cn('hover:-translate-y-[1px] hover:shadow-sm cursor-pointer', bg),
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', color)} />
                  <span className={disabled ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
                  {disabled && (
                    <span className="ml-auto text-[10px] font-semibold text-muted-foreground/50 tracking-wide">
                      Próximamente
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Spending breakdown donut — FIRST */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-[11px] font-bold text-muted-foreground tracking-[0.1em] uppercase">Distribución de gastos</h2>
            </div>
            {spendingData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center px-4">
                <Zap className="w-7 h-7 text-muted-foreground/40" />
                <p className="text-[12px] text-muted-foreground">Sin gastos este mes</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-center mb-3">
                  {mounted && <PieChart width={120} height={120}>
                    <Pie
                      data={spendingData}
                      cx={55}
                      cy={55}
                      innerRadius={36}
                      outerRadius={52}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="var(--card)"
                    >
                      {spendingData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, _: string, props: { payload?: { currency?: 'ARS' | 'USD' } }) =>
                        [formatCurrency(v, props.payload?.currency ?? (currency as 'ARS' | 'USD')), '']
                      }
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--popover-foreground)' }}
                      itemStyle={{ color: 'var(--popover-foreground)' }}
                      labelStyle={{ color: 'var(--muted-foreground)' }}
                    />
                  </PieChart>}
                </div>
                <div className="flex flex-col gap-1.5">
                  {(() => {
                    const totalARS = spendingData.filter(i => i.currency !== 'USD').reduce((s, i) => s + i.value, 0)
                    const totalUSD = spendingData.filter(i => i.currency === 'USD').reduce((s, i) => s + i.value, 0)
                    return spendingData.map((item) => {
                      const base = item.currency === 'USD' ? totalUSD : totalARS
                      const pct = base > 0 ? Math.round((item.value / base) * 100) : 0
                      return (
                        <div key={item.name} className="flex items-center gap-2 group/item">
                          <span className="w-2 h-2 rounded-full shrink-0 transition-transform duration-150 group-hover/item:scale-125" style={{ backgroundColor: item.color }} />
                          <span className="text-[11px] text-muted-foreground flex-1 truncate">{item.name}</span>
                          <span className="text-[11px] font-semibold font-mono tabular-nums text-foreground">{pct}%</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Cobros pendientes — replaces Meta de ahorros */}
          <PendingLoans initialLoans={loans} currency={currency as 'ARS' | 'USD'} />

        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showQuickAdd && (
        <QuickAddTransaction
          onClose={() => { setShowQuickAdd(false); setQuickAddType(undefined) }}
          onSuccess={() => {
            setShowQuickAdd(false)
            setQuickAddType(undefined)
            window.location.reload()
          }}
        />
      )}

      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={(updated) => {
            setTransactions((prev) => prev.map((t) => t.id === updated.id ? updated : t))
            setEditingTx(null)
          }}
          onDeleted={(id) => {
            setTransactions((prev) => prev.filter((t) => t.id !== id))
            setEditingTx(null)
          }}
        />
      )}

      {openTypeModal && (
        <TransactionTypeModal
          type={openTypeModal}
          transactions={transactions.filter((t) => t.type === openTypeModal)}
          currency={currency as 'ARS' | 'USD'}
          currentMonth={currentMonth}
          onClose={() => setOpenTypeModal(null)}
          onChanged={(updated) => {
            const type = openTypeModal
            setTransactions((prev) => [
              ...prev.filter((t) => t.type !== type),
              ...updated,
            ])
          }}
        />
      )}
    </div>
  )
}
