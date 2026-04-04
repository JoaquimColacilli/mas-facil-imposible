'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, Category, Currency, TransactionType } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput, parseMoneyInput, formatMoneyInput } from '@/components/money-input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  X, Plus, ArrowDownLeft, PiggyBank, TrendingUp, ArrowDownToLine,
  ChevronDown, Search, Check, Pencil, Trash2,
} from 'lucide-react'
import type { Portfolio } from '@/lib/types'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Type config ──────────────────────────────────────────────────────────────

type ModalType = 'income' | 'savings' | 'investment'

const TYPE_CFG = {
  income: {
    label: 'Ingresos',
    singular: 'ingreso',
    Icon: ArrowDownLeft,
    color: 'text-emerald-500',
    colorBold: 'text-emerald-500',
    colorSecondary: 'text-emerald-400/70',
    bg: 'bg-emerald-500/15',
    glow: 'from-emerald-500/12 via-emerald-500/5',
    border: 'border-emerald-500/20',
    btnBg: 'bg-emerald-600 hover:bg-emerald-500',
    dashedBorder: 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/5 hover:border-emerald-500/70',
    formBg: 'bg-emerald-500/5 border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-500/40',
  },
  savings: {
    label: 'Ahorros',
    singular: 'ahorro',
    Icon: PiggyBank,
    color: 'text-sky-500',
    colorBold: 'text-sky-500',
    colorSecondary: 'text-sky-400/70',
    bg: 'bg-sky-500/15',
    glow: 'from-sky-500/12 via-sky-500/5',
    border: 'border-sky-500/20',
    btnBg: 'bg-sky-600 hover:bg-sky-500',
    dashedBorder: 'border-sky-500/40 text-sky-600 hover:bg-sky-500/5 hover:border-sky-500/70',
    formBg: 'bg-sky-500/5 border-sky-500/20',
    hoverBorder: 'hover:border-sky-500/40',
  },
  investment: {
    label: 'Inversiones',
    singular: 'inversión',
    Icon: TrendingUp,
    color: 'text-violet-500',
    colorBold: 'text-violet-500',
    colorSecondary: 'text-violet-400/70',
    bg: 'bg-violet-500/15',
    glow: 'from-violet-500/12 via-violet-500/5',
    border: 'border-violet-500/20',
    btnBg: 'bg-violet-600 hover:bg-violet-500',
    dashedBorder: 'border-violet-500/40 text-violet-600 hover:bg-violet-500/5 hover:border-violet-500/70',
    formBg: 'bg-violet-500/5 border-violet-500/20',
    hoverBorder: 'hover:border-violet-500/40',
  },
} as const

// ─── Category combobox ────────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  '#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899',
  '#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6',
]

function CategoryCombobox({
  categories, value, onChange, onCreated, type,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  onCreated: (cat: Category) => void
  type: ModalType
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const filtered = categories
    .filter((c) => c.type === type && c.name.toLowerCase().includes(query.toLowerCase()))
  const selected = categories.find((c) => c.id === value)

  async function handleCreate() {
    if (!query.trim() || creating) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }
    const color = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]
    const { data } = await supabase.from('categories')
      .insert({ user_id: user.id, name: query.trim(), type, icon: 'tag', color })
      .select().single()
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                placeholder="Buscar o crear…"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setQuery('') }}
              className={cn('w-full text-left px-3 py-2 rounded-lg text-[13px] hover:bg-muted transition-colors flex items-center gap-2', !value && 'bg-muted')}
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
                className={cn('w-full text-left px-3 py-2 rounded-lg text-[13px] hover:bg-muted transition-colors flex items-center gap-2', value === cat.id && 'bg-muted')}
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
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] hover:bg-muted transition-colors flex items-center gap-2 text-primary"
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

// ─── Inline form ──────────────────────────────────────────────────────────────

interface TxFormProps {
  type: ModalType
  initialTx?: Transaction
  currentMonth: string
  categories: Category[]
  currency: Currency
  onSaved: (tx: Transaction) => void
  onDeleted?: (id: string) => void
  onCancel: () => void
  cfg: typeof TYPE_CFG[ModalType]
}

function TxForm({ type, initialTx, currentMonth, categories, currency, onSaved, onDeleted, onCancel, cfg }: TxFormProps) {
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
    if (!amt || isNaN(amt) || amt <= 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const payload = {
      user_id: user.id,
      type: type as TransactionType,
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
      if (data) { toast.success('Movimiento actualizado'); onSaved(data as Transaction) }
    } else {
      const { data, error } = await supabase.from('transactions')
        .insert(payload).select('*, category:categories(*)').single()
      if (error) { toast.error('No se pudo guardar. Intentá de nuevo.', { duration: 5000 }); setSaving(false); return }
      if (data) { toast.success('Movimiento agregado'); onSaved(data as Transaction) }
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!initialTx || !onDeleted) return
    setDeleting(true)
    const { error } = await supabase.from('transactions').delete().eq('id', initialTx.id)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); setDeleting(false); return }
    toast.success('Movimiento eliminado')
    onDeleted(initialTx.id)
    setDeleting(false)
  }

  return (
    <div className={cn('border rounded-2xl p-4 flex flex-col gap-3', cfg.formBg)}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex gap-2">
          <div className="flex-1">
            <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Monto</Label>
            <MoneyInput
              autoFocus
              placeholder="0,00"
              value={amount} onChange={setAmount}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              className="h-9 rounded-xl text-[13px] font-mono"
            />
          </div>
          <div className="w-24">
            <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Moneda</Label>
            <Select value={txCurrency} onValueChange={(v) => setTxCurrency(v as Currency)}>
              <SelectTrigger className="h-9 rounded-xl text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-xl text-[13px]" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Categoría</Label>
          <CategoryCombobox
            categories={cats} value={categoryId} onChange={setCategoryId}
            onCreated={(cat) => setCats((prev) => [...prev, cat])} type={type}
          />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Nota</Label>
          <Input
            placeholder={type === 'income' ? 'Ej: Sueldo, freelance…' : type === 'savings' ? 'Ej: Fondo de emergencia…' : 'Ej: ETF, acciones…'}
            value={note} onChange={(e) => setNote(e.target.value)}
            className="h-9 rounded-xl text-[13px]"
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <div>
          {initialTx && onDeleted && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">¿Eliminar?</span>
                <button onClick={handleDelete} disabled={deleting} className="text-[12px] font-semibold text-rose-500 hover:text-rose-400 transition-colors">
                  {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-rose-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 rounded-xl text-[13px]">Cancelar</Button>
          <Button
            size="sm" onClick={handleSave} disabled={saving || !amount}
            className={cn('h-8 rounded-xl text-[13px] text-white gap-1.5', cfg.btnBg)}
          >
            {saving ? 'Guardando…' : initialTx ? 'Guardar cambios' : '+ Agregar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export interface TransactionTypeModalProps {
  type: ModalType
  transactions: Transaction[]
  currency: Currency
  currentMonth: string
  portfolios?: Portfolio[]
  onClose: () => void
  onChanged: (updated: Transaction[]) => void
}

export function TransactionTypeModal({
  type, transactions: initialTxs, currency, currentMonth, portfolios = [], onClose, onChanged,
}: TransactionTypeModalProps) {
  const supabase = createClient()
  const cfg = TYPE_CFG[type]
  const [txs, setTxs] = useState<Transaction[]>(initialTxs)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Withdraw state (savings only)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawToPortfolio, setWithdrawToPortfolio] = useState<string | null>(null)
  const [withdrawSaving, setWithdrawSaving] = useState(false)

  const { data: categories = [] } = useSWR<Category[]>(
    `categories-${type}`,
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

  async function handleWithdraw() {
    const amt = parseMoneyInput(withdrawAmount)
    if (!amt || amt <= 0) return
    setWithdrawSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setWithdrawSaving(false); return }

    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const isToPortfolio = withdrawToPortfolio && portfolios.length > 0
    const port = isToPortfolio ? portfolios.find(p => p.id === withdrawToPortfolio) : null
    const note = port ? `Traspaso a ${port.name}` : 'Retiro de ahorros'

    // Create negative savings transaction
    const { data: txData } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'savings' as TransactionType,
      amount: -amt,
      currency: port?.currency ?? currency,
      date: dateStr,
      note,
      category_id: null,
      status: 'confirmed' as const,
    }).select('*, category:categories(*)').single()

    // If moving to portfolio, increase its balance
    if (port) {
      const newBalance = Number(port.balance) + amt
      await supabase.from('portfolios').update({ balance: newBalance }).eq('id', port.id)
      await supabase.from('portfolio_logs').insert({
        portfolio_id: port.id,
        date: dateStr,
        percentage_change: Number(port.balance) > 0 ? ((newBalance / Number(port.balance)) - 1) * 100 : 0,
        absolute_change: amt,
        new_balance: newBalance,
      })
    }

    if (txData) {
      const next = [txData as Transaction, ...txs]
      setTxs(next)
      onChanged(next)
      toast.success(withdrawToPortfolio ? 'Traspaso registrado' : 'Retiro registrado')
    }
    setWithdrawing(false)
    setWithdrawAmount('')
    setWithdrawToPortfolio(null)
    setWithdrawSaving(false)
  }

  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date))

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      <div className="relative w-full sm:max-w-[560px] bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

        {/* Header */}
        <div className="relative overflow-hidden rounded-t-3xl px-6 pt-6 pb-5 shrink-0">
          <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none', cfg.glow)} />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center', cfg.bg)}>
                  <cfg.Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                </div>
                <h2 className="text-[18px] font-bold text-foreground tracking-tight">{cfg.label}</h2>
                <span className="text-[13px] text-muted-foreground font-medium">— {monthLabel}</span>
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <span className={cn('font-mono text-[26px] font-bold leading-none tracking-tight', cfg.colorBold)}>
                  {formatCurrency(totalARS, 'ARS')}
                </span>
                {totalUSD > 0 && (
                  <span className={cn('font-mono text-[16px] font-semibold leading-none', cfg.colorSecondary)}>
                    + {formatCurrency(totalUSD, 'USD')}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                {txs.length} {txs.length === 1 ? cfg.singular : cfg.label.toLowerCase()} este mes
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
          {adding ? (
            <TxForm
              type={type} currentMonth={currentMonth} categories={categories}
              currency={currency} cfg={cfg} onSaved={handleSaved} onCancel={() => setAdding(false)}
            />
          ) : withdrawing ? (
            /* Withdraw form (savings only) */
            <div className="border border-orange-500/20 bg-orange-500/5 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <span className="text-[13px] font-semibold">Retirar ahorro</span>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Monto</Label>
                <MoneyInput
                  autoFocus placeholder="0,00" value={withdrawAmount} onChange={setWithdrawAmount}
                  className="h-9 rounded-xl text-[13px] font-mono"
                />
              </div>
              {portfolios.length > 0 && (
                <div>
                  <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
                    Pasar a inversión (opcional)
                  </Label>
                  <Select value={withdrawToPortfolio ?? '_none'} onValueChange={v => setWithdrawToPortfolio(v === '_none' ? null : v)}>
                    <SelectTrigger className="h-9 rounded-xl text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Solo retirar</SelectItem>
                      {portfolios.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {withdrawToPortfolio && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Se reduce el ahorro y se suma al saldo del portfolio.
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => { setWithdrawing(false); setWithdrawAmount(''); setWithdrawToPortfolio(null) }} className="h-8 rounded-xl text-[13px]">Cancelar</Button>
                <Button size="sm" onClick={handleWithdraw} disabled={withdrawSaving || !withdrawAmount || parseMoneyInput(withdrawAmount) <= 0}
                  className="h-8 rounded-xl text-[13px] text-white bg-orange-600 hover:bg-orange-500 gap-1.5">
                  {withdrawSaving ? 'Retirando…' : withdrawToPortfolio ? 'Traspasar' : 'Retirar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setAdding(true); setEditingId(null); setWithdrawing(false) }}
                className={cn(
                  'flex items-center gap-2 flex-1 px-4 py-3 rounded-2xl border border-dashed text-[13px] font-semibold transition-all duration-150 group',
                  cfg.dashedBorder,
                )}
              >
                <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center transition-colors', cfg.bg)}>
                  <Plus className="w-3.5 h-3.5" />
                </div>
                Agregar {cfg.singular}
              </button>
              {type === 'savings' && (
                <button
                  onClick={() => { setWithdrawing(true); setAdding(false); setEditingId(null) }}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-orange-500/40 text-orange-600 hover:bg-orange-500/5 hover:border-orange-500/70 text-[13px] font-semibold transition-all duration-150"
                >
                  <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center">
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                  </div>
                  Retirar
                </button>
              )}
            </div>
          )}

          {sorted.length === 0 && !adding ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', cfg.bg)}>
                <cfg.Icon className={cn('w-5 h-5 opacity-60', cfg.color)} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground mb-1">
                  Sin {cfg.label.toLowerCase()} este mes
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Agregá {cfg.singular === 'inversión' ? 'una' : 'un'} {cfg.singular} con el botón de arriba.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sorted.map((tx) => {
                const isEditing = editingId === tx.id
                const catColor = tx.category?.color ?? (
                  type === 'income' ? '#10b981' : type === 'savings' ? '#0ea5e9' : '#8b5cf6'
                )
                return (
                  <div key={tx.id}>
                    {isEditing ? (
                      <TxForm
                        type={type} initialTx={tx} currentMonth={currentMonth}
                        categories={categories} currency={currency} cfg={cfg}
                        onSaved={handleSaved} onDeleted={handleDeleted} onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-2xl border border-transparent transition-all duration-150 group cursor-default',
                        'hover:bg-muted/40 hover:border-border',
                      )}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${catColor}20` }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: catColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-medium text-foreground leading-none truncate">
                            {tx.note ?? tx.category?.name ?? cfg.label.slice(0, -1)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                            {tx.category?.name && tx.note ? `${tx.category.name} · ` : ''}
                            {formatDate(tx.date)}
                          </p>
                        </div>
                        <span className={cn('font-mono text-[14px] font-bold tabular-nums shrink-0', tx.amount < 0 ? 'text-orange-400' : cfg.colorBold)}>
                          {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount), tx.currency)}
                        </span>
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
