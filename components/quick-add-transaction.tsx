'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Currency, TransactionType } from '@/lib/types'
import { TRANSACTION_TYPE_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput, parseMoneyInput } from '@/components/money-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, ChevronDown, Plus, Search, Check, Layers } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'

interface QuickAddTransactionProps {
  onClose: () => void
  onSuccess: () => void
}

const TYPES: TransactionType[] = ['expense', 'income', 'savings', 'investment']

const TYPE_COLORS: Record<TransactionType, string> = {
  expense:    'bg-rose-500/10 text-rose-600 border-rose-500/30',
  income:     'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  savings:    'bg-sky-500/10 text-sky-600 border-sky-500/30',
  investment: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
}

const TYPE_ACTIVE: Record<TransactionType, string> = {
  expense:    'bg-rose-500 text-white border-rose-500',
  income:     'bg-emerald-500 text-white border-emerald-500',
  savings:    'bg-sky-500 text-white border-sky-500',
  investment: 'bg-violet-500 text-white border-violet-500',
}

// ── Category Combobox ─────────────────────────────────────────────────────────
function CategoryCombobox({
  categories,
  value,
  onChange,
  onCreated,
  type,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  onCreated: (cat: Category) => void
  type: TransactionType
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = categories.filter(
    (c) => c.type === type && c.name.toLowerCase().includes(query.toLowerCase()),
  )
  const selected = categories.find((c) => c.id === value)
  const exactMatch = filtered.some((c) => c.name.toLowerCase() === query.toLowerCase())
  const canCreate = query.trim().length > 0 && !exactMatch

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  async function createCategory() {
    if (!query.trim()) return
    setCreating(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setCreating(false); return }
    const { data, error } = await supabase.from('categories').insert({
      user_id: userData.user.id,
      name: query.trim(),
      type,
      icon: 'circle',
      color: '#10b981',
    }).select().single()
    setCreating(false)
    if (!error && data) {
      onCreated(data as Category)
      onChange(data.id)
      setQuery('')
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between h-10 px-3 rounded-xl border border-input bg-background text-sm transition-colors duration-150',
          'hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30',
          open && 'ring-2 ring-ring/30 border-ring',
        )}
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.name : 'Sin categoría'}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-100">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar o crear..."
              className="flex-1 text-[13px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) { e.preventDefault(); createCategory() }
                if (e.key === 'Escape') setOpen(false)
              }}
            />
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            {/* Clear */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-muted/40 transition-colors duration-100"
              >
                <X className="w-3.5 h-3.5" />
                Sin categoría
              </button>
            )}

            {/* Filtered list */}
            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-4 text-[12px] text-muted-foreground text-center">
                Sin resultados
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setQuery(''); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] transition-colors duration-100 hover:bg-muted/40',
                  value === c.id && 'bg-accent/30',
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="flex-1 text-left text-foreground">{c.name}</span>
                {value === c.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}

            {/* Create new */}
            {canCreate && (
              <button
                type="button"
                onClick={createCategory}
                disabled={creating}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-primary hover:bg-primary/8 transition-colors duration-100 font-medium"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                {creating ? 'Creando...' : `Crear "${query.trim()}"`}
              </button>
            )}
          </div>

          {/* See all modal trigger */}
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] text-muted-foreground hover:text-primary transition-colors duration-100 font-medium"
            >
              <Layers className="w-3 h-3" />
              Ver todas las categorías
            </button>
          </div>
        </div>
      )}

      {/* All-categories modal */}
      {showAll && (
        <AllCategoriesModal
          categories={categories}
          type={type}
          selected={value}
          onSelect={(id) => { onChange(id); setShowAll(false) }}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  )
}

function AllCategoriesModal({
  categories,
  type,
  selected,
  onSelect,
  onClose,
}: {
  categories: Category[]
  type: TransactionType
  selected: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const relevant = categories.filter((c) => c.type === type)
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-5 z-10 animate-in fade-in-0 slide-in-from-bottom-4 duration-150">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-foreground">Categorías — {TRANSACTION_TYPE_LABELS[type]}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {relevant.length === 0 ? (
          <p className="text-[13px] text-muted-foreground text-center py-8">Sin categorías para este tipo.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {relevant.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[13px] font-medium transition-all duration-100',
                  selected === c.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40',
                )}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="truncate">{c.name}</span>
                {selected === c.id && <Check className="w-3 h-3 ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main QuickAdd Modal ───────────────────────────────────────────────────────
export function QuickAddTransaction({ onClose, onSuccess }: QuickAddTransactionProps) {
  const supabase = createClient()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: categories = [], mutate: mutateCategories } = useSWR<Category[]>('categories', async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    return data ?? []
  })

  const handleCategoryCreated = useCallback((cat: Category) => {
    mutateCategories([...categories, cat], false)
  }, [categories, mutateCategories])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!amount || parseMoneyInput(amount) <= 0) {
      setError('Ingresá un monto válido')
      return
    }
    setLoading(true)

    const { createTransaction } = await import('@/app/(app)/transactions/actions')
    const { error: insertError } = await createTransaction({
      type,
      amount: parseMoneyInput(amount),
      currency,
      note: note.trim() || null,
      category_id: categoryId || null,
      date,
    })
    if (insertError) {
      setError(insertError)
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl z-10 animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 flex flex-col max-h-[90dvh] sm:max-h-[90vh]">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-base font-semibold text-card-foreground">Nuevo movimiento</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted"
            aria-label="Cerrar"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-6 pb-6">
          {/* Type tabs */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Tipo</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setCategoryId('') }}
                  className={cn(
                    'text-[11px] font-semibold py-2 px-1 rounded-xl border transition-all duration-150',
                    type === t ? TYPE_ACTIVE[t] : `${TYPE_COLORS[t]} hover:opacity-80`,
                  )}
                >
                  {TRANSACTION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="amount" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Monto</Label>
              <MoneyInput
                id="amount"
                placeholder="0,00"
                value={amount}
                onChange={setAmount}
                required
                className="h-10 text-base font-mono font-semibold tabular-nums rounded-xl"
                autoFocus
              />
            </div>
            <div className="w-24">
              <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category combobox */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Categoría</Label>
            <CategoryCombobox
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onCreated={handleCategoryCreated}
              type={type}
            />
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Nota (opcional)</Label>
            <Input
              id="note"
              placeholder="Ej: Supermercado, sueldo..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-10 rounded-xl"
            />
          </div>

          {error && (
            <p className="text-[12px] text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className={cn('h-11 w-full mt-1 rounded-xl font-semibold transition-all duration-150 hover:scale-[1.01] hover:shadow-md')}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar movimiento'}
          </Button>
        </form>
      </div>
    </div>
  )
}
