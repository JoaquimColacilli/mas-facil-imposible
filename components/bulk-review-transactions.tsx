'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput, parseMoneyInput, formatMoneyInput } from '@/components/money-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CategoryCombobox } from '@/components/quick-add-transaction'
import { cn } from '@/lib/utils'
import type {
  BulkReviewItem,
  Category,
  Currency,
  ExtractedTransaction,
  TransactionType,
} from '@/lib/types'
import {
  TRANSACTION_TYPE_LABELS,
  formatCurrency,
} from '@/lib/types'

const TYPES: TransactionType[] = ['expense', 'income', 'savings', 'investment']

const TYPE_COLORS: Record<TransactionType, string> = {
  expense: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  income: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  savings: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  investment: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
}

const TYPE_ACTIVE: Record<TransactionType, string> = {
  expense: 'bg-rose-500 text-white border-rose-500',
  income: 'bg-emerald-500 text-white border-emerald-500',
  savings: 'bg-sky-500 text-white border-sky-500',
  investment: 'bg-violet-500 text-white border-violet-500',
}

const TYPE_BADGE: Record<TransactionType, string> = {
  expense: 'bg-rose-500/10 text-rose-600',
  income: 'bg-emerald-500/10 text-emerald-600',
  savings: 'bg-sky-500/10 text-sky-600',
  investment: 'bg-violet-500/10 text-violet-600',
}

interface Props {
  transactions: ExtractedTransaction[]
  onClose: () => void
  onSaved: (count: number) => void
}

function shortDate(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

function defaultRow(item: ExtractedTransaction, idx: number): BulkReviewItem {
  const today = new Date().toISOString().split('T')[0]
  return {
    _localId: `bulk-${idx}-${Math.random().toString(36).slice(2, 9)}`,
    amount: item.amount,
    currency: item.currency ?? 'ARS',
    date: item.date ?? today,
    merchant: item.merchant,
    type: item.type ?? 'expense',
    suggestedCategoryId: item.suggestedCategoryId,
    note: item.note ?? item.merchant ?? null,
  }
}

export function BulkReviewTransactions({ transactions, onClose, onSaved }: Props) {
  const supabase = createClient()

  const [items, setItems] = useState<BulkReviewItem[]>(() =>
    transactions.map((t, i) => defaultRow(t, i)),
  )
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((it) => it._localId)),
  )
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: categories = [], mutate: mutateCategories } = useSWR<Category[]>(
    'categories',
    async () => {
      const { data } = await supabase.from('categories').select('*').order('name')
      return data ?? []
    },
  )

  const handleCategoryCreated = useCallback(
    (cat: Category) => {
      mutateCategories([...categories, cat], false)
    },
    [categories, mutateCategories],
  )

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function patch(id: string, fields: Partial<BulkReviewItem>) {
    setItems((prev) => prev.map((it) => (it._localId === id ? { ...it, ...fields } : it)))
  }

  const selectedCount = selected.size
  const allSelected = selectedCount === items.length && items.length > 0

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(items.map((it) => it._localId)))
  }

  const totalsByCurrency = useMemo(() => {
    const acc: Record<Currency, number> = { ARS: 0, USD: 0 }
    for (const it of items) {
      if (!selected.has(it._localId)) continue
      if (it.amount == null || !it.currency) continue
      acc[it.currency] += it.amount
    }
    return acc
  }, [items, selected])

  async function save() {
    const toInsert = items.filter((it) => selected.has(it._localId))
    // Validate
    const invalid = toInsert.find((it) => !it.amount || !it.currency || !it.date || !it.type)
    if (invalid) {
      toast.error('Hay filas con datos faltantes. Revisá monto, moneda, fecha y tipo.')
      return
    }
    if (toInsert.length === 0) return

    setSaving(true)
    try {
      const { createManyTransactions } = await import('@/app/(app)/transactions/actions')
      const { count, error } = await createManyTransactions(
        toInsert.map((it) => ({
          type: it.type as TransactionType,
          amount: it.amount as number,
          currency: it.currency as Currency,
          note: it.note,
          category_id: it.suggestedCategoryId,
          date: it.date as string,
        })),
      )
      if (error) {
        toast.error('No se pudieron guardar los movimientos. Probá de nuevo.', { duration: 6000 })
        setSaving(false)
        return
      }
      toast.success(`${count} ${count === 1 ? 'movimiento cargado' : 'movimientos cargados'}`)
      onSaved(count)
    } catch {
      toast.error('No se pudieron guardar los movimientos. Probá de nuevo.', { duration: 6000 })
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />
      <div className="relative w-full sm:max-w-2xl bg-card sm:rounded-2xl border border-border shadow-xl z-10 animate-in fade-in-0 sm:zoom-in-95 duration-150 flex flex-col h-dvh sm:h-auto sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 pb-3 shrink-0 border-b border-border">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-semibold text-card-foreground">
              Encontramos {transactions.length} {transactions.length === 1 ? 'movimiento' : 'movimientos'}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Revisá y guardá los que correspondan. Tocá una fila para editarla.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted disabled:opacity-30 shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Select-all bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-b border-border bg-muted/20 shrink-0">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                allSelected
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border bg-background',
              )}
            >
              {allSelected && <Check className="w-3 h-3" />}
            </span>
            {allSelected ? 'Destildar todos' : 'Tildar todos'}
          </button>
          <div className="flex items-center gap-3 text-[11px] tabular-nums font-mono">
            {totalsByCurrency.ARS > 0 && (
              <span className="text-foreground">{formatCurrency(totalsByCurrency.ARS, 'ARS')}</span>
            )}
            {totalsByCurrency.USD > 0 && (
              <span className="text-foreground">{formatCurrency(totalsByCurrency.USD, 'USD')}</span>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {items.map((it) => {
            const isSelected = selected.has(it._localId)
            const isExpanded = expanded === it._localId
            const cat = categories.find((c) => c.id === it.suggestedCategoryId)
            return (
              <div
                key={it._localId}
                className={cn(
                  'border-b border-border transition-colors',
                  !isSelected && 'opacity-50',
                )}
              >
                {/* Collapsed row */}
                <div className="flex items-center gap-3 px-5 sm:px-6 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSelected(it._localId)}
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-foreground/40',
                    )}
                    aria-label={isSelected ? 'Destildar' : 'Tildar'}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : it._localId)}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  >
                    <span className="text-[11px] font-mono text-muted-foreground w-12 shrink-0">
                      {shortDate(it.date)}
                    </span>
                    <span className="text-[13px] font-medium text-foreground truncate flex-1 min-w-0">
                      {it.merchant ?? <span className="text-muted-foreground italic">Sin nombre</span>}
                    </span>
                    <span className="text-[13px] font-bold tabular-nums font-mono text-foreground shrink-0">
                      {it.amount != null && it.currency
                        ? formatCurrency(it.amount, it.currency)
                        : '—'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : it._localId)}
                    className="text-muted-foreground hover:text-foreground p-1 -mr-1 shrink-0"
                    aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Chips row (only when collapsed) */}
                {!isExpanded && (it.type || cat) && (
                  <div className="flex items-center gap-1.5 px-5 sm:px-6 pb-3 -mt-1 ml-7 flex-wrap">
                    {it.type && (
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', TYPE_BADGE[it.type])}>
                        {TRANSACTION_TYPE_LABELS[it.type]}
                      </span>
                    )}
                    {cat && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    )}
                  </div>
                )}

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-4 pt-1 flex flex-col gap-3 bg-muted/10">
                    {/* Type tabs */}
                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
                        Tipo
                      </Label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => patch(it._localId, { type: t, suggestedCategoryId: null })}
                            className={cn(
                              'text-[11px] font-semibold py-1.5 px-1 rounded-lg border transition-all duration-150',
                              it.type === t ? TYPE_ACTIVE[t] : `${TYPE_COLORS[t]} hover:opacity-80`,
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
                        <Label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
                          Monto
                        </Label>
                        <MoneyInput
                          value={it.amount != null ? formatMoneyInput(it.amount) : ''}
                          onChange={(v) => patch(it._localId, { amount: parseMoneyInput(v) || null })}
                          placeholder="0,00"
                          className="h-9 text-sm font-mono font-semibold tabular-nums rounded-lg"
                        />
                      </div>
                      <div className="w-20">
                        <Label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
                          Moneda
                        </Label>
                        <Select
                          value={it.currency ?? 'ARS'}
                          onValueChange={(v) => patch(it._localId, { currency: v as Currency })}
                        >
                          <SelectTrigger className="h-9 rounded-lg text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[70]">
                            <SelectItem value="ARS">ARS</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
                        Fecha
                      </Label>
                      <Input
                        type="date"
                        value={it.date ?? ''}
                        onChange={(e) => patch(it._localId, { date: e.target.value })}
                        className="h-9 rounded-lg text-[13px]"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
                        Categoría
                      </Label>
                      <CategoryCombobox
                        categories={categories}
                        value={it.suggestedCategoryId ?? ''}
                        onChange={(id) => patch(it._localId, { suggestedCategoryId: id || null })}
                        onCreated={handleCategoryCreated}
                        type={(it.type ?? 'expense') as TransactionType}
                      />
                    </div>

                    {/* Merchant + note */}
                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
                        Nombre
                      </Label>
                      <Input
                        value={it.merchant ?? ''}
                        onChange={(e) => patch(it._localId, { merchant: e.target.value || null })}
                        placeholder="Ej: Carrefour"
                        className="h-9 rounded-lg text-[13px]"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
                        Nota
                      </Label>
                      <Input
                        value={it.note ?? ''}
                        onChange={(e) => patch(it._localId, { note: e.target.value || null })}
                        placeholder="Ej: Cuota 3/12"
                        className="h-9 rounded-lg text-[13px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Sticky bottom */}
        <div className="border-t border-border bg-card p-4 sm:p-5 flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1 sm:flex-none h-11 rounded-xl text-[13px] font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={selectedCount === 0 || saving}
            className="flex-1 h-11 rounded-xl text-[13px] font-semibold transition-all duration-150 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>Guardar {selectedCount} {selectedCount === 1 ? 'movimiento' : 'movimientos'}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

