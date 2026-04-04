'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, Category, Currency, TransactionType, PaymentMethod } from '@/lib/types'
import { TRANSACTION_TYPE_LABELS } from '@/lib/types'
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
import { X, ChevronDown, Search, Check, Plus, Banknote, CreditCard, Smartphone, Repeat } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface EditTransactionModalProps {
  transaction: Transaction
  onClose: () => void
  onSaved: (updated: Transaction) => void
  onDeleted: (id: string) => void
}

const TYPES: TransactionType[] = ['expense', 'income', 'savings', 'investment']

const TYPE_ACTIVE: Record<TransactionType, string> = {
  expense:    'bg-rose-500 text-white border-rose-500',
  income:     'bg-emerald-500 text-white border-emerald-500',
  savings:    'bg-sky-500 text-white border-sky-500',
  investment: 'bg-violet-500 text-white border-violet-500',
}
const TYPE_IDLE: Record<TransactionType, string> = {
  expense:    'bg-rose-500/10 text-rose-600 border-rose-500/30',
  income:     'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  savings:    'bg-sky-500/10 text-sky-600 border-sky-500/30',
  investment: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
}

function MiniCombobox({
  categories,
  value,
  onChange,
  type,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  type: TransactionType
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = categories.filter(
    (c) => c.type === type && c.name.toLowerCase().includes(query.toLowerCase()),
  )
  const selected = categories.find((c) => c.id === value)
  const canCreate = query.trim().length > 0 && !filtered.some((c) => c.name.toLowerCase() === query.toLowerCase())

  useEffect(() => {
    function h(e: MouseEvent) {
      const el = document.getElementById('mini-combo-popover')
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  async function createCategory() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('categories').insert({
      user_id: user.id, name: query.trim(), type, icon: 'circle', color: '#10b981',
    }).select().single()
    if (data) { onChange(data.id); setOpen(false); setQuery('') }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between h-10 px-3 rounded-xl border border-input bg-background text-sm',
          'hover:border-ring focus:outline-none transition-colors duration-150',
          open && 'ring-2 ring-ring/30 border-ring',
        )}
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.name : 'Sin categoría'}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div id="mini-combo-popover" className="absolute z-[70] w-full mt-1.5 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 text-[13px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) { e.preventDefault(); createCategory() }
                if (e.key === 'Escape') setOpen(false)
              }}
            />
          </div>
          <div className="max-h-[180px] overflow-y-auto">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted/40">
              <X className="w-3.5 h-3.5" /> Sin categoría
            </button>
            {filtered.map((c) => (
              <button key={c.id} type="button"
                onClick={() => { onChange(c.id); setOpen(false); setQuery('') }}
                className={cn('w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-muted/40 transition-colors', value === c.id && 'bg-accent/30')}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-left text-foreground">{c.name}</span>
                {value === c.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
            {canCreate && (
              <button type="button" onClick={createCategory}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-primary hover:bg-primary/8 font-medium">
                <Plus className="w-3.5 h-3.5" /> Crear &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function EditTransactionModal({ transaction, onClose, onSaved, onDeleted }: EditTransactionModalProps) {
  const supabase = createClient()

  const [type, setType] = useState<TransactionType>(transaction.type)
  const [amount, setAmount] = useState(formatMoneyInput(transaction.amount))
  const [currency, setCurrency] = useState<Currency>(transaction.currency)
  const [note, setNote] = useState(transaction.note ?? '')
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? '')
  const [date, setDate] = useState(transaction.date)
  const [status, setStatus] = useState(transaction.status)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(transaction.payment_method ?? null)
  const [isRecurring, setIsRecurring] = useState(transaction.is_recurring ?? false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: categories = [] } = useSWR<Category[]>('categories', async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    return data ?? []
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!amount || parseMoneyInput(amount) <= 0) {
      setError('Ingresá un monto válido')
      return
    }
    setLoading(true)
    const { updateTransaction } = await import('@/app/(app)/transactions/actions')
    const { data, error: err } = await updateTransaction({
      id: transaction.id,
      type,
      amount: parseMoneyInput(amount),
      currency,
      note: note.trim() || null,
      category_id: categoryId || null,
      date,
      status,
      payment_method: type === 'expense' ? paymentMethod : null,
      is_recurring: isRecurring,
    })
    setLoading(false)
    if (err) { setError(err); toast.error('No se pudo actualizar. Intentá de nuevo.', { duration: 5000 }); return }
    if (data) { toast.success('Movimiento actualizado'); onSaved(data) }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const { deleteTransaction } = await import('@/app/(app)/transactions/actions')
    const { error } = await deleteTransaction(transaction.id)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); setDeleting(false); return }
    toast.success('Movimiento eliminado')
    onDeleted(transaction.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-6 z-10 animate-in fade-in-0 slide-in-from-bottom-4 sm:zoom-in-95 duration-150">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-card-foreground">Editar movimiento</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Tipo</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map((t) => (
                <button key={t} type="button"
                  onClick={() => { setType(t); setCategoryId('') }}
                  className={cn('text-[11px] font-semibold py-2 px-1 rounded-xl border transition-all duration-150',
                    type === t ? TYPE_ACTIVE[t] : `${TYPE_IDLE[t]} hover:opacity-80`,
                  )}>
                  {TRANSACTION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="edit-amount" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Monto</Label>
              <MoneyInput id="edit-amount" placeholder="0,00"
                value={amount} onChange={setAmount} required
                className="h-10 text-base font-mono font-semibold tabular-nums rounded-xl" />
            </div>
            <div className="w-24">
              <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Categoría</Label>
            <MiniCombobox categories={categories} value={categoryId} onChange={setCategoryId} type={type} />
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="edit-note" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Nota</Label>
            <Input id="edit-note" placeholder="Descripción del movimiento..." value={note}
              onChange={(e) => setNote(e.target.value)} className="h-10 rounded-xl" />
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="edit-date" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Fecha</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                required className="h-10 rounded-xl" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurring toggle */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Repetir</Label>
            <button
              type="button"
              onClick={() => setIsRecurring((v) => !v)}
              className={cn(
                'w-full flex items-center justify-center gap-2 text-[12px] font-semibold py-2.5 rounded-xl border transition-all duration-150',
                isRecurring
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
              )}
            >
              <Repeat className="w-3.5 h-3.5" />
              {isRecurring ? 'Se repite cada mes' : 'No se repite'}
            </button>
          </div>

          {/* Payment method — only for expenses */}
          {type === 'expense' && (
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">Método de pago</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: 'cash' as PaymentMethod, label: 'Efectivo', icon: Banknote },
                  { value: 'debit' as PaymentMethod, label: 'Débito', icon: Smartphone },
                  { value: 'credit' as PaymentMethod, label: 'Crédito', icon: CreditCard },
                ]).map(({ value, label, icon: PMIcon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      const next = paymentMethod === value ? null : value
                      setPaymentMethod(next)
                      if (next === 'credit' && status === 'confirmed') setStatus('pending')
                      if (next !== 'credit' && paymentMethod === 'credit' && status === 'pending') setStatus('confirmed')
                    }}
                    className={cn(
                      'flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2 px-1 rounded-xl border transition-all duration-150',
                      paymentMethod === value
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
                    )}
                  >
                    <PMIcon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-[12px] text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 mt-1">
            <Button type="button" variant="outline" size="sm"
              onClick={handleDelete} disabled={deleting}
              className={cn('rounded-xl h-10 transition-all duration-150', confirmDelete && 'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground')}>
              {deleting ? 'Eliminando...' : confirmDelete ? '¿Confirmar?' : 'Eliminar'}
            </Button>
            <Button type="submit" className="flex-1 h-10 rounded-xl font-semibold transition-all duration-150 hover:scale-[1.01]" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
