'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/types'
import type { Transaction, Category, Profile, Currency, TransactionType } from '@/lib/types'

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  expense:    { label: 'Gasto',     color: 'text-rose-500',    bg: 'bg-rose-500/10',    dot: 'bg-rose-500'    },
  income:     { label: 'Ingreso',   color: 'text-emerald-500', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  savings:    { label: 'Ahorro',    color: 'text-sky-500',     bg: 'bg-sky-500/10',     dot: 'bg-sky-500'     },
  investment: { label: 'Inversión', color: 'text-violet-500',  bg: 'bg-violet-500/10',  dot: 'bg-violet-500'  },
} as const

const TYPE_ORDER: TransactionType[] = ['expense', 'income', 'savings', 'investment']

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(iso: string) {
  const parts = iso.split('-')
  return `${parts[2]}/${parts[1]}`
}

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[]
  categories: Category[]
  profile: Profile | null
  currentMonth: string
  userId: string
}

// ─── Editable Row ────────────────────────────────────────────────────────────

interface EditableRowProps {
  tx: Transaction | null
  categories: Category[]
  defaultCurrency: Currency
  onSave: (saved: Transaction) => void
  onCancel: () => void
  autoFocus?: boolean
}

function EditableRow({ tx, categories, defaultCurrency, onSave, onCancel, autoFocus }: EditableRowProps) {
  const supabase = createClient()
  const [type, setType] = useState<TransactionType>(tx?.type ?? 'expense')
  const [date, setDate] = useState(tx?.date ?? todayISO())
  const [note, setNote] = useState(tx?.note ?? '')
  const [categoryId, setCategoryId] = useState(tx?.category_id ?? '')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [curr, setCurr] = useState<Currency>(tx?.currency ?? defaultCurrency)
  const [saving, setSaving] = useState(false)

  const noteRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && noteRef.current) {
      noteRef.current.focus()
    }
  }, [autoFocus])

  const filteredCategories = categories.filter((c) => c.type === type)

  function cycleType() {
    const idx = TYPE_ORDER.indexOf(type)
    setType(TYPE_ORDER[(idx + 1) % TYPE_ORDER.length])
    setCategoryId('')
  }

  async function handleSave() {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) return
    setSaving(true)
    try {
      if (tx) {
        // Update existing
        const { data, error } = await supabase
          .from('transactions')
          .update({
            type,
            date,
            note: note.trim() || null,
            category_id: categoryId || null,
            amount: parsedAmount,
            currency: curr,
          })
          .eq('id', tx.id)
          .select('*, category:categories(*)')
          .single()
        if (!error && data) onSave(data as Transaction)
      } else {
        // Insert new
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type,
            date,
            note: note.trim() || null,
            category_id: categoryId || null,
            amount: parsedAmount,
            currency: curr,
            status: 'confirmed',
          })
          .select('*, category:categories(*)')
          .single()
        if (!error && data) onSave(data as Transaction)
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const cfg = TYPE_CFG[type]

  return (
    <div
      className="flex items-center px-4 py-2 border-b border-border/60 bg-primary/[0.03] border-l-2 border-l-primary gap-1"
      onKeyDown={handleKeyDown}
    >
      {/* Date */}
      <div className="w-[80px] shrink-0 pr-1">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent text-[12px] font-mono text-foreground border border-border/60 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      {/* Type — click to cycle */}
      <button
        type="button"
        onClick={cycleType}
        className={cn(
          'w-[90px] shrink-0 flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12px] font-medium transition-colors hover:bg-muted/50',
          cfg.color,
        )}
        title="Clic para cambiar tipo"
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
        {cfg.label}
      </button>

      {/* Note / description */}
      <div className="flex-1 pr-1">
        <input
          ref={noteRef}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Descripción…"
          className="w-full bg-transparent text-[13px] text-foreground border border-border/60 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Category */}
      <div className="w-[120px] shrink-0 hidden md:block pr-1">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full bg-transparent text-[12px] text-muted-foreground border border-border/60 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="">Sin categoría</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div className="w-[120px] shrink-0 pr-1">
        <input
          ref={amountRef}
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent text-[13px] font-mono font-semibold text-right text-foreground border border-border/60 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40 tabular-nums"
        />
      </div>

      {/* Currency toggle */}
      <div className="w-[60px] shrink-0 flex justify-center">
        <button
          type="button"
          onClick={() => setCurr((c) => (c === 'ARS' ? 'USD' : 'ARS'))}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-md hover:bg-muted transition-colors"
        >
          {curr}
        </button>
      </div>

      {/* Actions */}
      <div className="w-[56px] shrink-0 flex items-center gap-1 justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !amount}
          className="text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-40 px-1.5 py-0.5 rounded-md hover:bg-primary/10 transition-colors"
        >
          {saving ? '…' : '✓'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Month Navigator ─────────────────────────────────────────────────────────

function MonthNavigator({ currentMonth }: { currentMonth: string }) {
  const router = useRouter()
  const { label, isCurrentMonth } = formatMonthLabel(currentMonth)
  const now = new Date()
  const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isNow = currentMonth === nowYM

  function go(delta: number) {
    router.push(`/mfi?month=${navigateMonth(currentMonth, delta)}`)
  }

  return (
    <div className="flex items-center gap-0 bg-muted rounded-xl overflow-hidden border border-border h-8">
      <button
        onClick={() => go(-1)}
        className="h-8 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/60 transition-colors"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onDoubleClick={() => router.push('/mfi')}
        className={cn(
          'h-8 px-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap',
          isNow ? 'text-primary' : 'text-foreground',
        )}
        title="Doble clic para volver al mes actual"
      >
        {isCurrentMonth ? 'Este mes' : label}
      </button>
      <button
        onClick={() => go(+1)}
        disabled={isNow}
        className="h-8 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/60 transition-colors disabled:opacity-25 disabled:pointer-events-none"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MFITransactionsClient({
  transactions: initialTransactions,
  categories,
  profile,
  currentMonth,
  userId,
}: Props) {
  const supabase = createClient()
  const [txs, setTxs] = useState<Transaction[]>(initialTransactions)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [search, setSearch] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  const defaultCurrency: Currency = (profile?.default_currency as Currency) ?? 'ARS'

  // Sync with new server data on month change
  useEffect(() => {
    setTxs(initialTransactions)
    setEditingId(null)
    setIsAddingNew(false)
    setFocusedIndex(null)
  }, [initialTransactions])

  // Reset focus when filtering changes
  useEffect(() => {
    setFocusedIndex(null)
  }, [typeFilter, search])

  // Filtered transactions
  const filtered = txs
    .filter((t) => typeFilter === 'all' || t.type === typeFilter)
    .filter(
      (t) =>
        !search ||
        t.note?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.name?.toLowerCase().includes(search.toLowerCase()),
    )

  // Keyboard navigation & shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (editingId || isAddingNew) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setFocusedIndex(-1)
        setIsAddingNew(true)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(prev => {
          if (prev === null) return 0
          if (prev >= filtered.length - 1) return -1 // -1 is "New Row"
          if (prev === -1) return -1
          return prev + 1
        })
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(prev => {
          if (prev === null) return -1
          if (prev === -1) return Math.max(0, filtered.length - 1)
          if (prev === 0) return 0
          return prev - 1
        })
      }

      if (e.key === 'Enter' && focusedIndex !== null) {
        e.preventDefault()
        if (focusedIndex === -1) {
          setIsAddingNew(true)
        } else if (focusedIndex >= 0 && focusedIndex < filtered.length) {
          setEditingId(filtered[focusedIndex].id)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingId, isAddingNew, filtered, focusedIndex])

  // Totals for footer
  const totals = txs.reduce(
    (acc, t) => {
      if (t.type === 'income') {
        if (t.currency === 'USD') acc.incomeUSD += t.amount
        else acc.incomeARS += t.amount
      }
      if (t.type === 'expense') {
        if (t.currency === 'USD') acc.expenseUSD += t.amount
        else acc.expenseARS += t.amount
      }
      return acc
    },
    { incomeARS: 0, incomeUSD: 0, expenseARS: 0, expenseUSD: 0 },
  )

  async function handleDelete(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setTxs((prev) => prev.filter((t) => t.id !== id))
    setEditingId(null)
  }

  function handleSaveEdit(saved: Transaction) {
    setTxs((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
    setEditingId(null)
  }

  function handleSaveNew(saved: Transaction) {
    setTxs((prev) => [saved, ...prev])
    setIsAddingNew(false)
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto">
      {/* ── Page header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[22px] font-bold tracking-tight">Transacciones</h1>
        <MonthNavigator currentMonth={currentMonth} />
      </div>

      {/* ── Filters bar & Shortcuts ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(
              [
                { key: 'all' as const, label: 'Todos' },
                { key: 'expense' as const, label: 'Gasto' },
                { key: 'income' as const, label: 'Ingreso' },
                { key: 'savings' as const, label: 'Ahorro' },
                { key: 'investment' as const, label: 'Inversión' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
                  typeFilter === key
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="h-8 pl-8 pr-3 rounded-xl border border-border bg-background text-[13px] w-[160px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/80">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Atajos:</span>
          <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">↑</kbd> <kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">↓</kbd> Navegar</div>
          <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">Enter</kbd> Editar / Guardar</div>
          <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">Esc</kbd> Cancelar</div>
          <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">N</kbd> Nueva fila</div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        {/* Header row */}
        <div className="flex items-center px-4 py-2.5 border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
          <span className="w-[80px] shrink-0">Fecha</span>
          <span className="w-[90px] shrink-0">Tipo</span>
          <span className="flex-1">Descripción</span>
          <span className="w-[120px] shrink-0 hidden md:block">Categoría</span>
          <span className="w-[120px] shrink-0 text-right">Monto</span>
          <span className="w-[60px] shrink-0 text-center">Moneda</span>
          <span className="w-[86px] shrink-0" />
        </div>

        {/* Transaction rows */}
        {filtered.length === 0 && !isAddingNew ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              {search || typeFilter !== 'all' ? 'Sin resultados' : 'Sin transacciones'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {search || typeFilter !== 'all'
                ? 'Probá con otro filtro o búsqueda.'
                : 'Presioná N o hacé clic en "+ Nueva fila" para empezar.'}
            </p>
          </div>
        ) : (
          filtered.map((tx, index) =>
            editingId === tx.id ? (
              <EditableRow
                key={tx.id}
                tx={tx}
                categories={categories}
                defaultCurrency={defaultCurrency}
                onSave={handleSaveEdit}
                onCancel={() => setEditingId(null)}
                autoFocus
              />
            ) : (
              <div
                key={tx.id}
                onClick={() => {
                  if (deletingId) setDeletingId(null)
                  setEditingId(tx.id)
                  setIsAddingNew(false)
                  setFocusedIndex(index)
                }}
                className={cn(
                  'flex items-center px-4 py-2.5 border-b border-border/60 last:border-0 cursor-pointer group transition-all text-[13px]',
                  deletingId === tx.id 
                    ? 'bg-rose-500/10 !border-rose-500/30' 
                    : focusedIndex === index 
                      ? 'bg-primary/5 ring-1 ring-inset ring-primary/40 rounded-[1px]' 
                      : 'hover:bg-muted/30'
                )}
              >
                {/* Date */}
                <span className="w-[80px] shrink-0 text-muted-foreground font-mono text-[12px]">
                  {formatShortDate(tx.date)}
                </span>

                {/* Type */}
                <span className={cn('w-[90px] shrink-0 flex items-center gap-1.5', TYPE_CFG[tx.type].color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', TYPE_CFG[tx.type].dot)} />
                  <span className="text-[12px] font-medium">{TYPE_CFG[tx.type].label}</span>
                </span>

                {/* Note */}
                <span className="flex-1 text-foreground truncate">{tx.note ?? '—'}</span>

                {/* Category */}
                <span className="w-[120px] shrink-0 hidden md:block text-muted-foreground/70 text-[12px] truncate">
                  {tx.category?.name ?? '—'}
                </span>

                {/* Amount */}
                <span
                  className={cn(
                    'w-[120px] shrink-0 text-right font-mono font-semibold tabular-nums',
                    TYPE_CFG[tx.type].color,
                  )}
                >
                  {tx.type === 'income' ? '+' : '−'}
                  {formatCurrency(tx.amount, tx.currency)}
                </span>

                {/* Currency */}
                <span className="w-[60px] shrink-0 text-center text-[11px] text-muted-foreground">{tx.currency}</span>

                {/* Delete */}
                <div className="w-[86px] shrink-0 flex justify-end">
                  {deletingId === tx.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(tx.id)
                        }}
                        className="bg-rose-500 text-white min-w-[50px] text-[10px] font-bold px-1.5 py-1 rounded shadow-sm hover:bg-rose-600 transition-colors"
                      >
                        Borrar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingId(null)
                        }}
                        className="text-muted-foreground hover:bg-muted p-1 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingId(tx.id)
                      }}
                      title="Eliminar fila"
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-all p-1 rounded-md hover:bg-rose-500/10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ),
          )
        )}

        {/* New row */}
        {isAddingNew ? (
          <EditableRow
            tx={null}
            categories={categories}
            defaultCurrency={defaultCurrency}
            onSave={handleSaveNew}
            onCancel={() => setIsAddingNew(false)}
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setEditingId(null)
              setIsAddingNew(true)
              setFocusedIndex(-1)
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-[13px] hover:text-primary transition-all duration-200 w-full text-left border-t border-dashed',
              focusedIndex === -1
                ? 'bg-primary/10 text-primary border-primary ring-1 ring-inset ring-primary/40 rounded-b-xl'
                : 'text-muted-foreground border-border/60 hover:bg-muted/30 hover:border-primary/50'
            )}
          >
            <div className={cn('p-1 rounded-md transition-colors', focusedIndex === -1 ? 'bg-primary/20' : 'bg-muted group-hover:bg-primary/10')}>
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold">Agregar nueva fila</span>
            <span className={cn(
              'ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors hidden sm:inline border',
              focusedIndex === -1 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-background text-muted-foreground border-border'
            )}>
              N
            </span>
          </button>
        )}
      </div>

      {/* ── Footer totals ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 text-[12px]">
        {totals.incomeARS > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Ingresos</span>
            <span className="font-mono font-semibold text-emerald-500 tabular-nums">
              +{formatCurrency(totals.incomeARS, 'ARS')}
            </span>
          </span>
        )}
        {totals.incomeUSD > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Ingresos USD</span>
            <span className="font-mono font-semibold text-emerald-500 tabular-nums">
              +{formatCurrency(totals.incomeUSD, 'USD')}
            </span>
          </span>
        )}
        {totals.expenseARS > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Gastos</span>
            <span className="font-mono font-semibold text-rose-500 tabular-nums">
              −{formatCurrency(totals.expenseARS, 'ARS')}
            </span>
          </span>
        )}
        {totals.expenseUSD > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Gastos USD</span>
            <span className="font-mono font-semibold text-rose-500 tabular-nums">
              −{formatCurrency(totals.expenseUSD, 'USD')}
            </span>
          </span>
        )}
        {(totals.incomeARS > 0 || totals.expenseARS > 0) && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Balance ARS</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCurrency(totals.incomeARS - totals.expenseARS, 'ARS')}
            </span>
          </span>
        )}
        {(totals.incomeUSD > 0 || totals.expenseUSD > 0) && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Balance USD</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCurrency(totals.incomeUSD - totals.expenseUSD, 'USD')}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
