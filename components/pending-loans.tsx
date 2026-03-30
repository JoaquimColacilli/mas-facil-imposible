'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Loan } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Handshake,
  Plus,
  Check,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  Clock,
} from 'lucide-react'

interface PendingLoansProps {
  initialLoans: Loan[]
  currency: 'ARS' | 'USD'
}

function AddLoanForm({
  currency,
  onSave,
  onCancel,
}: {
  currency: 'ARS' | 'USD'
  onSave: (loan: Loan) => void
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
      .from('loans')
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
    onSave(data as Loan)
  }

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition-shadow'

  return (
    <div className="p-3 border-t border-border bg-muted/20 flex flex-col gap-2">
      <input
        className={inputCls}
        placeholder="Nombre (ej. Martín)"
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

function LoanRow({
  loan,
  onMarkPaid,
  onEdit,
  onDelete,
}: {
  loan: Loan
  onMarkPaid: (id: string) => void
  onEdit: (loan: Loan) => void
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className={cn(
      'group flex items-center gap-2.5 px-3 py-2.5 border-b border-border last:border-0 transition-colors duration-100 hover:bg-muted/20',
      loan.paid && 'opacity-50',
    )}>
      {/* Status dot */}
      <button
        onClick={() => !loan.paid && onMarkPaid(loan.id)}
        title={loan.paid ? 'Cobrado' : 'Marcar como cobrado'}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150',
          loan.paid
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-border hover:border-emerald-500 hover:bg-emerald-500/10',
        )}
      >
        {loan.paid && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-[12.5px] font-semibold text-foreground leading-none truncate', loan.paid && 'line-through')}>
          {loan.person_name}
        </p>
        <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-none truncate">
          {loan.note ? `${loan.note} · ` : ''}
          {formatDate(loan.date)}
        </p>
      </div>

      <span className="text-[12px] font-bold font-mono tabular-nums text-amber-500 shrink-0">
        {formatCurrency(loan.amount, loan.currency)}
      </span>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 shrink-0">
        {!loan.paid && (
          <button
            onClick={() => onEdit(loan)}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
        )}
        {confirming ? (
          <>
            <button
              onClick={() => { onDelete(loan.id); setConfirming(false) }}
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

export function PendingLoans({ initialLoans, currency }: PendingLoansProps) {
  const [loans, setLoans] = useState<Loan[]>(initialLoans)
  const [showAdd, setShowAdd] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)

  const pending = loans.filter((l) => !l.paid)
  const paid    = loans.filter((l) => l.paid)
  const totalPending = pending.reduce((s, l) => l.currency === currency ? s + l.amount : s, 0)

  async function handleMarkPaid(id: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('loans')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) setLoans((prev) => prev.map((l) => l.id === id ? data as Loan : l))
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('loans').delete().eq('id', id)
    setLoans((prev) => prev.filter((l) => l.id !== id))
  }

  function handleAdded(loan: Loan) {
    setLoans((prev) => [loan, ...prev])
    setShowAdd(false)
  }

  function handleEdited(updated: Loan) {
    setLoans((prev) => prev.map((l) => l.id === updated.id ? updated : l))
    setEditingLoan(null)
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-fade-in-up flex flex-col" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Handshake className="w-3.5 h-3.5 text-amber-500" />
          <h2 className="text-[11px] font-bold text-muted-foreground tracking-[0.1em] uppercase">Cobros pendientes</h2>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingLoan(null) }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-100"
          title="Agregar préstamo"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Total */}
      {pending.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/15 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-500/80">
            <Clock className="w-3 h-3" />
            <span>{pending.length} pendiente{pending.length !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-[12px] font-bold font-mono tabular-nums text-amber-500">
            {formatCurrency(totalPending, currency)}
          </span>
        </div>
      )}

      {/* Rows */}
      <div className="flex flex-col overflow-y-auto max-h-[220px]">
        {loans.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center px-4">
            <Handshake className="w-7 h-7 text-muted-foreground/30" />
            <p className="text-[12px] text-muted-foreground">Sin préstamos registrados</p>
          </div>
        ) : (
          <>
            {pending.map((l) =>
              editingLoan?.id === l.id ? (
                <EditLoanInline
                  key={l.id}
                  loan={l}
                  onSave={handleEdited}
                  onCancel={() => setEditingLoan(null)}
                />
              ) : (
                <LoanRow
                  key={l.id}
                  loan={l}
                  onMarkPaid={handleMarkPaid}
                  onEdit={setEditingLoan}
                  onDelete={handleDelete}
                />
              ),
            )}
            {paid.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider bg-muted/20">
                  Cobrados ({paid.length})
                </div>
                {paid.map((l) => (
                  <LoanRow
                    key={l.id}
                    loan={l}
                    onMarkPaid={handleMarkPaid}
                    onEdit={setEditingLoan}
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
        <AddLoanForm
          currency={currency}
          onSave={handleAdded}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function EditLoanInline({
  loan,
  onSave,
  onCancel,
}: {
  loan: Loan
  onSave: (updated: Loan) => void
  onCancel: () => void
}) {
  const [personName, setPersonName] = useState(loan.person_name)
  const [amount, setAmount] = useState(String(loan.amount))
  const [curr, setCurr] = useState<'ARS' | 'USD'>(loan.currency)
  const [note, setNote] = useState(loan.note ?? '')
  const [date, setDate] = useState(loan.date)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!personName.trim() || !amount || Number(amount) <= 0) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('loans')
      .update({
        person_name: personName.trim(),
        amount: Number(amount),
        currency: curr,
        note: note.trim() || null,
        date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loan.id)
      .select()
      .single()
    setSaving(false)
    if (data) onSave(data as Loan)
  }

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition-shadow'

  return (
    <div className="p-3 border-b border-border bg-muted/20 flex flex-col gap-2">
      <input className={inputCls} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Nombre" autoFocus />
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
