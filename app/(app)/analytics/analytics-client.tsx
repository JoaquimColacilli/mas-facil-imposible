'use client'

import type { Transaction, TransactionType } from '@/lib/types'
import { formatCurrency, TRANSACTION_TYPE_LABELS } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useMemo } from 'react'

interface AnalyticsClientProps {
  transactions: Transaction[]
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const TYPE_COLORS: Record<TransactionType, string> = {
  income: 'hsl(var(--chart-1))',
  expense: 'hsl(var(--chart-3))',
  savings: 'hsl(var(--chart-2))',
  investment: 'hsl(var(--chart-5))',
}

export function AnalyticsClient({ transactions }: AnalyticsClientProps) {
  const monthlyData = useMemo(() => {
    const map: Record<string, Record<TransactionType, number>> = {}
    for (const tx of transactions) {
      const d = new Date(tx.date + 'T00:00:00')
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!map[key]) map[key] = { income: 0, expense: 0, savings: 0, investment: 0 }
      map[key][tx.type] += tx.amount
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, vals]) => {
        const [year, month] = key.split('-').map(Number)
        return { label: MONTH_NAMES[month], ...vals }
      })
  }, [transactions])

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue
      const key = tx.category?.name ?? 'Sin categoría'
      map[key] = (map[key] ?? 0) + tx.amount
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [transactions])

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalSavings = transactions.filter((t) => t.type === 'savings').reduce((s, t) => s + t.amount, 0)
  const totalInvestment = transactions.filter((t) => t.type === 'investment').reduce((s, t) => s + t.amount, 0)

  const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  const summaryItems = [
    { label: 'Ingresos', value: totalIncome, color: 'text-emerald-500', currency: 'ARS' as const },
    { label: 'Gastos', value: totalExpense, color: 'text-red-500', currency: 'ARS' as const },
    { label: 'Ahorros', value: totalSavings, color: 'text-blue-500', currency: 'ARS' as const },
    { label: 'Inversiones', value: totalInvestment, color: 'text-violet-500', currency: 'ARS' as const },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Análisis</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryItems.map(({ label, value, color, currency }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-base font-semibold tabular-nums ${color}`}>{formatCurrency(value, currency)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly bar chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Evolución mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={2} barSize={14}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: 12,
                    color: 'hsl(var(--card-foreground))',
                  }}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  formatter={(val: number, name: string) => [formatCurrency(val, 'ARS'), TRANSACTION_TYPE_LABELS[name as TransactionType] ?? name]}
                />
                <Bar dataKey="income" fill={TYPE_COLORS.income} radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" fill={TYPE_COLORS.expense} radius={[3, 3, 0, 0]} />
                <Bar dataKey="savings" fill={TYPE_COLORS.savings} radius={[3, 3, 0, 0]} />
                <Bar dataKey="investment" fill={TYPE_COLORS.investment} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2 flex-wrap">
              {(['income', 'expense', 'savings', 'investment'] as TransactionType[]).map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TYPE_COLORS[t] }} />
                  <span className="text-xs text-muted-foreground">{TRANSACTION_TYPE_LABELS[t]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense by category pie */}
      {expenseByCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Gastos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                {expenseByCategory.map(({ name, value }, i) => (
                  <div key={name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground truncate">{name}</span>
                    </div>
                    <span className="text-xs font-medium text-foreground tabular-nums">{formatCurrency(value, 'ARS')}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {transactions.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">Todavía no hay datos para mostrar. Agregá movimientos para ver tu análisis.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
