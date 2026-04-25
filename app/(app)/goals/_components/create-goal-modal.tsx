'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Check, Lock, Flag, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { CATEGORY_LIST, CATEGORY_META } from '@/lib/goals'
import type { Goal, GoalCategory, Currency } from '@/lib/types'
import { formatCurrency } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CatBadge } from './primitives/cat-badge'
import { ProgressBar } from './primitives/progress-bar'
import type { GoalTemplate } from './empty-state'

export interface CreateModalSubmit {
  name: string
  category: GoalCategory
  currency: Currency
  target_amount: number
  current_amount: number
  deadline: string | null
  monthly_target: number | null
  note: string | null
  auto: { enabled: boolean; amount: number | null; day: number | null }
}

interface CreateGoalModalProps {
  open: boolean
  onClose: () => void
  /** Pre-fill from a template (Empty state cards) or an existing goal (Edit). */
  template?: GoalTemplate | null
  editing?: Goal | null
  onSubmit: (input: CreateModalSubmit) => Promise<{ error: string | null }>
}

export function CreateGoalModal({
  open,
  onClose,
  template,
  editing,
  onSubmit,
}: CreateGoalModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<GoalCategory>('otro')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [targetStr, setTargetStr] = useState('')
  const [currentStr, setCurrentStr] = useState('')
  const [deadline, setDeadline] = useState('')
  const [monthlyStr, setMonthlyStr] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setCategory(editing.category)
      setCurrency(editing.currency)
      setTargetStr(formatMoneyInput(editing.target_amount))
      setCurrentStr(formatMoneyInput(editing.current_amount))
      setDeadline(editing.deadline ?? '')
      setMonthlyStr(editing.monthly_target ? formatMoneyInput(editing.monthly_target) : '')
      setNote(editing.note ?? '')
    } else if (template) {
      setName(template.prefill.name)
      setCategory(template.prefill.category)
      setCurrency(template.prefill.currency)
      setTargetStr(formatMoneyInput(template.prefill.target_amount))
      setCurrentStr('')
      const d = new Date()
      d.setMonth(d.getMonth() + template.prefill.monthsToDeadline)
      setDeadline(d.toISOString().slice(0, 10))
      setMonthlyStr(formatMoneyInput(template.prefill.monthly_target))
      setNote('')
    } else {
      setName('')
      setCategory('otro')
      setCurrency('USD')
      setTargetStr('')
      setCurrentStr('')
      setDeadline('')
      setMonthlyStr('')
      setNote('')
    }
    setError(null)
  }, [open, template, editing])

  const target = parseMoneyInput(targetStr)
  const current = parseMoneyInput(currentStr)
  const monthly = parseMoneyInput(monthlyStr)

  const previewPct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const etaMonths =
    monthly > 0 && target > 0
      ? Math.ceil(Math.max(0, target - current) / monthly)
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (target <= 0) {
      setError('El objetivo debe ser mayor que 0.')
      return
    }
    if (deadline) {
      const d = new Date(deadline + 'T00:00:00')
      if (Number.isNaN(d.getTime())) {
        setError('Fecha límite inválida.')
        return
      }
      if (!editing && d.getTime() < Date.now() - 86400000) {
        setError('La fecha límite debe ser futura.')
        return
      }
    }

    setSubmitting(true)
    const { error: err } = await onSubmit({
      name: name.trim(),
      category,
      currency,
      target_amount: target,
      current_amount: current,
      deadline: deadline || null,
      monthly_target: monthly > 0 ? monthly : null,
      note: note.trim() || null,
      // Auto-débito disabled hasta PR 4.
      auto: { enabled: false, amount: null, day: null },
    })
    setSubmitting(false)
    if (err) setError(err)
    else onClose()
  }

  const meta = CATEGORY_META[category]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
            {editing ? 'Editar meta' : 'Nueva meta'}
          </div>
          <DialogTitle className="text-[18px] font-semibold">
            {editing ? editing.name : '¿Para qué estás ahorrando?'}
          </DialogTitle>
        </DialogHeader>

        {/* Preview banner — sticky horizontal compacto. Reemplaza la
             columna de preview separada (que dejaba whitespace al ser
             más corta que el form). */}
        <div className="px-5 pt-4 pb-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <CatBadge category={category} size={42} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-foreground truncate">
                  {name.trim() || 'Sin título'}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {meta.label}
                  {deadline && (
                    <> · {new Date(deadline + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                  )}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-bold text-foreground font-mono tabular-nums" style={{ fontSize: 22 }}>
                  {formatCurrency(target, currency)}
                </span>
                <span className="text-[12px] text-muted-foreground font-mono">
                  objetivo
                  {current > 0 && <> · {previewPct}% inicial</>}
                </span>
              </div>
            </div>
            {etaMonths != null && Number.isFinite(etaMonths) && (
              <div className="hidden sm:flex flex-col items-end shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <div className="text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">
                  Llegás en
                </div>
                <div className="font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums leading-none mt-0.5" style={{ fontSize: 18 }}>
                  {etaMonths}
                  <span className="text-[11px] font-medium ml-1">{etaMonths === 1 ? 'mes' : 'meses'}</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3">
            <ProgressBar pct={previewPct} tone="emerald" height={6} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {/* Nombre */}
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                Nombre
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Bariloche en julio"
                required
                autoFocus={!editing}
                className="h-10"
              />
            </div>

            {/* Tipo */}
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                Tipo
              </Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_LIST.map((c) => {
                  const Icon = c.icon
                  const active = category === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-medium transition',
                        active
                          ? 'border-transparent text-white'
                          : 'border-border text-foreground hover:bg-muted',
                      )}
                      style={active ? { background: c.color } : {}}
                      aria-pressed={active}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Moneda + Monto objetivo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Moneda
                </Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ARS">ARS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Monto objetivo
                </Label>
                <MoneyInput value={targetStr} onChange={setTargetStr} placeholder="0" required className="h-10" />
              </div>
            </div>

            {/* Monto inicial — solo en creación */}
            {!editing && (
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Monto inicial (opcional)
                </Label>
                <MoneyInput value={currentStr} onChange={setCurrentStr} placeholder="0" className="h-10" />
              </div>
            )}

            {/* Fecha + aporte mensual */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Fecha límite
                </Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Aporte mensual sugerido
                </Label>
                <MoneyInput value={monthlyStr} onChange={setMonthlyStr} placeholder="0" className="h-10" />
              </div>
            </div>

            {/* Hitos del recorrido — solo cuando hay objetivo */}
            {target > 0 && (
              <div className="rounded-xl bg-muted/30 border border-border p-4">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
                  <Flag className="w-3 h-3" />
                  Hitos del recorrido
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((p) => {
                    const reached = current > 0 && (current / target) * 100 >= p
                    return (
                      <div
                        key={p}
                        className={cn(
                          'rounded-lg p-2 text-center border transition',
                          reached
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-background border-border',
                        )}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={cn(
                              'inline-grid place-items-center w-4 h-4 rounded-full text-[8px] font-bold',
                              reached
                                ? 'bg-emerald-500 text-white'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {reached ? <Check className="w-2.5 h-2.5" /> : p}
                          </span>
                          <span className={cn('text-[10px] font-mono', reached ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-muted-foreground')}>
                            {p}%
                          </span>
                        </div>
                        <div className="text-[11px] font-mono tabular-nums mt-1 text-foreground">
                          {formatCurrency((target * p) / 100, currency)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Auto-débito DISABLED — bloque visualmente claro */}
            <DisabledAutoBlock />

            {/* Nota */}
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                Nota (opcional)
              </Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Por qué esta meta importa"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 resize-none"
              />
            </div>

            {/* Tip contextual al final, da un cierre coherente al modal */}
            <PreviewTip
              hasName={!!name.trim()}
              hasTarget={target > 0}
              hasMonthly={monthly > 0}
              hasDeadline={!!deadline}
            />

            {error && (
              <div className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-card flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              <Check className="w-4 h-4" />
              {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Auto-débito disabled block ─────────────────────────────────────────────
//
// Visually unmistakable: amber border, amber locked badge, dimmed body, no
// hover affordance on the toggle. The user told us they couldn't see the
// previous "subtle" disabled state, so this is loud on purpose.

function DisabledAutoBlock() {
  return (
    <div className="relative rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-4">
      <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
        <Lock className="w-3 h-3" />
        Próximamente
      </div>
      <div className="flex items-start gap-3 opacity-70 pointer-events-none">
        <div className="w-9 h-5 rounded-full bg-muted/80 shrink-0 mt-0.5 grid place-items-start p-0.5">
          <div className="w-4 h-4 rounded-full bg-foreground/40" />
        </div>
        <div className="flex-1 leading-tight">
          <div className="font-semibold text-[13px] text-foreground">Ahorro automático</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Vas a poder elegir un monto y un día del mes para que MFI lo separe automáticamente
            desde una cuenta de origen. El cron real entra en una próxima versión.
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
        <Info className="w-3 h-3 shrink-0" />
        <span>Por ahora podés depositar manualmente desde la card o desde el detalle de la meta.</span>
      </div>
    </div>
  )
}

// ─── Preview tip ────────────────────────────────────────────────────────────
//
// One-liner that adapts to what the user has filled in.

function PreviewTip({
  hasName,
  hasTarget,
  hasMonthly,
  hasDeadline,
}: {
  hasName: boolean
  hasTarget: boolean
  hasMonthly: boolean
  hasDeadline: boolean
}) {
  let text: string
  if (!hasName) text = 'Empezá por darle un nombre claro — eso te ata más a la meta.'
  else if (!hasTarget) text = 'Definí el monto objetivo para ver los hitos del recorrido.'
  else if (!hasMonthly && hasDeadline) text = 'Sumá un aporte mensual sugerido y MFI te avisa si vas en ritmo.'
  else if (!hasDeadline) text = 'Sin fecha límite, vas a tu propio ritmo. Podés agregar una cuando quieras.'
  else text = 'Listo para crear. Vas a ver el progreso en /metas y en el dashboard.'

  return (
    <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-[12px] text-muted-foreground flex items-start gap-2" style={{ textWrap: 'pretty' as never }}>
      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
      <span>{text}</span>
    </div>
  )
}
