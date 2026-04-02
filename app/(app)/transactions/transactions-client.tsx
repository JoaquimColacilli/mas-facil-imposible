'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Transaction, TransactionType, Currency } from '@/lib/types'
import { formatCurrency, formatDate, TRANSACTION_TYPE_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  TrendingUp,
  Plus,
  Search,
  Pencil,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
  X,
  ChevronsLeft,
  ChevronsRight,
  CalendarSearch,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { QuickAddTransaction } from '@/components/quick-add-transaction'
import { EditTransactionModal } from '@/components/edit-transaction-modal'
import { CategoryManagerButton } from '@/components/category-manager'
import { createClient } from '@/lib/supabase/client'

interface TransactionsClientProps {
  transactions: Transaction[]
  month: string // YYYY-MM
  totalCount: number
}

const TYPE_CFG: Record<TransactionType, {
  icon: React.ElementType
  color: string
  bg: string
  badge: string
  sign: '+' | '−'
}> = {
  income:     { icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0', sign: '+' },
  expense:    { icon: ArrowUpRight,  color: 'text-rose-500',    bg: 'bg-rose-500/10',    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-0',           sign: '−' },
  savings:    { icon: PiggyBank,     color: 'text-sky-500',     bg: 'bg-sky-500/10',     badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-0',              sign: '−' },
  investment: { icon: TrendingUp,    color: 'text-violet-500',  bg: 'bg-violet-500/10',  badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-0',     sign: '−' },
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  confirmed: { label: 'Confirmado', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0' },
  pending:   { label: 'Pendiente',  class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0' },
  cancelled: { label: 'Cancelado',  class: 'bg-muted text-muted-foreground border-0' },
}

const PAGE_SIZE = 25

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function TransactionsClient({ transactions: initial, month, totalCount }: TransactionsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [transactions, setTransactions] = useState<Transaction[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCurrency, setFilterCurrency] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [filterDate, setFilterDate] = useState<string | null>(null) // YYYY-MM-DD

  const currentMonth = getCurrentMonth()
  const isPastMonth = month < currentMonth
  const isFutureMonth = month > currentMonth

  // Navigate months
  function goToMonth(m: string) {
    setPage(1)
    setSearch('')
    setFilterDate(null)
    const params = new URLSearchParams(searchParams.toString())
    if (m === currentMonth) {
      params.delete('month')
    } else {
      params.set('month', m)
    }
    router.push(`/transactions${params.toString() ? '?' + params.toString() : ''}`)
  }

  // Navigate to a specific date (jumps to that month + filters to that day)
  function goToDate(date: Date) {
    const m = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const day = `${m}-${String(date.getDate()).padStart(2, '0')}`
    setFilterDate(day)
    setPage(1)
    setCalendarOpen(false)

    if (m !== month) {
      const params = new URLSearchParams(searchParams.toString())
      if (m === currentMonth) {
        params.delete('month')
      } else {
        params.set('month', m)
      }
      router.push(`/transactions${params.toString() ? '?' + params.toString() : ''}`)
    }
  }

  // Filter
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false
      if (filterCurrency !== 'all' && tx.currency !== filterCurrency) return false
      if (filterStatus !== 'all' && tx.status !== filterStatus) return false
      if (filterPaymentMethod !== 'all' && (tx.payment_method ?? 'none') !== filterPaymentMethod) return false
      if (filterDate && tx.date !== filterDate) return false
      if (search) {
        const q = search.toLowerCase()
        const matches =
          tx.note?.toLowerCase().includes(q) ||
          tx.category?.name?.toLowerCase().includes(q) ||
          tx.amount.toString().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [transactions, filterType, filterCurrency, filterStatus, filterPaymentMethod, filterDate, search])

  // Summary stats
  const stats = useMemo(() => {
    const s = { income: { ARS: 0, USD: 0 }, expense: { ARS: 0, USD: 0 }, savings: { ARS: 0, USD: 0 }, investment: { ARS: 0, USD: 0 } }
    for (const tx of transactions) {
      if (tx.status === 'cancelled') continue
      s[tx.type][tx.currency] += tx.amount
    }
    return s
  }, [transactions])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginatedFiltered = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Group by date
  const grouped: Record<string, Transaction[]> = {}
  for (const tx of paginatedFiltered) {
    const key = tx.date
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(tx)
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Active filter count
  const activeFilters = [filterType, filterCurrency, filterStatus, filterPaymentMethod].filter(f => f !== 'all').length + (filterDate ? 1 : 0)

  function clearFilters() {
    setFilterType('all')
    setFilterCurrency('all')
    setFilterStatus('all')
    setFilterPaymentMethod('all')
    setFilterDate(null)
    setSearch('')
    setPage(1)
  }

  async function handleAddSuccess() {
    setShowAdd(false)
    const { fetchTransactionsForMonth } = await import('./actions')
    const data = await fetchTransactionsForMonth(month)
    setTransactions(data)
  }

  // Format stat
  function statLine(ars: number, usd: number) {
    const parts: string[] = []
    if (ars > 0) parts.push(formatCurrency(ars, 'ARS'))
    if (usd > 0) parts.push(formatCurrency(usd, 'USD'))
    return parts.length > 0 ? parts.join(' · ') : '—'
  }

  return (
    <div className={cn(
      'flex flex-col gap-5 transition-all duration-300',
      isPastMonth && 'relative',
    )}>
      {/* Past month indicator */}
      {isPastMonth && (
        <div className="sticky top-0 z-20 -mx-4 -mt-4 px-4 pt-3 pb-2.5 bg-amber-500/8 dark:bg-amber-500/5 border-b border-amber-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-[12px] font-medium text-amber-700 dark:text-amber-400">
            <CalendarDays className="w-3.5 h-3.5" />
            Estás viendo un mes anterior — {formatMonthLabel(month)}
            <button
              onClick={() => goToMonth(currentMonth)}
              className="ml-1 underline underline-offset-2 hover:no-underline font-semibold"
            >
              Volver al actual
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="font-serif text-[22px] md:text-[26px] font-semibold text-foreground leading-tight">
          Movimientos
        </h1>
        <div className="flex items-center gap-2">
          <CategoryManagerButton />
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-xl transition-all duration-150 hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>
      </div>

      {/* Month navigator + DatePicker */}
      <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
        <button
          onClick={() => goToMonth(shiftMonth(month, -1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToMonth(currentMonth)}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-xl text-[14px] font-semibold transition-all',
              month === currentMonth
                ? 'text-foreground'
                : 'text-foreground hover:bg-muted/50 cursor-pointer'
            )}
          >
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            {filterDate
              ? new Date(filterDate + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
              : formatMonthLabel(month)
            }
            {month !== currentMonth && !filterDate && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Histórico
              </span>
            )}
          </button>

          {/* Date filter badge */}
          {filterDate && (
            <button
              onClick={() => { setFilterDate(null); setPage(1) }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors"
            >
              Día específico
              <X className="w-3 h-3" />
            </button>
          )}

          {/* DatePicker popover */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150',
                  calendarOpen
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
                title="Ir a una fecha"
              >
                <CalendarSearch className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-2xl" align="center" sideOffset={8}>
              <div className="p-3 pb-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                  Ir a fecha
                </p>
              </div>
              <Calendar
                mode="single"
                selected={filterDate ? new Date(filterDate + 'T00:00:00') : undefined}
                onSelect={(date) => {
                  if (date) goToDate(date)
                }}
                defaultMonth={(() => {
                  const [y, m] = month.split('-').map(Number)
                  return new Date(y, m - 1, 1)
                })()}
                disabled={(date) => date > new Date()}
                captionLayout="dropdown"
                fromYear={2024}
                toYear={new Date().getFullYear()}
              />
              <div className="px-3 pb-3 flex gap-2">
                <button
                  onClick={() => { goToDate(new Date()) }}
                  className="flex-1 text-[11px] font-semibold text-center py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Hoy
                </button>
                {filterDate && (
                  <button
                    onClick={() => { setFilterDate(null); setPage(1); setCalendarOpen(false) }}
                    className="flex-1 text-[11px] font-semibold text-center py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Ver mes completo
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <button
          onClick={() => goToMonth(shiftMonth(month, 1))}
          disabled={isFutureMonth}
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
            isFutureMonth
              ? 'text-muted-foreground/30 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {([
          { type: 'income' as const, label: 'Ingresos', color: 'emerald' },
          { type: 'expense' as const, label: 'Gastos', color: 'rose' },
          { type: 'savings' as const, label: 'Ahorros', color: 'sky' },
          { type: 'investment' as const, label: 'Inversiones', color: 'violet' },
        ]).map(({ type, label, color }) => (
          <button
            key={type}
            onClick={() => {
              setFilterType(filterType === type ? 'all' : type)
              setPage(1)
            }}
            className={cn(
              'group relative bg-card border rounded-2xl p-3 text-left transition-all duration-150 hover:shadow-sm overflow-hidden',
              filterType === type
                ? `border-${color}-500/40 ring-1 ring-${color}-500/20`
                : 'border-border hover:border-border/80',
            )}
            style={filterType === type ? {
              borderColor: `var(--color-${color}-500, currentColor)`,
              boxShadow: `0 0 0 1px color-mix(in srgb, var(--color-${color}-500, currentColor) 20%, transparent)`,
            } : undefined}
          >
            <div className={cn(
              'absolute inset-0 opacity-[0.03] pointer-events-none',
              `bg-${color}-500`,
            )} />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-[13px] font-bold tabular-nums font-mono leading-tight">
              {statLine(stats[type].ARS, stats[type].USD)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {transactions.filter(t => t.type === type && t.status !== 'cancelled').length} mov.
            </p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nota, categoría o monto..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 h-9 rounded-xl text-[13px]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium mr-1">
            <Filter className="w-3 h-3" />
            Filtros
          </div>

          {/* Currency filter */}
          {(['all', 'ARS', 'USD'] as const).map(cur => (
            <button
              key={`cur-${cur}`}
              onClick={() => { setFilterCurrency(cur); setPage(1) }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-100',
                filterCurrency === cur
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {cur === 'all' ? 'Todas' : cur === 'ARS' ? '$ ARS' : 'U$S'}
            </button>
          ))}

          <span className="w-px h-4 bg-border mx-1" />

          {/* Status filter */}
          {([
            { value: 'all', label: 'Todos' },
            { value: 'confirmed', label: 'Confirmados' },
            { value: 'pending', label: 'Pendientes' },
            { value: 'cancelled', label: 'Cancelados' },
          ] as const).map(({ value, label }) => (
            <button
              key={`status-${value}`}
              onClick={() => { setFilterStatus(value); setPage(1) }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-100',
                filterStatus === value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}

          <span className="w-px h-4 bg-border mx-1" />

          {/* Payment method filter */}
          {([
            { value: 'all', label: 'Todos', icon: null },
            { value: 'cash', label: 'Efectivo', icon: Banknote },
            { value: 'debit', label: 'Débito', icon: Smartphone },
            { value: 'credit', label: 'Crédito', icon: CreditCard },
          ] as const).map(({ value, label, icon: PMIcon }) => (
            <button
              key={`pm-${value}`}
              onClick={() => { setFilterPaymentMethod(value); setPage(1) }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-100 flex items-center gap-1',
                filterPaymentMethod === value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {PMIcon && <PMIcon className="w-3 h-3" />}
              {label}
            </button>
          ))}

          {activeFilters > 0 && (
            <>
              <span className="w-px h-4 bg-border mx-1" />
              <button
                onClick={clearFilters}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-muted-foreground">
          {filtered.length === transactions.length
            ? <>{transactions.length} movimiento{transactions.length !== 1 ? 's' : ''}</>
            : <>{filtered.length} de {transactions.length} movimiento{transactions.length !== 1 ? 's' : ''}</>
          }
        </p>
        {totalPages > 1 && (
          <p className="text-[11px] text-muted-foreground">
            Página {page} de {totalPages}
          </p>
        )}
      </div>

      {/* Empty state */}
      {sortedDates.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 flex flex-col items-center text-center gap-3 mt-2">
          <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground mb-1">
              {transactions.length === 0
                ? (isPastMonth ? 'Sin movimientos en este mes' : 'Sin movimientos todavía')
                : 'Sin resultados'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {transactions.length === 0
                ? (isPastMonth ? 'No se registraron movimientos en ' + formatMonthLabel(month) + '.' : 'Agregá tu primer movimiento para empezar.')
                : 'Probá cambiando los filtros de búsqueda.'}
            </p>
          </div>
          {transactions.length === 0 && !isPastMonth && (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}
              className="h-8 rounded-xl text-[13px] gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-150">
              <Plus className="w-3.5 h-3.5" /> Agregar movimiento
            </Button>
          )}
          {transactions.length > 0 && filtered.length === 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters}
              className="h-8 rounded-xl text-[13px] gap-1.5 transition-all duration-150">
              <X className="w-3.5 h-3.5" /> Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {/* Grouped list */}
      {sortedDates.map((date) => (
        <div key={date} className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] px-1">
            {formatDate(date)}
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {grouped[date].map((tx) => {
              const cfg = TYPE_CFG[tx.type]
              const Icon = cfg.icon
              const statusCfg = STATUS_LABELS[tx.status] ?? STATUS_LABELS.confirmed
              const displayName = tx.note ?? tx.category?.name ?? TRANSACTION_TYPE_LABELS[tx.type]

              return (
                <div
                  key={tx.id}
                  className={cn(
                    'flex items-center gap-3.5 px-4 py-3.5 group transition-colors duration-150 hover:bg-muted/25',
                    tx.status === 'cancelled' && 'opacity-50',
                  )}
                >
                  {/* Type icon */}
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-110',
                    cfg.bg,
                  )}>
                    <Icon className={cn('w-4 h-4', cfg.color)} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="text-[13.5px] font-semibold text-foreground truncate leading-snug">
                        {displayName}
                      </p>
                      <Badge className={cn('text-[10px] h-4 px-1.5 font-semibold', cfg.badge)}>
                        {TRANSACTION_TYPE_LABELS[tx.type]}
                      </Badge>
                      {tx.status !== 'confirmed' && (
                        <Badge className={cn('text-[10px] h-4 px-1.5 font-semibold', statusCfg.class)}>
                          {statusCfg.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {tx.category && tx.note && (
                        <span className="text-[11px] text-muted-foreground">{tx.category.name}</span>
                      )}
                      {tx.category && tx.note && (
                        <span className="text-[11px] text-muted-foreground">·</span>
                      )}
                      <span className="text-[11px] text-muted-foreground">{tx.currency}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(tx.date)}</span>
                      {tx.payment_method === 'credit' && (
                        <>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <CreditCard className="w-3 h-3 text-amber-500" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount + edit */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'text-[14px] font-bold tabular-nums font-mono',
                      tx.type === 'income'  ? 'text-emerald-500 dark:text-emerald-400' :
                      tx.type === 'expense' ? 'text-rose-500 dark:text-rose-400' :
                      'text-foreground',
                    )}>
                      {cfg.sign}{formatCurrency(tx.amount, tx.currency)}
                    </span>
                    <button
                      onClick={() => setEditingTx(tx)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-2">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
              page === 1 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
              page === 1 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
              if (i > 0 && arr[i - 1] !== p - 1) acc.push('ellipsis')
              acc.push(p)
              return acc
            }, [])
            .map((item, i) =>
              item === 'ellipsis' ? (
                <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-[12px] text-muted-foreground">
                  ···
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-semibold transition-all duration-100',
                    page === item
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
              page === totalPages ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
              page === totalPages ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showAdd && (
        <QuickAddTransaction onClose={() => setShowAdd(false)} onSuccess={handleAddSuccess} />
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
    </div>
  )
}
