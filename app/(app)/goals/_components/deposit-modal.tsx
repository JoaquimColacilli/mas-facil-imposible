'use client'

import { useState, useEffect } from 'react'
import { Plus, PartyPopper } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput, parseMoneyInput } from '@/components/money-input'
import type { Goal } from '@/lib/types'
import { formatCurrency } from '@/lib/types'

interface DepositModalProps {
  open: boolean
  onClose: () => void
  goal: Goal | null
  onConfirm: (input: {
    goal: Goal
    amount: number
    note: string | null
    date: string
  }) => Promise<{ error: string | null }>
}

export function DepositModal({ open, onClose, goal, onConfirm }: DepositModalProps) {
  const [amountStr, setAmountStr] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completedView, setCompletedView] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAmountStr('')
      setNote('')
      setDate(new Date().toISOString().slice(0, 10))
      setCompletedView(false)
      setError(null)
    }
  }, [open])

  if (!goal) return null

  const amount = parseMoneyInput(amountStr)
  const remaining = Math.max(0, goal.target_amount - goal.current_amount)
  const wouldComplete = amount > 0 && goal.current_amount + amount >= goal.target_amount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!goal || amount <= 0) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await onConfirm({
      goal,
      amount,
      note: note.trim() || null,
      date,
    })
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    if (wouldComplete) {
      setCompletedView(true)
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        {completedView ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <PartyPopper className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Meta cumplida</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Alcanzaste tu objetivo de {formatCurrency(goal.target_amount, goal.currency)} en
                “{goal.name}”. Ahora podés liquidarla a tu cuenta cuando quieras.
              </p>
            </div>
            <Button onClick={onClose} className="w-full h-9">Cerrar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-[15px] font-semibold">
                Depositar a {goal.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Saldo actual</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(goal.current_amount, goal.currency)}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Falta</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(remaining, goal.currency)}
                </span>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Monto a depositar
                </Label>
                <MoneyInput value={amountStr} onChange={setAmountStr} placeholder="0" autoFocus className="h-10" />
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Fecha
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 font-mono"
                />
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Nota (opcional)
                </Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-9" placeholder={`Aporte a ${goal.name}`} />
              </div>

              {wouldComplete && (
                <p className="text-[11px] text-emerald-600 font-medium bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
                  Este depósito completa la meta. Se marca como cumplida automáticamente.
                </p>
              )}

              {error && (
                <div className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={submitting || amount <= 0} className="w-full h-10 gap-1.5">
                <Plus className="w-4 h-4" />
                {submitting ? 'Depositando…' : 'Depositar'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
