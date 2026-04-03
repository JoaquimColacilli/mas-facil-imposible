'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Transaction, TransactionType, Currency, Portfolio } from '@/lib/types'
import { formatCurrency, formatDate, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '@/lib/types'
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, ArrowRight, Minus, BarChart2, Download, Info } from 'lucide-react'
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  getPeriodRange, getComparisonRange, computeDelta, getGranularity,
  filterByPeriod, sumByType, groupByInterval, buildSparklineData,
  computeSavingsRates, computeExpenseByCategory, getPeriodLabel, toDateStr,
  type PeriodPreset, type DeltaResult, type CategoryBreakdown, type SparklinePoint,
} from '@/lib/analytics-utils'

type CurrencyFilter = Currency | 'ALL'

// ─── Constants ─────────────────────────────────────────────────────────────────

const SEMANTIC_COLORS = {
  income: '#10b981',
  expense: '#ef4444',
  balance: '#a3a3a3',
  savings: '#3b82f6',
  investment: '#a855f7',
} as const

const PERIOD_OPTIONS: { key: PeriodPreset; label: string }[] = [
  { key: 'this-month', label: 'Este mes' },
  { key: 'last-month', label: 'Mes anterior' },
  { key: '3-months', label: '3 meses' },
  { key: '6-months', label: '6 meses' },
  { key: '12-months', label: '12 meses' },
  { key: 'custom', label: 'Personalizado' },
]

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  fontSize: 12,
  color: 'hsl(var(--card-foreground))',
  padding: '8px 12px',
}

const TOOLTIP_LABEL_STYLE = { color: 'hsl(var(--muted-foreground))' }
const TOOLTIP_ITEM_STYLE = { color: 'hsl(var(--card-foreground))' }

const AXIS_TICK = { fontSize: 11, fill: 'currentColor' }

// ─── PDF Generation ────────────────────────────────────────────────────────────

async function generateAnalyticsPDF(
  periodLabel: string,
  kpis: { label: string; value: number }[],
  categories: CategoryBreakdown[],
  topTxs: Transaction[],
  currency: Currency,
) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()

  // Dark background
  doc.setFillColor(20, 20, 24)
  doc.rect(0, 0, 210, 297, 'F')

  // Header
  doc.setTextColor(240, 240, 240)
  doc.setFontSize(18)
  doc.text('MFI — Análisis Financiero', 20, 22)

  doc.setFontSize(11)
  doc.setTextColor(160, 160, 165)
  doc.text(periodLabel, 20, 30)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 20, 36)

  // Divider
  doc.setDrawColor(60, 60, 65)
  doc.line(20, 40, 190, 40)

  const tableDefaults = {
    theme: 'grid' as const,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [35, 35, 40] as [number, number, number], textColor: [200, 200, 205] as [number, number, number], fontStyle: 'bold' as const },
    bodyStyles: { fillColor: [25, 25, 30] as [number, number, number], textColor: [220, 220, 225] as [number, number, number] },
    alternateRowStyles: { fillColor: [30, 30, 35] as [number, number, number] },
    margin: { left: 20, right: 20 },
  }

  // KPIs table
  doc.setTextColor(200, 200, 205)
  doc.setFontSize(13)
  doc.text('Resumen', 20, 50)

  autoTable(doc, {
    ...tableDefaults,
    startY: 54,
    head: [['Métrica', 'Valor']],
    body: kpis.map((k) => [k.label, formatCurrency(k.value, currency)]),
    columnStyles: { 1: { halign: 'right', font: 'courier' } },
  })

  // Categories table
  if (categories.length > 0) {
    const catY = (doc as any).lastAutoTable.finalY + 12
    doc.setTextColor(200, 200, 205)
    doc.setFontSize(13)
    doc.text('Gastos por categoría', 20, catY)

    autoTable(doc, {
      ...tableDefaults,
      startY: catY + 4,
      head: [['Categoría', '%', 'Monto']],
      body: categories.map((c) => [c.name, `${c.percentage}%`, formatCurrency(c.value, currency)]),
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', font: 'courier' } },
    })
  }

  // Top movements table
  if (topTxs.length > 0) {
    const txY = (doc as any).lastAutoTable.finalY + 12
    doc.setTextColor(200, 200, 205)
    doc.setFontSize(13)
    doc.text('Mayores movimientos', 20, txY)

    autoTable(doc, {
      ...tableDefaults,
      startY: txY + 4,
      styles: { fontSize: 9, cellPadding: 3 },
      head: [['Descripción', 'Fecha', 'Tipo', 'Monto']],
      body: topTxs.slice(0, 10).map((tx) => [
        tx.note || tx.category?.name || 'Sin descripción',
        new Date(tx.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
        TRANSACTION_TYPE_LABELS[tx.type],
        `${tx.type === 'expense' ? '-' : '+'}${formatCurrency(tx.amount, currency)}`,
      ]),
      columnStyles: { 3: { halign: 'right', font: 'courier' } },
    })
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setTextColor(100, 100, 105)
  doc.setFontSize(8)
  doc.text(
    `Generado por MFI • ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    105, pageHeight - 10, { align: 'center' },
  )

  doc.save(`MFI-Analisis-${periodLabel.replace(/[^a-zA-Z0-9áéíóúñ\s]/g, '').trim().replace(/\s+/g, '-')}.pdf`)
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
      <TooltipProvider delayDuration={200}>
        <UiTooltip>
          <TooltipTrigger asChild>
            <Info className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground cursor-help transition-colors shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[280px] text-[11px] leading-relaxed">
            {tooltip}
          </TooltipContent>
        </UiTooltip>
      </TooltipProvider>
    </div>
  )
}

function PeriodSelector({
  preset, setPreset,
  customStart, setCustomStart,
  customEnd, setCustomEnd,
  currency, setCurrency,
  comparison, setComparison,
  onDownload,
}: {
  preset: PeriodPreset
  setPreset: (p: PeriodPreset) => void
  customStart: string
  setCustomStart: (s: string) => void
  customEnd: string
  setCustomEnd: (s: string) => void
  currency: CurrencyFilter
  setCurrency: (c: CurrencyFilter) => void
  comparison: boolean
  setComparison: (b: boolean) => void
  onDownload: (period: string) => void
}) {
  const [dlOpen, setDlOpen] = useState(false)
  const dlRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setDlOpen(false)
    }
    if (dlOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dlOpen])

  const currentYear = new Date().getFullYear()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Period chips */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {PERIOD_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all duration-150',
                preset === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border hidden sm:block" />

        {/* Currency toggle */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {([['ALL', 'Todas'], ['ARS', 'ARS'], ['USD', 'USD']] as [CurrencyFilter, string][]).map(([c, label]) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-bold transition-colors duration-150',
                currency === c
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border hidden sm:block" />

        {/* Comparison toggle with tooltip */}
        <TooltipProvider delayDuration={300}>
          <UiTooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setComparison(!comparison)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150',
                  comparison
                    ? 'bg-accent/20 text-accent-foreground border border-accent/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <BarChart2 className="w-3 h-3" />
                vs anterior
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-[11px]">
              Compara las métricas del período actual con el período inmediatamente anterior. Ej: si estás viendo "Este mes", compara contra el mes pasado.
            </TooltipContent>
          </UiTooltip>
        </TooltipProvider>

        <div className="w-px h-5 bg-border hidden sm:block" />

        {/* Download PDF dropdown */}
        <div className="relative" ref={dlRef}>
          <button
            onClick={() => setDlOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          {dlOpen && (
            <div className="absolute right-0 top-[calc(100%+4px)] w-48 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150">
              {[
                { key: 'this-month', label: 'Mes actual' },
                { key: 'last-month', label: 'Mes anterior' },
                { key: 'year', label: `Año completo ${currentYear}` },
                { key: 'all', label: 'Todo el historial' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { onDownload(opt.key); setDlOpen(false) }}
                  className="w-full px-4 py-2.5 text-left text-[12px] text-foreground hover:bg-muted transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom date range inputs */}
      {preset === 'custom' && (
        <div className="flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-8 px-2 rounded-md border border-border bg-card text-[12px] text-foreground [color-scheme:dark]"
          />
          <span className="text-[11px] text-muted-foreground">hasta</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-8 px-2 rounded-md border border-border bg-card text-[12px] text-foreground [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  )
}

function MiniSparkline({ data, color, width = 64, height = 28 }: {
  data: SparklinePoint[]
  color: string
  width?: number
  height?: number
}) {
  if (data.length < 2 || data.every((p) => p.value === 0)) return null

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#', '')})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function DeltaBadge({ delta }: { delta: DeltaResult }) {
  if (delta.value === 0 && delta.percentage === 0) return null

  const isUp = delta.value >= 0
  const Icon = isUp ? TrendingUp : TrendingDown

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums',
        delta.isPositive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500',
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {Math.abs(Math.round(delta.percentage))}%
    </span>
  )
}

const KPI_ICONS = {
  income: TrendingUp,
  expense: Wallet,
  balance: Minus,
  savings: PiggyBank,
  investment: BarChart3,
} as const

function KPICard({ label, arsValue, usdValue, color, currencyFilter, sparkline, delta, iconKey, index, sublabel }: {
  label: string
  arsValue: number
  usdValue: number
  color: string
  currencyFilter: CurrencyFilter
  sparkline: SparklinePoint[]
  delta: DeltaResult | null
  iconKey: keyof typeof KPI_ICONS
  index: number
  sublabel?: string
}) {
  const Icon = KPI_ICONS[iconKey]
  const showArs = currencyFilter === 'ALL' || currencyFilter === 'ARS'
  const showUsd = currencyFilter === 'ALL' || currencyFilter === 'USD'
  const hasArs = arsValue !== 0
  const hasUsd = usdValue !== 0

  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-2"
      style={{
        animation: `fade-in-up 0.4s ease-out ${index * 80}ms forwards`,
        opacity: 0,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 shrink-0" style={{ color }} />
          <span className="text-[12px] text-muted-foreground font-medium">{label}</span>
        </div>
        {delta && <DeltaBadge delta={delta} />}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          {showArs && (currencyFilter !== 'ALL' || hasArs) && (
            <p className="text-xl md:text-2xl font-semibold tabular-nums font-mono tracking-tight" style={{ color }}>
              {formatCurrency(arsValue, 'ARS')}
            </p>
          )}
          {showUsd && (currencyFilter !== 'ALL' || hasUsd) && (
            <p className={cn(
              'font-semibold tabular-nums font-mono tracking-tight',
              currencyFilter === 'ALL' && hasArs ? 'text-sm md:text-base text-muted-foreground mt-0.5' : 'text-xl md:text-2xl',
            )} style={currencyFilter === 'ALL' && hasArs ? undefined : { color }}>
              {formatCurrency(usdValue, 'USD')}
            </p>
          )}
          {!hasArs && !hasUsd && (
            <p className="text-xl md:text-2xl font-semibold tabular-nums font-mono tracking-tight text-muted-foreground/40">
              {formatCurrency(0, currencyFilter === 'USD' ? 'USD' : 'ARS')}
            </p>
          )}
          {sublabel && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{sublabel}</p>}
        </div>
        <MiniSparkline data={sparkline} color={color} />
      </div>
    </div>
  )
}

function ChartTooltipContent({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE}>
      <p className="text-[11px] text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-[12px]">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-medium tabular-nums font-mono ml-auto text-foreground">{formatCurrency(entry.value, currency === 'ALL' ? 'ARS' : currency)}</span>
        </div>
      ))}
    </div>
  )
}

function EvolutionChart({ data, comparison, currency, periodLabel }: {
  data: any[]
  comparison: boolean
  currency: CurrencyFilter
  periodLabel: string
}) {
  if (data.length === 0) return null

  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-5"
      style={{ animation: 'fade-in-up 0.5s ease-out 0.4s forwards', opacity: 0 }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <SectionTitle title="Evolución" tooltip="Muestra tus ingresos y gastos día a día (o semana/mes según el rango). Cada punto es el total de movimientos confirmados en ese período." />
          <p className="text-[12px] text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {[
            { key: 'income', label: 'Ingresos', color: SEMANTIC_COLORS.income },
            { key: 'expense', label: 'Gastos', color: SEMANTIC_COLORS.expense },
          ].map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SEMANTIC_COLORS.income} stopOpacity={0.25} />
                <stop offset="95%" stopColor={SEMANTIC_COLORS.income} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SEMANTIC_COLORS.expense} stopOpacity={0.25} />
                <stop offset="95%" stopColor={SEMANTIC_COLORS.expense} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              width={40}
            />
            <Tooltip content={<ChartTooltipContent currency={currency} />} />

            {comparison && (
              <>
                <Area
                  type="monotone" dataKey="compIncome" name="Ingresos (anterior)"
                  stroke={SEMANTIC_COLORS.income} strokeWidth={1} strokeDasharray="4 4"
                  strokeOpacity={0.35} fill="none" isAnimationActive={false}
                />
                <Area
                  type="monotone" dataKey="compExpense" name="Gastos (anterior)"
                  stroke={SEMANTIC_COLORS.expense} strokeWidth={1} strokeDasharray="4 4"
                  strokeOpacity={0.35} fill="none" isAnimationActive={false}
                />
              </>
            )}

            <Area
              type="monotone" dataKey="income" name="Ingresos"
              stroke={SEMANTIC_COLORS.income} strokeWidth={2}
              fill="url(#gradIncome)" animationDuration={800}
            />
            <Area
              type="monotone" dataKey="expense" name="Gastos"
              stroke={SEMANTIC_COLORS.expense} strokeWidth={2}
              fill="url(#gradExpense)" animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CategoryBreakdownSection({ categories, currency, hoveredCategory, setHoveredCategory }: {
  categories: CategoryBreakdown[]
  currency: CurrencyFilter
  hoveredCategory: string | null
  setHoveredCategory: (c: string | null) => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (categories.length === 0) return null

  const maxValue = categories[0]?.value ?? 1

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="mb-4">
        <SectionTitle title="Gastos por categoría" tooltip="Distribución de tus gastos agrupados por categoría en el período seleccionado. Los porcentajes son relativos al total de gastos. En modo 'Todas', las categorías USD se muestran por separado." />
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {mounted && (
          <div className="shrink-0">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, i) => setHoveredCategory(categories[i].name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  {categories.map((cat) => (
                    <Cell
                      key={cat.name}
                      fill={cat.color}
                      opacity={hoveredCategory === null || hoveredCategory === cat.name ? 1 : 0.3}
                      stroke="none"
                      style={{ cursor: 'pointer', transition: 'opacity 150ms ease-out' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex flex-col gap-2.5 flex-1 min-w-0 w-full">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredCategory(cat.name)}
              onMouseLeave={() => setHoveredCategory(null)}
              onClick={() => console.log('Filter by category:', cat.name)}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className={cn(
                    'text-[12px] truncate transition-colors duration-150',
                    hoveredCategory === cat.name ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}>
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground/60">{cat.percentage}%</span>
                  <span className="text-[12px] font-medium tabular-nums font-mono text-foreground">
                    {formatCurrency(cat.value, currency === 'ALL' ? (cat.name.endsWith('(USD)') ? 'USD' : 'ARS') : currency)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${(cat.value / maxValue) * 100}%`,
                    backgroundColor: cat.color,
                    opacity: hoveredCategory === null || hoveredCategory === cat.name ? 1 : 0.3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TopMovements({ transactions, currency }: { transactions: Transaction[]; currency: CurrencyFilter }) {
  const topTxs = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  }, [transactions])

  if (topTxs.length === 0) return null

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="mb-4">
        <SectionTitle title="Mayores movimientos" tooltip="Los 10 movimientos con mayor monto del período seleccionado, ordenados de mayor a menor. Incluye ingresos, gastos, ahorros e inversiones." />
      </div>
      <div className="flex flex-col">
        {topTxs.map((tx, i) => (
          <div
            key={tx.id}
            className={cn(
              'flex items-center gap-3 py-2.5',
              i < topTxs.length - 1 && 'border-b border-border/40',
            )}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: tx.category?.color ?? '#6b7280' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-foreground truncate">
                {tx.note || tx.category?.name || 'Sin descripción'}
              </p>
              <p className="text-[10px] text-muted-foreground/60">{formatDate(tx.date)}</p>
            </div>
            <span className={cn(
              'text-[12px] font-medium tabular-nums font-mono shrink-0',
              TRANSACTION_TYPE_COLORS[tx.type],
            )}>
              {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, currency === 'ALL' ? tx.currency : currency)}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/transactions"
        className="flex items-center gap-1 mt-3 text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium"
      >
        Ver todos <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

function SavingsRateChart({ singleData, dualData, dual }: {
  singleData: { label: string; rate: number }[]
  dualData: { label: string; arsRate: number; usdRate: number }[]
  dual: boolean
}) {
  const data = dual ? dualData : singleData
  const hasAnyData = data.length > 0 && (dual
    ? dualData.some((d) => d.arsRate !== 0 || d.usdRate !== 0)
    : singleData.some((d) => d.rate !== 0))

  if (!hasAnyData) return null

  const avgArs = dual ? Math.round(dualData.reduce((s, d) => s + d.arsRate, 0) / dualData.length) : 0
  const avgUsd = dual ? Math.round(dualData.reduce((s, d) => s + d.usdRate, 0) / dualData.length) : 0
  const avgSingle = !dual ? Math.round(singleData.reduce((s, d) => s + d.rate, 0) / singleData.length) : 0

  function rateColor(r: number) {
    return r >= 20 ? 'text-emerald-500' : r >= 0 ? 'text-amber-500' : 'text-red-500'
  }

  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-5"
      style={{ animation: 'fade-in-up 0.5s ease-out 0.7s forwards', opacity: 0 }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <SectionTitle title="Tasa de ahorro" tooltip="Porcentaje de tus ingresos que no gastaste cada mes. Fórmula: (ingresos − gastos) / ingresos × 100. No está relacionado con movimientos de tipo 'Ahorro'. La línea punteada marca la meta del 20%." />
          <p className="text-[12px] text-muted-foreground">Últimos 12 meses</p>
        </div>
        {dual ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEMANTIC_COLORS.savings }} />
              <span className={cn('text-[14px] font-bold tabular-nums font-mono', rateColor(avgArs))}>{avgArs}%</span>
              <span className="text-[10px] text-muted-foreground">ARS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEMANTIC_COLORS.income }} />
              <span className={cn('text-[14px] font-bold tabular-nums font-mono', rateColor(avgUsd))}>{avgUsd}%</span>
              <span className="text-[10px] text-muted-foreground">USD</span>
            </div>
          </div>
        ) : (
          <span className={cn('text-[18px] font-bold tabular-nums font-mono', rateColor(avgSingle))}>
            {avgSingle}%
          </span>
        )}
      </div>

      <div className="text-muted-foreground">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={36}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={(v: number, name: string) => [`${v}%`, name === 'arsRate' ? 'ARS' : name === 'usdRate' ? 'USD' : 'Tasa de ahorro']}
            />
            <ReferenceLine
              y={20}
              stroke="currentColor"
              strokeDasharray="5 5"
              strokeOpacity={0.4}
              label={{
                value: 'Meta 20%',
                position: 'right',
                fill: 'currentColor',
                fontSize: 10,
              }}
            />
            <Line
              type="monotone" dataKey={dual ? 'arsRate' : 'rate'} name={dual ? 'arsRate' : 'rate'}
              stroke={SEMANTIC_COLORS.savings} strokeWidth={2}
              dot={{ r: 3, fill: SEMANTIC_COLORS.savings, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: SEMANTIC_COLORS.savings }}
              animationDuration={1000}
            />
            {dual && (
              <Line
                type="monotone" dataKey="usdRate" name="usdRate"
                stroke={SEMANTIC_COLORS.income} strokeWidth={2}
                dot={{ r: 3, fill: SEMANTIC_COLORS.income, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: SEMANTIC_COLORS.income }}
                animationDuration={1000}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function EmptyState({ otherCurrencyCount, otherCurrency, onSwitchCurrency }: {
  otherCurrencyCount: number
  otherCurrency: Currency
  onSwitchCurrency: () => void
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-16 text-center">
      <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      {otherCurrencyCount > 0 ? (
        <>
          <p className="text-[13px] text-muted-foreground">
            No hay movimientos en este período para la moneda seleccionada.
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            Hay {otherCurrencyCount} movimiento{otherCurrencyCount > 1 ? 's' : ''} en {otherCurrency}.
          </p>
          <button
            onClick={onSwitchCurrency}
            className="mt-3 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            Ver en {otherCurrency}
          </button>
        </>
      ) : (
        <>
          <p className="text-[13px] text-muted-foreground">
            No hay movimientos en este período.
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            Probá cambiando el rango de fechas.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function AnalyticsClient({ transactions, portfolios }: { transactions: Transaction[]; portfolios: Portfolio[] }) {
  const [preset, setPreset] = useState<PeriodPreset>('this-month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [currency, setCurrency] = useState<CurrencyFilter>('ALL')
  const [comparison, setComparison] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  // Initialize custom dates
  useEffect(() => {
    if (!customStart) {
      const now = new Date()
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      setCustomStart(s.toISOString().split('T')[0])
      setCustomEnd(now.toISOString().split('T')[0])
    }
  }, [])

  // Period range
  const { startDate, endDate } = useMemo(
    () => getPeriodRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  )

  const periodLabel = useMemo(
    () => getPeriodLabel(preset, startDate, endDate),
    [preset, startDate, endDate],
  )

  // Filter transactions by period and currency
  const periodTxs = useMemo(
    () => {
      const filtered = filterByPeriod(transactions, startDate, endDate)
      return currency === 'ALL' ? filtered : filtered.filter((t) => t.currency === currency)
    },
    [transactions, startDate, endDate, currency],
  )

  // Comparison period
  const compRange = useMemo(
    () => comparison ? getComparisonRange(startDate, endDate) : null,
    [comparison, startDate, endDate],
  )

  const compTxs = useMemo(
    () => {
      if (!compRange) return []
      const filtered = filterByPeriod(transactions, compRange.startDate, compRange.endDate)
      return currency === 'ALL' ? filtered : filtered.filter((t) => t.currency === currency)
    },
    [transactions, compRange, currency],
  )

  // Portfolio balance
  const portfolioBalance = useMemo(
    () => {
      const ps = currency === 'ALL' ? portfolios : portfolios.filter((p) => p.currency === currency)
      return ps.reduce((s, p) => s + p.balance, 0)
    },
    [portfolios, currency],
  )

  // Per-currency portfolio balances (for KPI dual display)
  const arsPortfolioBalance = useMemo(() => portfolios.filter((p) => p.currency === 'ARS').reduce((s, p) => s + p.balance, 0), [portfolios])
  const usdPortfolioBalance = useMemo(() => portfolios.filter((p) => p.currency === 'USD').reduce((s, p) => s + p.balance, 0), [portfolios])

  // KPI values — always compute per-currency for dual display
  const kpiData = useMemo(() => {
    const arsTxs = periodTxs.filter((t) => t.currency === 'ARS')
    const usdTxs = periodTxs.filter((t) => t.currency === 'USD')

    const byType = (txs: Transaction[], type: TransactionType) => sumByType(txs, type)

    const arsIncome = byType(arsTxs, 'income'), usdIncome = byType(usdTxs, 'income')
    const arsExpense = byType(arsTxs, 'expense'), usdExpense = byType(usdTxs, 'expense')
    const arsSavings = byType(arsTxs, 'savings'), usdSavings = byType(usdTxs, 'savings')
    const arsInvestTx = byType(arsTxs, 'investment'), usdInvestTx = byType(usdTxs, 'investment')
    const arsBalance = arsIncome - arsExpense, usdBalance = usdIncome - usdExpense

    const arsInvest = arsPortfolioBalance > 0 ? arsPortfolioBalance : arsInvestTx
    const usdInvest = usdPortfolioBalance > 0 ? usdPortfolioBalance : usdInvestTx
    const investIsPortfolio = arsPortfolioBalance > 0 || usdPortfolioBalance > 0

    const incomeSparkline = buildSparklineData(periodTxs, 'income', startDate, endDate)
    const expenseSparkline = buildSparklineData(periodTxs, 'expense', startDate, endDate)
    const savingsSparkline = buildSparklineData(periodTxs, 'savings', startDate, endDate)
    const investmentSparkline = buildSparklineData(periodTxs, 'investment', startDate, endDate)
    const balanceSparkline = incomeSparkline.map((p, i) => ({ value: p.value - expenseSparkline[i].value }))

    let deltas: Record<string, DeltaResult> | null = null
    if (comparison && compTxs.length > 0) {
      // Deltas use combined amounts (best effort overview)
      const totalIncome = arsIncome + usdIncome
      const totalExpense = arsExpense + usdExpense
      const pIncome = sumByType(compTxs, 'income')
      const pExpense = sumByType(compTxs, 'expense')
      const pSavings = sumByType(compTxs, 'savings')
      const pInvestment = sumByType(compTxs, 'investment')
      deltas = {
        income: computeDelta(totalIncome, pIncome),
        expense: computeDelta(totalExpense, pExpense, true),
        balance: computeDelta(totalIncome - totalExpense, pIncome - pExpense),
        savings: computeDelta(arsSavings + usdSavings, pSavings),
        investment: investIsPortfolio ? computeDelta(0, 0) : computeDelta(arsInvestTx + usdInvestTx, pInvestment),
      }
    }

    return {
      items: [
        { label: 'Ingresos', arsValue: arsIncome, usdValue: usdIncome, color: SEMANTIC_COLORS.income, sparkline: incomeSparkline, iconKey: 'income' as const, sublabel: undefined },
        { label: 'Gastos', arsValue: arsExpense, usdValue: usdExpense, color: SEMANTIC_COLORS.expense, sparkline: expenseSparkline, iconKey: 'expense' as const, sublabel: undefined },
        { label: 'Balance', arsValue: arsBalance, usdValue: usdBalance, color: SEMANTIC_COLORS.balance, sparkline: balanceSparkline, iconKey: 'balance' as const, sublabel: undefined },
        { label: 'Ahorros', arsValue: arsSavings, usdValue: usdSavings, color: SEMANTIC_COLORS.savings, sparkline: savingsSparkline, iconKey: 'savings' as const, sublabel: undefined },
        { label: 'Inversiones', arsValue: arsInvest, usdValue: usdInvest, color: SEMANTIC_COLORS.investment, sparkline: investmentSparkline, iconKey: 'investment' as const, sublabel: investIsPortfolio ? 'Saldo actual' : undefined },
      ],
      deltas,
    }
  }, [periodTxs, compTxs, comparison, startDate, endDate, arsPortfolioBalance, usdPortfolioBalance])

  // Evolution chart data
  const chartData = useMemo(() => {
    const granularity = getGranularity(startDate, endDate)
    const mainData = groupByInterval(periodTxs, startDate, endDate, granularity)

    if (comparison && compRange) {
      const compData = groupByInterval(compTxs, compRange.startDate, compRange.endDate, granularity)
      return mainData.map((point, i) => ({
        ...point,
        compIncome: compData[i]?.income ?? 0,
        compExpense: compData[i]?.expense ?? 0,
      }))
    }

    return mainData
  }, [periodTxs, compTxs, comparison, compRange, startDate, endDate])

  // Expense breakdown — tag USD categories when showing both currencies
  const categories = useMemo(() => {
    if (currency === 'ALL') {
      const tagged = periodTxs.map((t) =>
        t.currency === 'USD' && t.category
          ? { ...t, category: { ...t.category, name: `${t.category.name} (USD)` } }
          : t,
      )
      return computeExpenseByCategory(tagged)
    }
    return computeExpenseByCategory(periodTxs)
  }, [periodTxs, currency])

  // Savings rate (always 12 months) — per-currency when ALL
  const savingsRateArs = useMemo(() => computeSavingsRates(transactions.filter((t) => t.currency === 'ARS'), 12), [transactions])
  const savingsRateUsd = useMemo(() => computeSavingsRates(transactions.filter((t) => t.currency === 'USD'), 12), [transactions])
  const savingsRateDual = useMemo(
    () => savingsRateArs.map((p, i) => ({ label: p.label, arsRate: p.rate, usdRate: savingsRateUsd[i]?.rate ?? 0 })),
    [savingsRateArs, savingsRateUsd],
  )

  // Check for transactions in other currency (for empty state hint when single currency)
  const otherCurrency: Currency = currency === 'ARS' ? 'USD' : 'ARS'
  const otherCurrencyCount = useMemo(
    () => currency === 'ALL' ? 0 : filterByPeriod(transactions, startDate, endDate).filter((t) => t.currency === otherCurrency).length,
    [transactions, startDate, endDate, otherCurrency, currency],
  )

  const hasData = periodTxs.length > 0 || portfolioBalance > 0

  // PDF download handler
  function handleDownloadPDF(period: string) {
    const now = new Date()
    const y = now.getFullYear()

    let pdfStart: string, pdfEnd: string, pdfLabel: string

    switch (period) {
      case 'this-month': {
        const r = getPeriodRange('this-month')
        pdfStart = r.startDate; pdfEnd = r.endDate
        pdfLabel = getPeriodLabel('this-month', pdfStart, pdfEnd)
        break
      }
      case 'last-month': {
        const r = getPeriodRange('last-month')
        pdfStart = r.startDate; pdfEnd = r.endDate
        pdfLabel = getPeriodLabel('last-month', pdfStart, pdfEnd)
        break
      }
      case 'year':
        pdfStart = `${y}-01-01`; pdfEnd = toDateStr(now)
        pdfLabel = `Año ${y}`
        break
      default:
        pdfStart = transactions[0]?.date ?? toDateStr(now)
        pdfEnd = toDateStr(now)
        pdfLabel = 'Historial completo'
    }

    const allPdfTxs = filterByPeriod(transactions, pdfStart, pdfEnd)
    const pdfTxs = currency === 'ALL' ? allPdfTxs : allPdfTxs.filter((t) => t.currency === currency)
    const pdfCurrency: Currency = currency === 'ALL' ? 'ARS' : currency
    const pdfKpis = [
      { label: 'Ingresos', value: sumByType(pdfTxs, 'income') },
      { label: 'Gastos', value: sumByType(pdfTxs, 'expense') },
      { label: 'Balance', value: sumByType(pdfTxs, 'income') - sumByType(pdfTxs, 'expense') },
      { label: 'Ahorros', value: sumByType(pdfTxs, 'savings') },
      { label: 'Inversiones', value: portfolioBalance > 0 ? portfolioBalance : sumByType(pdfTxs, 'investment') },
    ]
    const pdfCategories = computeExpenseByCategory(pdfTxs)
    const pdfTopTxs = [...pdfTxs].sort((a, b) => b.amount - a.amount).slice(0, 10)

    generateAnalyticsPDF(pdfLabel, pdfKpis, pdfCategories, pdfTopTxs, pdfCurrency)
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header + Period Selector */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-serif font-semibold text-foreground tracking-tight">Análisis</h1>
        <PeriodSelector
          preset={preset} setPreset={setPreset}
          customStart={customStart} setCustomStart={setCustomStart}
          customEnd={customEnd} setCustomEnd={setCustomEnd}
          currency={currency} setCurrency={setCurrency}
          comparison={comparison} setComparison={setComparison}
          onDownload={handleDownloadPDF}
        />
      </div>

      {!hasData ? (
        <EmptyState
          otherCurrencyCount={otherCurrencyCount}
          otherCurrency={otherCurrency}
          onSwitchCurrency={() => setCurrency(otherCurrency)}
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpiData.items.map((kpi, i) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                arsValue={kpi.arsValue}
                usdValue={kpi.usdValue}
                color={kpi.color}
                currencyFilter={currency}
                sparkline={kpi.sparkline}
                delta={kpiData.deltas?.[kpi.iconKey] ?? null}
                iconKey={kpi.iconKey}
                index={i}
                sublabel={kpi.sublabel}
              />
            ))}
          </div>

          {/* Evolution Chart */}
          <EvolutionChart
            data={chartData}
            comparison={comparison}
            currency={currency}
            periodLabel={periodLabel}
          />

          {/* Breakdown: Categories + Top Movements */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
            style={{ animation: 'fade-in-up 0.5s ease-out 0.55s forwards', opacity: 0 }}
          >
            <CategoryBreakdownSection
              categories={categories}
              currency={currency}
              hoveredCategory={hoveredCategory}
              setHoveredCategory={setHoveredCategory}
            />
            <TopMovements transactions={periodTxs} currency={currency} />
          </div>

          {/* Savings Rate */}
          <SavingsRateChart
            singleData={currency === 'ARS' ? savingsRateArs : savingsRateUsd}
            dualData={savingsRateDual}
            dual={currency === 'ALL'}
          />
        </>
      )}
    </div>
  )
}
