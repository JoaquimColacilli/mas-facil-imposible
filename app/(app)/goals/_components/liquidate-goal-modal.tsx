'use client'

import { useState, useEffect } from 'react'
import { Wallet, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Goal, Category } from '@/lib/types'
import { formatCurrency } from '@/lib/types'

interface LiquidateGoalModalProps {
  open: boolean
  onClose: () => void
  goal: Goal | null
  /** Income categories the user can pick from to tag the resulting movement. */
  incomeCategories: Category[]
  onConfirm: (input: {
    goalId: string
    categoryId: string | null
    note: string | null
  }) => Promise<{ error: string | null }>
}

export function LiquidateGoalModal({
  open,
  onClose,
  goal,
  incomeCategories,
  onConfirm,
}: LiquidateGoalModalProps) {
  const [categoryId, setCategoryId] = useState<string>('')
  const [note, setNote] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCategoryId(incomeCategories[0]?.id ?? '')
      setNote('')
      setConfirmText('')
      setError(null)
    }
  }, [open, incomeCategories])

  if (!goal) return null

  const expectedConfirm = formatCurrency(goal.current_amount, goal.currency)
  const canConfirm = confirmText.trim() === expectedConfirm && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!goal || !canConfirm) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await onConfirm({
      goalId: goal.id,
      categoryId: categoryId || null,
      note: note.trim() || null,
    })
    setSubmitting(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            Liquidar meta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-xl bg-muted/40 border border-border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
              Vas a transferir
            </div>
            <div className="font-bold text-foreground font-mono tabular-nums leading-none mt-1" style={{ fontSize: 28 }}>
              {expectedConfirm}
            </div>
            <div className="text-[12px] text-muted-foreground mt-1">
              de “{goal.name}” a tu ledger principal como ingreso.
            </div>
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[12px] text-amber-700 dark:text-amber-400 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              Se crea un movimiento <span className="font-semibold">income</span> con esa cantidad.
              La meta queda en histórico (status “liquidada”). Acción no reversible desde la app.
            </div>
          </div>

          {incomeCategories.length > 0 && (
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                Categoría del movimiento
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
              Nota (opcional)
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Liquidación de meta: ${goal.name}`}
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
              Para confirmar, escribí <span className="font-mono normal-case">{expectedConfirm}</span>
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedConfirm}
              className="h-9 font-mono"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canConfirm} className="gap-1.5">
              <Wallet className="w-4 h-4" />
              {submitting ? 'Liquidando…' : 'Confirmar liquidación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
