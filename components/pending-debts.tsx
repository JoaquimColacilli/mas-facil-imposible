'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Debt } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CreditCard,
  Plus,
  Check,
  Pencil,
  Trash2,
  X,
  Clock,
} from 'lucide-react'

interface PendingDebtsProps {
  initialDebts: Debt[]
  currency: 'ARS' | 'USD'
}

function AddDebtForm({
  currency,
  onSave,
  onCancel,
}: {
  currency: 'ARS' | 'USD'
  onSave: (debt: Debt) => void
  onCancel: () => void
}) {
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [curr, setCurr] = useState<'ARS' | 'USD'>(currency)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!personName.trim() || !amount || Number(amount) <= 0) {
      setError('Completá nombre y monto')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data, error: err } = await supabase
      .from('debts')
      .insert({
        user_id: user.id,
        person_name: personName.trim(),
        amount: Number(amount),
        currency: curr,
        note: note.trim() || null,
        date,
        paid: false,
      })
      .select()
      .single()

    setSaving(false)
    if (err) { setError(err.message); return }
    onSave(data as Debt)
  }

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition-shadow'

  return (
    <div className="p-3 border-t border-border bg-muted/20 flex flex-col gap-2">
      <input
        className={inputCls}
        placeholder="A quién le debés (ej. Martín)"
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <input
          className={cn(inputCls, 'flex-1')}
          type="number"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
        />
        <select
          className={cn(inputCls, 'w-20 shrink-0')}
          value={curr}
          onChange={(e) => setCurr(e.target.value as 'ARS' | 'USD')}
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <input
        className={inputCls}
        placeholder="Nota (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <input
        className={inputCls}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      {error && <p className="text-[11px] text-rose-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-7 text-[11px] rounded-lg"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-7 text-[11px] rounded-lg px-2"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

function DebtRow({
  debt,
  onMarkPaid,
  onEdit,
  onDelete,
}: {
  debt: Debt
  onMarkPaid: (id: string) => void
  onEdit: (debt: Debt) => void
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className={cn(
      'group flex items-center gap-2.5 px-3 py-2.5 border-b border-border last:border-0 transition-colors duration-100 hover:bg-muted/20',
      debt.paid && 'opacity-50',
    )}>
      {/* Status dot */}
      <button
        onClick={() => !debt.paid && onMarkPaid(debt.id)}
        title={debt.paid ? 'Pagada' : 'Marcar como pagada'}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150',
          debt.paid
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-border hover:border-emerald-500 hover:bg-emerald-500/10',
        )}
      >
        {debt.paid && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-[12.5px] font-semibold text-foreground leading-none truncate', debt.paid && 'line-through')}>
          {debt.person_name}
        </p>
        <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-none truncate">
          {debt.note ? `${debt.note} · ` : ''}
          {formatDate(debt.date)}
        </p>
      </div>

      <span className="text-[12px] font-bold font-mono tabular-nums text-rose-500 shrink-0">
        {formatCurrency(debt.amount, debt.currency)}
      </span>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 shrink-0">
        {!debt.paid && (
          <button
            onClick={() => onEdit(debt)}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
        )}
        {confirming ? (
          <>
            <button
              onClick={() => { onDelete(debt.id); setConfirming(false) }}
              className="w-5 h-5 rounded flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Check className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export function PendingDebts({ initialDebts, currency }: PendingDebtsProps) {
  const [debts, setDebts] = useState<Debt[]>(initialDebts)
  const [showAdd, setShowAdd] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)

  const pending = debts.filter((d) => !d.paid)
  const paid    = debts.filter((d) => d.paid)
  const totalPending = pending.reduce((s, d) => d.currency === currency ? s + d.amount : s, 0)

  async function handleMarkPaid(id: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('debts')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) setDebts((prev) => prev.map((d) => d.id === id ? data as Debt : d))
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('debts').delete().eq('id', id)
    setDebts((prev) => prev.filter((d) => d.id !== id))
  }

  function handleAdded(debt: Debt) {
    setDebts((prev) => [debt, ...prev])
    setShowAdd(false)
  }

  function handleEdited(updated: Debt) {
    setDebts((prev) => prev.map((d) => d.id === updated.id ? updated : d))
    setEditingDebt(null)
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-fade-in-up flex flex-col" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-rose-500" />
          <h2 className="text-[11px] font-bold text-muted-foreground tracking-[0.1em] uppercase">Deudas pendientes</h2>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingDebt(null) }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-100"
          title="Agregar deuda"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Total */}
      {pending.length > 0 && (
        <div className="px-4 py-2 bg-rose-500/5 border-b border-rose-500/15 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-rose-500/80">
            <Clock className="w-3 h-3" />
            <span>{pending.length} pendiente{pending.length !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-[12px] font-bold font-mono tabular-nums text-rose-500">
            {formatCurrency(totalPending, currency)}
          </span>
        </div>
      )}

      {/* Rows */}
      <div className="flex flex-col overflow-y-auto max-h-[220px]">
        {debts.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center px-4">
            <CreditCard className="w-7 h-7 text-muted-foreground/30" />
            <p className="text-[12px] text-muted-foreground">Sin deudas registradas</p>
          </div>
        ) : (
          <>
            {pending.map((d) =>
              editingDebt?.id === d.id ? (
                <EditDebtInline
                  key={d.id}
                  debt={d}
                  onSave={handleEdited}
                  onCancel={() => setEditingDebt(null)}
                />
              ) : (
                <DebtRow
                  key={d.id}
                  debt={d}
                  onMarkPaid={handleMarkPaid}
                  onEdit={setEditingDebt}
                  onDelete={handleDelete}
                />
              ),
            )}
            {paid.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider bg-muted/20">
                  Pagadas ({paid.length})
                </div>
                {paid.map((d) => (
                  <DebtRow
                    key={d.id}
                    debt={d}
                    onMarkPaid={handleMarkPaid}
                    onEdit={setEditingDebt}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <AddDebtForm
          currency={currency}
          onSave={handleAdded}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function EditDebtInline({
  debt,
  onSave,
  onCancel,
}: {
  debt: Debt
  onSave: (updated: Debt) => void
  onCancel: () => void
}) {
  const [personName, setPersonName] = useState(debt.person_name)
  const [amount, setAmount] = useState(String(debt.amount))
  const [curr, setCurr] = useState<'ARS' | 'USD'>(debt.currency)
  const [note, setNote] = useState(debt.note ?? '')
  const [date, setDate] = useState(debt.date)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!personName.trim() || !amount || Number(amount) <= 0) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('debts')
      .update({
        person_name: personName.trim(),
        amount: Number(amount),
        currency: curr,
        note: note.trim() || null,
        date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', debt.id)
      .select()
      .single()
    setSaving(false)
    if (data) onSave(data as Debt)
  }

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition-shadow'

  return (
    <div className="p-3 border-b border-border bg-muted/20 flex flex-col gap-2">
      <input className={inputCls} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="A quién le debés" autoFocus />
      <div className="flex gap-2">
        <input className={cn(inputCls, 'flex-1')} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" />
        <select className={cn(inputCls, 'w-20 shrink-0')} value={curr} onChange={(e) => setCurr(e.target.value as 'ARS' | 'USD')}>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" />
      <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-7 text-[11px] rounded-lg">
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-[11px] rounded-lg px-2">
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
