'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, Category, Currency, TransactionType } from '@/lib/types'
import { formatCurrency, formatDate, TRANSACTION_TYPE_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput, parseMoneyInput, formatMoneyInput } from '@/components/money-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X, Plus, ArrowDownLeft, Pencil, Trash2,
  ChevronDown, Search, Check, TrendingUp,
} from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface IncomesModalProps {
  transactions: Transaction[]
  currency: Currency
  currentMonth: string // "YYYY-MM"
  onClose: () => void
  onChanged: (updated: Transaction[]) => void
}

// ─── Mini form to add/edit an income ─────────────────────────────────────────

const CATEGORY_COLORS = [
  '#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899',
  '#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6',
]

function CategoryCombobox({
  categories, value, onChange, onCreated,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  onCreated: (cat: Category) => void
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const incomeCategories = categories.filter((c) => c.type === 'income')
  const filtered = incomeCategories.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  )
  const selected = categories.find((c) => c.id === value)

  async function handleCreate() {
    if (!query.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }
    const color = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]
    const { data } = await supabase.from('categories').insert({
      user_id: user.id, name: query.trim(), type: 'income',
      icon: 'trending-up', color,
    }).select().single()
    if (data) { onCreated(data as Category); onChange(data.id); setOpen(false); setQuery('') }
    setCreating(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-9 px-3 rounded-xl border border-border bg-muted/50 text-[13px] hover:bg-muted transition-colors"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: selected.color }} />
            {selected.name}
          </span>
        ) : (
          <span className="text-muted-foreground">Sin categoría</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar o crear…"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setQuery('') }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-[13px] hover:bg-muted transition-colors flex items-center gap-2',
                !value && 'bg-muted',
              )}
            >
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              Sin categoría
              {!value && <Check className="w-3 h-3 ml-auto text-emerald-500" />}
            </button>
            {filtered.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { onChange(cat.id); setOpen(false); setQuery('') }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-[13px] hover:bg-muted transition-colors flex items-center gap-2',
                  value === cat.id && 'bg-muted',
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                {cat.name}
                {value === cat.id && <Check className="w-3 h-3 ml-auto text-emerald-500" />}
              </button>
            ))}
            {query && !filtered.some((c) => c.name.toLowerCase() === query.toLowerCase()) && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] hover:bg-muted transition-colors flex items-center gap-2 text-emerald-600"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear "{query}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Inline income form ───────────────────────────────────────────────────────

interface IncomeFormProps {
  initialTx?: Transaction
  currentMonth: string
  categories: Category[]
  currency: Currency
  onSaved: (tx: Transaction) => void
  onDeleted?: (id: string) => void
  onCancel: () => void
}

function IncomeForm({
  initialTx, currentMonth, categories, currency,
  onSaved, onDeleted, onCancel,
}: IncomeFormProps) {
  const supabase = createClient()
  const [amount, setAmount] = useState(initialTx ? formatMoneyInput(initialTx.amount) : '')
  const [txCurrency, setTxCurrency] = useState<Currency>(initialTx?.currency ?? currency)
  const [date, setDate] = useState(initialTx?.date ?? `${currentMonth}-01`)
  const [note, setNote] = useState(initialTx?.note ?? '')
  const [categoryId, setCategoryId] = useState(initialTx?.category_id ?? '')
  const [cats, setCats] = useState<Category[]>(categories)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    const amt = parseMoneyInput(amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const payload = {
      user_id: user.id,
      type: 'income' as TransactionType,
      amount: amt,
      currency: txCurrency,
      date,
      note: note.trim() || null,
      category_id: categoryId || null,
      status: 'confirmed' as const,
    }
    if (initialTx) {
      const { data, error } = await supabase.from('transactions')
        .update(payload).eq('id', initialTx.id).select('*, category:categories(*)').single()
      if (error) { toast.error('No se pudo actualizar. Intentá de nuevo.', { duration: 5000 }); setSaving(false); return }
      if (data) { toast.success('Ingreso actualizado'); onSaved(data as Transaction) }
    } else {
      const { data, error } = await supabase.from('transactions')
        .insert(payload).select('*, category:categories(*)').single()
      if (error) { toast.error('No se pudo guardar. Intentá de nuevo.', { duration: 5000 }); setSaving(false); return }
      if (data) { toast.success('Ingreso agregado'); onSaved(data as Transaction) }
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!initialTx || !onDeleted) return
    setDeleting(true)
    const { error } = await supabase.from('transactions').delete().eq('id', initialTx.id)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); setDeleting(false); return }
    toast.success('Ingreso eliminado')
    onDeleted(initialTx.id)
    setDeleting(false)
  }

  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Amount + currency */}
        <div className="col-span-2 flex gap-2">
          <div className="flex-1">
            <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
              Monto
            </Label>
            <MoneyInput
              autoFocus
              placeholder="0,00"
              value={amount}
              onChange={setAmount}
              className="h-9 rounded-xl text-[13px] font-mono"
            />
          </div>
          <div className="w-24">
            <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
              Moneda
            </Label>
            <Select value={txCurrency} onValueChange={(v) => setTxCurrency(v as Currency)}>
              <SelectTrigger className="h-9 rounded-xl text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Date */}
        <div>
          <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
            Fecha
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-xl text-[13px]"
          />
        </div>
        {/* Category */}
        <div>
          <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
            Categoría
          </Label>
          <CategoryCombobox
            categories={cats}
            value={categoryId}
            onChange={setCategoryId}
            onCreated={(cat) => setCats((prev) => [...prev, cat])}
          />
        </div>
        {/* Note */}
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
            Nota
          </Label>
          <Input
            placeholder="Ej: Sueldo, freelance, alquiler…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-9 rounded-xl text-[13px]"
          />
        </div>
      </div>
      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <div>
          {initialTx && onDeleted && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">¿Eliminar?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[12px] font-semibold text-rose-500 hover:text-rose-400 transition-colors"
                >
                  {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 rounded-xl text-[13px]">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !amount}
            className="h-8 rounded-xl text-[13px] bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
          >
            {saving ? 'Guardando…' : initialTx ? 'Guardar cambios' : '+ Agregar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function IncomesModal({
  transactions: initialTxs, currency, currentMonth, onClose, onChanged,
}: IncomesModalProps) {
  const supabase = createClient()
  const [txs, setTxs] = useState<Transaction[]>(initialTxs)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: categories = [] } = useSWR<Category[]>(
    'income-categories',
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase.from('categories').select('*').eq('user_id', user.id)
      return (data ?? []) as Category[]
    },
  )

  const totalARS = txs.filter(t => t.currency !== 'USD' && t.status !== 'cancelled').reduce((s, t) => s + t.amount, 0)
  const totalUSD = txs.filter(t => t.currency === 'USD' && t.status !== 'cancelled').reduce((s, t) => s + t.amount, 0)

  const [y, m] = currentMonth.split('-').map(Number)
  const monthLabel = new Date(y, m - 1, 1)
    .toLocaleString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())

  function handleSaved(tx: Transaction) {
    setTxs((prev) => {
      const exists = prev.find((t) => t.id === tx.id)
      const next = exists ? prev.map((t) => t.id === tx.id ? tx : t) : [tx, ...prev]
      onChanged(next)
      return next
    })
    setAdding(false)
    setEditingId(null)
  }

  function handleDeleted(id: string) {
    setTxs((prev) => {
      const next = prev.filter((t) => t.id !== id)
      onChanged(next)
      return next
    })
    setEditingId(null)
  }

  // Sort by date desc
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date))

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Panel */}
      <div className="relative w-full sm:max-w-[560px] bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

        {/* Header */}
        <div className="relative overflow-hidden rounded-t-3xl sm:rounded-t-3xl px-6 pt-6 pb-5 shrink-0">
          {/* Glow bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <h2 className="text-[18px] font-bold text-foreground tracking-tight">Ingresos</h2>
                <span className="text-[13px] text-muted-foreground font-medium">— {monthLabel}</span>
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="font-mono text-[26px] font-bold text-emerald-500 leading-none tracking-tight">
                  {formatCurrency(totalARS, 'ARS')}
                </span>
                {totalUSD > 0 && (
                  <span className="font-mono text-[16px] font-semibold text-emerald-400/70 leading-none">
                    + {formatCurrency(totalUSD, 'USD')}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                {txs.length} {txs.length === 1 ? 'ingreso' : 'ingresos'} este mes
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-3 min-h-0">

          {/* Add button or form */}
          {adding ? (
            <IncomeForm
              currentMonth={currentMonth}
              categories={categories}
              currency={currency}
              onSaved={handleSaved}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              onClick={() => { setAdding(true); setEditingId(null) }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl border border-dashed border-emerald-500/40 text-emerald-600 text-[13px] font-semibold hover:bg-emerald-500/5 hover:border-emerald-500/70 transition-all duration-150 group"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </div>
              Agregar ingreso
            </button>
          )}

          {/* Transaction list */}
          {sorted.length === 0 && !adding ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500/60" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground mb-1">Sin ingresos este mes</p>
                <p className="text-[12px] text-muted-foreground">Agregá tu primer ingreso con el botón de arriba.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sorted.map((tx) => {
                const isEditing = editingId === tx.id
                const catColor = tx.category?.color ?? '#10b981'
                return (
                  <div key={tx.id}>
                    {isEditing ? (
                      <IncomeForm
                        initialTx={tx}
                        currentMonth={currentMonth}
                        categories={categories}
                        currency={currency}
                        onSaved={handleSaved}
                        onDeleted={handleDeleted}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-transparent hover:bg-muted/40 hover:border-border transition-all duration-150 group cursor-default"
                      >
                        {/* Color dot */}
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${catColor}20` }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: catColor }} />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-medium text-foreground leading-none truncate">
                            {tx.note ?? tx.category?.name ?? 'Ingreso'}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                            {tx.category?.name && tx.note ? `${tx.category.name} · ` : ''}
                            {formatDate(tx.date)}
                          </p>
                        </div>
                        {/* Amount */}
                        <span className="font-mono text-[14px] font-bold text-emerald-500 tabular-nums shrink-0">
                          +{formatCurrency(tx.amount, tx.currency)}
                        </span>
                        {/* Edit btn */}
                        <button
                          onClick={() => { setEditingId(tx.id); setAdding(false) }}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100 shrink-0"
                          title="Editar"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
