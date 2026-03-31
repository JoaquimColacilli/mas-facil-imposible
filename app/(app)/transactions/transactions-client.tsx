'use client'

import { useState } from 'react'
import type { Transaction, TransactionType } from '@/lib/types'
import { formatCurrency, formatDate, TRANSACTION_TYPE_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  TrendingUp,
  Plus,
  Search,
  Pencil,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuickAddTransaction } from '@/components/quick-add-transaction'
import { EditTransactionModal } from '@/components/edit-transaction-modal'
import { CategoryManagerButton } from '@/components/category-manager'
import { createClient } from '@/lib/supabase/client'

interface TransactionsClientProps {
  transactions: Transaction[]
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

export function TransactionsClient({ transactions: initial }: TransactionsClientProps) {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  const filtered = transactions.filter((tx) => {
    const matchesType = filterType === 'all' || tx.type === filterType
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      tx.note?.toLowerCase().includes(q) ||
      tx.category?.name?.toLowerCase().includes(q) ||
      tx.amount.toString().includes(q)
    return matchesType && matchesSearch
  })

  const grouped: Record<string, Transaction[]> = {}
  for (const tx of filtered) {
    const key = tx.date
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(tx)
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  async function handleAddSuccess() {
    setShowAdd(false)
    const { fetchTransactions } = await import('./actions')
    const data = await fetchTransactions()
    setTransactions(data)
  }

  return (
    <div className="flex flex-col gap-5">
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

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nota, categoría o monto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl text-[13px]"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 h-9 rounded-xl text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Ingresos</SelectItem>
            <SelectItem value="expense">Gastos</SelectItem>
            <SelectItem value="savings">Ahorros</SelectItem>
            <SelectItem value="investment">Inversiones</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {sortedDates.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 flex flex-col items-center text-center gap-3 mt-2">
          <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground mb-1">
              {transactions.length === 0 ? 'Sin movimientos todavía' : 'Sin resultados'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {transactions.length === 0
                ? 'Agregá tu primer movimiento para empezar.'
                : 'Probá cambiando los filtros de búsqueda.'}
            </p>
          </div>
          {transactions.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}
              className="h-8 rounded-xl text-[13px] gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-150">
              <Plus className="w-3.5 h-3.5" /> Agregar movimiento
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
                  className="flex items-center gap-3.5 px-4 py-3.5 group transition-colors duration-150 hover:bg-muted/25"
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
