'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Portfolio, Currency } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput, parseMoneyInput } from '@/components/money-input'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, Info, Briefcase, Plus, ArrowRight, ArrowDownToLine, X, Download, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react'
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MarketCard } from '@/components/market-card'
import {
  type InvestmentPeriod,
  type PortfolioLogWithPortfolio,
  PERIOD_OPTIONS,
  buildChartData,
  calcPeriodReturn,
  buildHoldings,
  buildMonthlyReturns,
  buildPortfolioNameMap,
} from '@/lib/investment-utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: 12,
  color: 'hsl(var(--card-foreground))',
  padding: '10px 14px',
}

const AXIS_TICK = { fontSize: 11, fill: 'currentColor' }

const PORTFOLIO_COLORS = [
  '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return n.toFixed(0)
}

function formatMoney(amount: number, currency: string = 'USD'): string {
  const symbol = currency === 'USD' ? 'U$S' : '$'
  return `${symbol} ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
}

function formatPct(pct: number): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

function formatDateLabel(dateStr: string, period: InvestmentPeriod): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (period === '1W' || period === '1M' || period === '3M' || period === '6M') {
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }
  return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}

// ─── Section Title ────────────────────────────────────────────────────────────

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

// ─── PDF Generation ──────────────────────────────────────────────────────────

interface PdfPortfolioRow {
  name: string
  currency: string
  balance: number
  returnPct: number
}

interface PdfMonthRow {
  year: number
  months: (number | null)[]
  total: number | null
}

async function generateInvestmentsPDF(
  periodLabel: string,
  totalValue: number,
  primaryCurrency: string,
  returnAbs: number,
  returnPct: number,
  portfolioRows: PdfPortfolioRow[],
  monthRows: PdfMonthRow[],
) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()
  const sym = primaryCurrency === 'USD' ? 'U$S' : '$'
  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`

  // Dark background
  doc.setFillColor(20, 20, 24)
  doc.rect(0, 0, 210, 297, 'F')

  // Header
  doc.setTextColor(240, 240, 240)
  doc.setFontSize(18)
  doc.text('MFI — Inversiones', 20, 22)

  doc.setFontSize(11)
  doc.setTextColor(160, 160, 165)
  doc.text(periodLabel, 20, 30)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 20, 36)

  doc.setDrawColor(60, 60, 65)
  doc.line(20, 40, 190, 40)

  // KPIs
  doc.setTextColor(200, 200, 205)
  doc.setFontSize(13)
  doc.text('Resumen', 20, 50)

  const tableDefaults = {
    theme: 'grid' as const,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [35, 35, 40] as [number, number, number], textColor: [200, 200, 205] as [number, number, number], fontStyle: 'bold' as const },
    bodyStyles: { fillColor: [25, 25, 30] as [number, number, number], textColor: [220, 220, 225] as [number, number, number] },
    alternateRowStyles: { fillColor: [30, 30, 35] as [number, number, number] },
    margin: { left: 20, right: 20 },
  }

  autoTable(doc, {
    ...tableDefaults,
    startY: 54,
    head: [['Métrica', 'Valor']],
    body: [
      ['Valor total', `${sym} ${fmt(totalValue)}`],
      ['Rendimiento', `${sym} ${fmt(returnAbs)} (${fmtPct(returnPct)})`],
      ['Portfolios', String(portfolioRows.length)],
    ],
    columnStyles: { 1: { halign: 'right', font: 'courier' } },
  })

  // Portfolios table
  if (portfolioRows.length > 0) {
    const y = (doc as any).lastAutoTable.finalY + 12
    doc.setTextColor(200, 200, 205)
    doc.setFontSize(13)
    doc.text('Portfolios', 20, y)

    autoTable(doc, {
      ...tableDefaults,
      startY: y + 4,
      head: [['Nombre', 'Moneda', 'Saldo', 'Rendimiento']],
      body: portfolioRows.map(r => [
        r.name,
        r.currency,
        `${r.currency === 'USD' ? 'U$S' : '$'} ${fmt(r.balance)}`,
        fmtPct(r.returnPct),
      ]),
      columnStyles: { 2: { halign: 'right', font: 'courier' }, 3: { halign: 'right', font: 'courier' } },
    })
  }

  // Monthly returns
  if (monthRows.length > 0) {
    const y = (doc as any).lastAutoTable.finalY + 12
    doc.setTextColor(200, 200, 205)
    doc.setFontSize(13)
    doc.text('Rendimientos mensuales (%)', 20, y)

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    autoTable(doc, {
      ...tableDefaults,
      startY: y + 4,
      styles: { fontSize: 8, cellPadding: 2 },
      head: [['Año', ...months, 'Total']],
      body: monthRows.map(r => [
        String(r.year),
        ...r.months.map(m => m !== null ? `${m > 0 ? '+' : ''}${m.toFixed(1)}` : '—'),
        r.total !== null ? `${r.total > 0 ? '+' : ''}${r.total.toFixed(1)}` : '—',
      ]),
      columnStyles: Object.fromEntries(
        Array.from({ length: 14 }, (_, i) => [i, { halign: i === 0 ? 'left' : 'center' as any, font: i > 0 ? 'courier' : undefined }])
      ),
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

  doc.save(`MFI-Inversiones-${periodLabel.replace(/[^a-zA-Z0-9áéíóúñ\s]/g, '').trim().replace(/\s+/g, '-')}.pdf`)
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  portfolios: Portfolio[]
  logs: PortfolioLogWithPortfolio[]
}

export function InvestmentsClient({ portfolios: initialPortfolios, logs: initialLogs }: Props) {
  const supabase = createClient()
  const [portfolios, setPortfolios] = useState(initialPortfolios)
  const [logs, setLogs] = useState(initialLogs)
  const [period, setPeriod] = useState<InvestmentPeriod>('1M')
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Action panel state
  const [actionPanel, setActionPanel] = useState<'create' | 'update' | 'rescue' | null>(null)
  const [saving, setSaving] = useState(false)

  // Create portfolio state
  const [newName, setNewName] = useState('')
  const [newBalance, setNewBalance] = useState('')
  const [newCurrency, setNewCurrency] = useState<Currency>('USD')

  // Daily update state (keyed by portfolio id)
  const [updates, setUpdates] = useState<Record<string, { pct: string; final: string }>>({})

  // Rescue state
  const [rescuePortfolioId, setRescuePortfolioId] = useState<string | null>(null)
  const [rescueAmount, setRescueAmount] = useState('')

  // Edit / delete state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingPortfolio, setDeletingPortfolio] = useState<Portfolio | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const nameMap = useMemo(() => buildPortfolioNameMap(portfolios), [portfolios])
  const chartData = useMemo(() => buildChartData(logs, period), [logs, period])
  const holdings = useMemo(() => buildHoldings(portfolios, logs, period), [portfolios, logs, period])
  const monthlyReturns = useMemo(() => buildMonthlyReturns(logs), [logs])

  const totalValue = portfolios.reduce((sum, p) => sum + Number(p.balance), 0)
  const primaryCurrency = portfolios.length > 0
    ? portfolios.reduce((best, p) => Number(p.balance) > Number(best.balance) ? p : best).currency
    : 'USD'

  const displayChartData = useMemo(() => {
    if (!selectedPortfolio) return chartData
    return chartData.map(p => ({ ...p, total: p.byPortfolio[selectedPortfolio] ?? 0 }))
  }, [chartData, selectedPortfolio])

  const displayReturn = useMemo(() => calcPeriodReturn(displayChartData), [displayChartData])
  const isPositive = displayReturn.pct > 0
  const isNegative = displayReturn.pct < 0

  // Y-axis domain zoomed to actual value range — otherwise small daily
  // variations (< 1%) look flat against a default [0, max] domain.
  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (displayChartData.length < 2) return undefined
    const values = displayChartData.map(p => p.total).filter(v => Number.isFinite(v))
    if (values.length === 0) return undefined
    const min = Math.min(...values)
    const max = Math.max(...values)
    if (min === max) return undefined
    const pad = Math.max((max - min) * 0.2, max * 0.005)
    return [Math.max(0, min - pad), max + pad]
  }, [displayChartData])

  const heatmapYears = useMemo(() => {
    if (monthlyReturns.length === 0) return []
    const years = [...new Set(monthlyReturns.map(r => r.year))].sort()
    return years.map(year => ({
      year,
      months: Array.from({ length: 12 }, (_, i) => {
        const entry = monthlyReturns.find(r => r.year === year && r.month === i)
        return entry ? entry.returnPct : null
      }),
    }))
  }, [monthlyReturns])

  // ── Refresh data from Supabase ──
  async function refreshData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [pRes, lRes] = await Promise.all([
      supabase.from('portfolios').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('portfolio_logs').select('*, portfolio:portfolios(name, currency)').order('date', { ascending: true }),
    ])
    setPortfolios((pRes.data ?? []) as Portfolio[])
    setLogs((lRes.data ?? []) as PortfolioLogWithPortfolio[])
  }

  // ── Create portfolio ──
  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase.from('portfolios').insert({
      user_id: user.id,
      name: newName.trim(),
      currency: newCurrency,
      balance: parseMoneyInput(newBalance),
    })

    if (error) { toast.error('No se pudo crear. Intentá de nuevo.', { duration: 5000 }); setSaving(false); return }
    setNewName(''); setNewBalance(''); setNewCurrency('USD')
    setActionPanel(null)
    toast.success('Portfolio creado')
    await refreshData()
    setSaving(false)
  }

  // ── Daily update (Finalizar Día) ──
  function handleUpdateChange(id: string, field: 'pct' | 'final', value: string) {
    const port = portfolios.find(p => p.id === id)
    if (!port) return
    const currentBalance = Number(port.balance) || 0

    setUpdates(prev => {
      const current = prev[id] || { pct: '', final: '' }
      let newPct = current.pct, newFinal = current.final

      if (field === 'pct') {
        newPct = value
        newFinal = value && !isNaN(Number(value)) ? (currentBalance * (1 + Number(value) / 100)).toFixed(2) : ''
      } else {
        newFinal = value
        newPct = value && !isNaN(Number(value)) && currentBalance > 0 ? (((Number(value) / currentBalance) - 1) * 100).toFixed(2) : ''
      }
      return { ...prev, [id]: { pct: newPct, final: newFinal } }
    })
  }

  async function handleSaveUpdates() {
    setSaving(true)
    try {
      const logsToInsert = []
      for (const p of portfolios) {
        const update = updates[p.id]
        if (!update || !update.final || isNaN(Number(update.final))) continue
        const newBal = Number(update.final)
        const oldBal = Number(p.balance)
        const pct = update.pct ? Number(update.pct) : (((newBal / oldBal) - 1) * 100)
        logsToInsert.push({ portfolio_id: p.id, date: todayISO(), percentage_change: pct, absolute_change: newBal - oldBal, new_balance: newBal, type: 'yield' as const })
      }
      if (logsToInsert.length > 0) {
        await supabase.from('portfolio_logs').insert(logsToInsert)
        for (const log of logsToInsert) {
          await supabase.from('portfolios').update({ balance: log.new_balance }).eq('id', log.portfolio_id)
        }
      }
      setUpdates({})
      setActionPanel(null)
      toast.success('Variación registrada')
      await refreshData()
    } catch (e) { console.error(e); toast.error('No se pudo registrar. Intentá de nuevo.', { duration: 5000 }) }
    finally { setSaving(false) }
  }

  // ── Rescue ──
  async function handleRescue() {
    if (!rescuePortfolioId) return
    const port = portfolios.find(p => p.id === rescuePortfolioId)
    if (!port) return
    const amount = parseMoneyInput(rescueAmount)
    if (!amount || amount <= 0 || amount > Number(port.balance)) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const oldBalance = Number(port.balance)
      const newBalance = oldBalance - amount
      const pct = oldBalance > 0 ? ((newBalance / oldBalance) - 1) * 100 : 0

      await supabase.from('portfolio_logs').insert({
        portfolio_id: port.id, date: todayISO(),
        percentage_change: pct, absolute_change: -amount, new_balance: newBalance,
        type: 'rescue' as const,
      })
      await supabase.from('portfolios').update({ balance: newBalance }).eq('id', port.id)

      setRescuePortfolioId(null); setRescueAmount('')
      setActionPanel(null)
      toast.success('Rescate registrado')
      await refreshData()
    } catch (e) { console.error(e); toast.error('No se pudo registrar. Intentá de nuevo.', { duration: 5000 }) }
    finally { setSaving(false) }
  }

  function closePanel() {
    setActionPanel(null)
    setUpdates({})
    setRescuePortfolioId(null); setRescueAmount('')
    setNewName(''); setNewBalance(''); setNewCurrency('USD')
  }

  // ── Edit portfolio (rename) ──
  function startEditing(p: Portfolio) {
    setEditingId(p.id)
    setEditingName(p.name)
  }

  async function handleSaveRename() {
    if (!editingId) return
    const name = editingName.trim()
    if (!name) return
    const { error } = await supabase.from('portfolios').update({ name }).eq('id', editingId)
    if (error) {
      toast.error('No se pudo actualizar. Intentá de nuevo.', { duration: 5000 })
      return
    }
    setEditingId(null)
    setEditingName('')
    toast.success('Portfolio actualizado')
    await refreshData()
  }

  // ── Delete portfolio (cascade logs) ──
  async function handleDeletePortfolio() {
    if (!deletingPortfolio) return
    setDeletingBusy(true)
    try {
      // Borro logs primero — el schema de portfolio_logs no garantiza ON DELETE
      // CASCADE desde portfolios, así que lo hacemos explícito y RLS filtra por user.
      await supabase.from('portfolio_logs').delete().eq('portfolio_id', deletingPortfolio.id)
      const { error } = await supabase.from('portfolios').delete().eq('id', deletingPortfolio.id)
      if (error) {
        toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 })
        return
      }
      toast.success('Portfolio eliminado')
      if (selectedPortfolio === deletingPortfolio.id) setSelectedPortfolio(null)
      setDeletingPortfolio(null)
      await refreshData()
    } finally {
      setDeletingBusy(false)
    }
  }

  // ── PDF download (uses active period) ──
  const PERIOD_LABELS: Record<InvestmentPeriod, string> = {
    '1W': 'Última semana',
    '1M': 'Último mes',
    '3M': 'Últimos 3 meses',
    '6M': 'Últimos 6 meses',
    'YTD': `YTD ${new Date().getFullYear()}`,
    '1Y': 'Último año',
    'MAX': 'Historial completo',
  }

  function handleDownloadPDF() {
    const label = PERIOD_LABELS[period]

    const portfolioRows = holdings.map(h => ({
      name: h.name,
      currency: h.currency,
      balance: h.currentBalance,
      returnPct: h.periodReturnPct,
    }))

    const monthRows = heatmapYears.map(({ year, months }) => {
      const valid = months.filter(m => m !== null) as number[]
      const total = valid.length > 0 ? (valid.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100 : null
      return { year, months, total }
    })

    generateInvestmentsPDF(
      label,
      totalValue,
      primaryCurrency,
      displayReturn.absolute,
      displayReturn.pct,
      portfolioRows,
      period === '1W' || period === '1M' ? [] : monthRows,
    )
  }

  // ─── Empty state ───
  if (portfolios.length === 0 && actionPanel !== 'create') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-violet-500" />
        </div>
        <div className="text-center">
          <h2 className="text-[18px] font-bold mb-1">Sin inversiones</h2>
          <p className="text-[13px] text-muted-foreground max-w-sm mb-4">
            Creá tu primer portfolio para empezar a trackear tus inversiones.
          </p>
          <Button onClick={() => setActionPanel('create')} className="h-9 rounded-xl text-[12px] px-6">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Crear Portfolio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-24 md:pb-6">

      {/* ── Header: Title + Actions + Period Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight">Inversiones</h1>
            {/* Action buttons with tooltips */}
            <div className="flex gap-1">
              <TooltipProvider delayDuration={200}>
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => actionPanel === 'create' ? closePanel() : (closePanel(), setActionPanel('create'))}
                      className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-150', actionPanel === 'create' ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">Crear un nuevo portfolio</TooltipContent>
                </UiTooltip>
              </TooltipProvider>
              {portfolios.length > 0 && (
                <>
                  <TooltipProvider delayDuration={200}>
                    <UiTooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => actionPanel === 'update' ? closePanel() : (closePanel(), setActionPanel('update'))}
                          className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-150', actionPanel === 'update' ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px]">Cargar la variación % del día</TooltipContent>
                    </UiTooltip>
                  </TooltipProvider>
                  <TooltipProvider delayDuration={200}>
                    <UiTooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => actionPanel === 'rescue' ? closePanel() : (closePanel(), setActionPanel('rescue'))}
                          className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-150', actionPanel === 'rescue' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px]">Rescatar dinero de un portfolio</TooltipContent>
                    </UiTooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          </div>

          {/* Hero KPI */}
          <div className="flex items-baseline gap-3">
            <span className="text-[32px] font-bold font-mono tabular-nums tracking-tight">
              {formatMoney(selectedPortfolio
                ? (holdings.find(h => h.id === selectedPortfolio)?.currentBalance ?? 0)
                : totalValue, primaryCurrency)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[15px] font-mono font-semibold tabular-nums',
              isPositive && 'text-emerald-400',
              isNegative && 'text-rose-400',
              !isPositive && !isNegative && 'text-muted-foreground',
            )}>
              {isPositive ? '+' : ''}{formatMoney(displayReturn.absolute, primaryCurrency)}
            </span>
            <span className={cn(
              'text-[13px] font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded-md',
              isPositive && 'text-emerald-400 bg-emerald-500/10',
              isNegative && 'text-rose-400 bg-rose-500/10',
              !isPositive && !isNegative && 'text-muted-foreground bg-muted',
            )}>
              {formatPct(displayReturn.pct)}
            </span>
            {selectedPortfolio && (
              <button
                onClick={() => setSelectedPortfolio(null)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Ver todos
              </button>
            )}
          </div>

          {selectedPortfolio && (
            <p className="text-[12px] text-muted-foreground">{nameMap[selectedPortfolio]}</p>
          )}
        </div>

        {/* Period selector chips + PDF */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
            {PERIOD_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150',
                  period === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* PDF download — tied to active period */}
          <TooltipProvider delayDuration={200}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{PERIOD_OPTIONS.find(o => o.key === period)?.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Descargar PDF — {PERIOD_LABELS[period]}
              </TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Action Modal ── */}
      {actionPanel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) closePanel() }}>
          <div className="w-full max-w-md bg-card border border-border/60 shadow-2xl shadow-primary/5 rounded-[2rem] p-6 relative">
            <button onClick={closePanel} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>

          {/* Create */}
          {actionPanel === 'create' && (
            <div className="max-w-md space-y-4">
              <h3 className="text-[14px] font-semibold">Nuevo Portfolio</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Nombre del Broker / Fondo</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej. Balanz, Binance..." className="h-10 text-[13px] rounded-xl bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Moneda</Label>
                  <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
                    {(['ARS', 'USD'] as const).map(cur => (
                      <button key={cur} type="button" onClick={() => setNewCurrency(cur)}
                        className={cn('flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150', newCurrency === cur ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                        {cur === 'ARS' ? '$ ARS' : 'U$S USD'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Saldo Inicial ({newCurrency === 'USD' ? 'U$S' : '$'})</Label>
                  <MoneyInput value={newBalance} onChange={setNewBalance} placeholder="0,00" className="h-10 text-[13px] rounded-xl bg-background font-mono tabular-nums" />
                </div>
                <Button onClick={handleCreate} disabled={saving || !newName} className="h-9 rounded-xl text-[12px] px-8">
                  {saving ? 'Guardando…' : 'Crear Portfolio'}
                </Button>
              </div>
            </div>
          )}

          {/* Daily update */}
          {actionPanel === 'update' && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-semibold">Cargar variación del día</h3>
              <div className="space-y-3">
                {portfolios.map(p => {
                  const update = updates[p.id] || { pct: '', final: '' }
                  const pctNum = update.pct ? Number(update.pct) : null
                  const isPctPositive = pctNum !== null && pctNum > 0
                  const isPctNegative = pctNum !== null && pctNum < 0
                  return (
                    <div key={p.id} className="bg-muted/20 border border-border/50 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[13px] font-semibold">{p.name}</span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {formatMoney(Number(p.balance), p.currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-semibold pointer-events-none">%</span>
                          <Input type="number" value={update.pct} onChange={e => handleUpdateChange(p.id, 'pct', e.target.value)} placeholder="Variación"
                            className={cn('h-10 rounded-xl bg-background text-[13px] font-mono font-semibold pr-6 transition-colors', isPctPositive && 'text-emerald-400', isPctNegative && 'text-rose-400')} />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        <div className="relative flex-[1.5]">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-semibold pointer-events-none">
                            {p.currency === 'USD' ? 'U$S' : '$'}
                          </span>
                          <Input type="number" value={update.final} onChange={e => handleUpdateChange(p.id, 'final', e.target.value)} placeholder="Saldo de Hoy"
                            className={cn('h-10 rounded-xl bg-background text-[13px] font-mono font-semibold transition-colors', p.currency === 'USD' ? 'pl-11' : 'pl-8')} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Button onClick={handleSaveUpdates} disabled={saving || Object.values(updates).every(u => !u.final)} className="h-10 rounded-xl px-8 text-[13px] font-semibold">
                {saving ? 'Guardando…' : 'Finalizar Día'}
              </Button>
            </div>
          )}

          {/* Rescue */}
          {actionPanel === 'rescue' && (
            <div className="max-w-md space-y-4">
              <h3 className="text-[14px] font-semibold">Rescatar inversión</h3>
              {!rescuePortfolioId ? (
                <div className="space-y-1">
                  <p className="text-[12px] text-muted-foreground mb-2">Seleccioná el portfolio:</p>
                  {portfolios.map((p, i) => (
                    <button key={p.id} onClick={() => setRescuePortfolioId(p.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length] + '18' }}>
                        <Briefcase className="w-3.5 h-3.5" style={{ color: PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{p.currency}</span>
                      </div>
                      <span className="text-[12px] font-mono text-muted-foreground">{formatMoney(Number(p.balance), p.currency)}</span>
                    </button>
                  ))}
                </div>
              ) : (() => {
                const port = portfolios.find(p => p.id === rescuePortfolioId)!
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-semibold">{port.name}</span>
                      <span className="text-muted-foreground">— Saldo: {formatMoney(Number(port.balance), port.currency)}</span>
                      <button onClick={() => setRescuePortfolioId(null)} className="text-muted-foreground hover:text-foreground ml-auto text-[11px] underline">Cambiar</button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Monto a rescatar ({port.currency === 'USD' ? 'U$S' : '$'})</Label>
                      <MoneyInput value={rescueAmount} onChange={setRescueAmount} placeholder="0,00" className="h-10 text-[13px] rounded-xl bg-background font-mono tabular-nums" />
                      {rescueAmount && parseMoneyInput(rescueAmount) > Number(port.balance) && (
                        <p className="text-[11px] text-rose-400">No podés rescatar más del saldo actual.</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">Se reduce el saldo del portfolio.</p>
                    </div>
                    <Button onClick={handleRescue} disabled={saving || !rescueAmount || parseMoneyInput(rescueAmount) <= 0 || parseMoneyInput(rescueAmount) > Number(port.balance)} className="h-9 rounded-xl text-[12px] px-8">
                      {saving ? 'Rescatando…' : 'Confirmar rescate'}
                    </Button>
                  </div>
                )
              })()}
            </div>
          )}
          </div>
        </div>
      )}

      {/* ── Evolution Chart + Market Card ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
      <div className="bg-card border border-border/50 rounded-2xl p-5">
        <SectionTitle title="Evolución" tooltip="Valor total de tus portfolios en el tiempo. Basado en los saldos diarios que cargás." />

        {displayChartData.length < 2 ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">
              Cargá variaciones diarias para ver la evolución de tu portfolio.
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Necesitás al menos 2 registros para mostrar el gráfico.
            </p>
          </div>
        ) : mounted && (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={displayChartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isNegative ? '#ef4444' : '#a855f7'} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={isNegative ? '#ef4444' : '#a855f7'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="date" tickFormatter={(d) => formatDateLabel(d, period)} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={40} className="text-muted-foreground" />
              <YAxis tick={AXIS_TICK} tickFormatter={formatCompact} tickLine={false} axisLine={false} width={56} className="text-muted-foreground" domain={yDomain ?? ['auto', 'auto']} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(d) => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                formatter={(value: number, _name: string, entry: any) => {
                  const idx = displayChartData.indexOf(entry.payload)
                  const prev = idx > 0 ? displayChartData[idx - 1].total : value
                  const diffPct = prev > 0 ? ((value / prev) - 1) * 100 : 0
                  return [`${formatMoney(value, primaryCurrency)} (${formatPct(diffPct)})`, 'Valor']
                }}
              />
              <Area type="monotone" dataKey="total" stroke={isNegative ? '#ef4444' : '#a855f7'} strokeWidth={2} fill="url(#chartGradient)" dot={displayChartData.length <= 10} activeDot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--card))' }} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Market Card sidebar */}
      <div className="xl:sticky xl:top-5 self-start">
        <MarketCard defaultExpanded chartHeight={48} />
      </div>
      </div>

      {/* ── Holdings + Allocation ── */}
      <div className={cn('grid gap-6', portfolios.length >= 2 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
        <div className={cn('bg-card border border-border/50 rounded-2xl p-5', portfolios.length >= 2 ? 'lg:col-span-2' : '')}>
          <SectionTitle title="Tus portfolios" tooltip="Portfolios activos con rendimiento del período seleccionado." />
          <div className="mt-4 space-y-1">
            {holdings.map((h, i) => {
              const isSelected = selectedPortfolio === h.id
              const color = PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length]
              const isPos = h.periodReturnPct > 0
              const isNeg = h.periodReturnPct < 0
              const isEditing = editingId === h.id
              const portfolio = portfolios.find(p => p.id === h.id)

              if (isEditing) {
                return (
                  <div key={h.id} className="flex items-center gap-2 px-3 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18' }}>
                      <Briefcase className="w-4 h-4" style={{ color }} />
                    </div>
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename()
                        if (e.key === 'Escape') { setEditingId(null); setEditingName('') }
                      }}
                      className="flex-1 h-8 text-[13px] rounded-lg"
                      placeholder="Nombre del portfolio"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveRename}
                      disabled={!editingName.trim()}
                      className="h-8 px-2.5 rounded-lg text-[12px] gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingId(null); setEditingName('') }}
                      className="h-8 px-2 rounded-lg text-[12px]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )
              }

              return (
                <div key={h.id} className={cn('group relative flex items-center rounded-xl transition-all duration-150 border', isSelected ? 'bg-violet-500/10 border-violet-500/20' : 'hover:bg-muted/40 border-transparent')}>
                  <button
                    onClick={() => setSelectedPortfolio(isSelected ? null : h.id)}
                    className="flex-1 min-w-0 flex items-center gap-3 px-3 py-3 text-left"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18' }}>
                      <Briefcase className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold truncate">{h.name}</span>
                        <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted shrink-0">{h.currency}</span>
                      </div>
                      {portfolios.length >= 2 && <span className="text-[11px] text-muted-foreground">{h.weight.toFixed(1)}% del total</span>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-mono font-semibold tabular-nums">{formatMoney(h.currentBalance, h.currency)}</p>
                      <p className={cn('text-[11px] font-mono tabular-nums', isPos && 'text-emerald-400', isNeg && 'text-rose-400', !isPos && !isNeg && 'text-muted-foreground')}>
                        {formatPct(h.periodReturnPct)}
                      </p>
                    </div>
                  </button>
                  <div className="pr-2 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                          aria-label="Más opciones"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => portfolio && startEditing(portfolio)}>
                          <Pencil className="w-3.5 h-3.5" />
                          Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => portfolio && setDeletingPortfolio(portfolio)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {portfolios.length >= 2 && mounted && (
          <div className="bg-card border border-border/50 rounded-2xl p-5">
            <SectionTitle title="Composición" tooltip="Distribución de tus inversiones por portfolio." />
            <div className="mt-2 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={holdings.map((h, i) => ({ name: h.name, value: h.currentBalance, fill: PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length] }))}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))" animationDuration={600}>
                    {holdings.map((_, i) => <Cell key={i} fill={PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [formatMoney(value, primaryCurrency), name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1.5 mt-2">
                {holdings.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-2 text-[11px]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length] }} />
                    <span className="text-muted-foreground truncate flex-1">{h.name}</span>
                    <span className="font-mono tabular-nums text-foreground font-medium">{h.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Monthly Returns Heatmap ── */}
      {heatmapYears.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-5">
          <SectionTitle title="Rendimientos mensuales" tooltip="Rendimiento % de cada mes calculado del primer al último registro del mes." />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  <th className="text-left text-muted-foreground font-medium pb-2 pr-2 w-12">Año</th>
                  {MONTH_LABELS.map(m => <th key={m} className="text-center text-muted-foreground font-medium pb-2 px-1 min-w-[44px]">{m}</th>)}
                  <th className="text-center text-muted-foreground font-medium pb-2 px-1 min-w-[52px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {heatmapYears.map(({ year, months }) => {
                  const annualMonths = months.filter(m => m !== null) as number[]
                  const annualReturn = annualMonths.length > 0 ? (annualMonths.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100 : null
                  return (
                    <tr key={year}>
                      <td className="font-semibold text-foreground py-1 pr-2">{year}</td>
                      {months.map((ret, mi) => (
                        <td key={mi} className="p-0.5">
                          <TooltipProvider delayDuration={100}>
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <div className={cn('rounded-lg py-1.5 text-center font-mono font-semibold tabular-nums transition-colors',
                                  ret === null && 'bg-muted/30 text-muted-foreground/30',
                                  ret !== null && ret > 0 && 'text-emerald-300',
                                  ret !== null && ret < 0 && 'text-rose-300',
                                  ret !== null && ret === 0 && 'text-muted-foreground bg-muted/30')}
                                  style={ret !== null ? { backgroundColor: ret > 0 ? `rgba(16, 185, 129, ${Math.min(Math.abs(ret) / 15, 0.35)})` : ret < 0 ? `rgba(239, 68, 68, ${Math.min(Math.abs(ret) / 15, 0.35)})` : undefined } : undefined}>
                                  {ret !== null ? `${ret > 0 ? '+' : ''}${ret.toFixed(1)}` : '—'}
                                </div>
                              </TooltipTrigger>
                              {ret !== null && <TooltipContent className="text-[11px]">{MONTH_LABELS[mi]} {year}: {formatPct(ret)}</TooltipContent>}
                            </UiTooltip>
                          </TooltipProvider>
                        </td>
                      ))}
                      <td className="p-0.5">
                        <div className={cn('rounded-lg py-1.5 text-center font-mono font-bold tabular-nums',
                          annualReturn === null && 'text-muted-foreground/30',
                          annualReturn !== null && annualReturn > 0 && 'text-emerald-400',
                          annualReturn !== null && annualReturn < 0 && 'text-rose-400',
                          annualReturn !== null && annualReturn === 0 && 'text-muted-foreground')}>
                          {annualReturn !== null ? `${annualReturn > 0 ? '+' : ''}${annualReturn.toFixed(1)}` : '—'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deletingPortfolio} onOpenChange={(o) => !o && !deletingBusy && setDeletingPortfolio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar &quot;{deletingPortfolio?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra el portfolio y todo su historial de rendimientos y rescates. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeletePortfolio() }}
              disabled={deletingBusy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deletingBusy ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
