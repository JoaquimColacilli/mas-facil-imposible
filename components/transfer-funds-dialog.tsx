'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftRight, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput, parseMoneyInput } from '@/components/money-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BucketRef, Currency, Portfolio, Goal } from '@/lib/types'
import { formatCurrency } from '@/lib/types'
import { createTransfer } from '@/app/(app)/transactions/actions'
import { cn } from '@/lib/utils'

interface TransferFundsDialogProps {
  cumulativeSavings: { ARS: number; USD: number }
  portfolios: Portfolio[]
  /** Metas con status 'active' o 'completed' (no 'liquidated'). */
  transferableGoals: Goal[]
  onClose: () => void
  onSuccess?: () => void
}

type BucketOptionKind = 'general' | 'savings_ARS' | 'savings_USD' | `portfolio:${string}` | `goal:${string}`

interface BucketOption {
  key: BucketOptionKind
  ref: BucketRef
  label: string
  /** null = sin saldo materializado (general). */
  balance: { amount: number; currency: Currency } | null
  /** null = currency abierta (general / no aplica). */
  fixedCurrency: Currency | null
  /** Para metas: muestra "X / Y" en lugar del simple amount. */
  goalProgress?: { current: number; target: number; currency: Currency }
}

function buildBuckets(
  cumulativeSavings: { ARS: number; USD: number },
  portfolios: Portfolio[],
  goals: Goal[],
): BucketOption[] {
  const buckets: BucketOption[] = [
    { key: 'general', ref: { kind: 'general' }, label: 'Cuenta general', balance: null, fixedCurrency: null },
  ]
  // Ahorros se modela como dos buckets — ARS y USD — porque el usuario
  // elige currency al transferir. Tratarlo como un solo bucket con toggle
  // confunde cuando el bucket destino tiene currency fija.
  buckets.push({
    key: 'savings_ARS',
    ref: { kind: 'savings' },
    label: 'Ahorros',
    balance: { amount: cumulativeSavings.ARS, currency: 'ARS' },
    fixedCurrency: 'ARS',
  })
  buckets.push({
    key: 'savings_USD',
    ref: { kind: 'savings' },
    label: 'Ahorros',
    balance: { amount: cumulativeSavings.USD, currency: 'USD' },
    fixedCurrency: 'USD',
  })
  for (const p of portfolios) {
    buckets.push({
      key: `portfolio:${p.id}`,
      ref: { kind: 'portfolio', id: p.id },
      label: p.name,
      balance: { amount: Number(p.balance), currency: p.currency },
      fixedCurrency: p.currency,
    })
  }
  for (const g of goals) {
    buckets.push({
      key: `goal:${g.id}`,
      ref: { kind: 'goal', id: g.id },
      label: `Meta: ${g.name}`,
      balance: { amount: g.current_amount, currency: g.currency },
      fixedCurrency: g.currency,
      goalProgress: { current: g.current_amount, target: g.target_amount, currency: g.currency },
    })
  }
  return buckets
}

function bucketSubtitle(opt: BucketOption): string | null {
  if (opt.key === 'general') return null
  if (opt.goalProgress) {
    const { current, target, currency } = opt.goalProgress
    return `${formatCurrency(current, currency)} / ${formatCurrency(target, currency)}`
  }
  if (opt.balance) {
    return formatCurrency(opt.balance.amount, opt.balance.currency)
  }
  return null
}

const ERROR_COPY: Record<string, string> = {
  unauthenticated: 'No estás autenticado. Probá iniciar sesión de nuevo.',
  invalid_amount: 'Ingresá un monto válido.',
  same_bucket: 'El origen y el destino tienen que ser distintos.',
  currency_mismatch: 'Las monedas del origen y el destino no coinciden.',
  invalid_bucket: 'Hubo un problema con el origen o el destino.',
  goal_liquidated: 'No podés transferir desde o hacia una meta liquidada.',
  unknown: 'No pudimos registrar la transferencia. Probá de nuevo.',
}

export function TransferFundsDialog({
  cumulativeSavings,
  portfolios,
  transferableGoals,
  onClose,
  onSuccess,
}: TransferFundsDialogProps) {
  const buckets = useMemo(
    () => buildBuckets(cumulativeSavings, portfolios, transferableGoals),
    [cumulativeSavings, portfolios, transferableGoals],
  )
  const [fromKey, setFromKey] = useState<BucketOptionKind>('general')
  const [toKey, setToKey] = useState<BucketOptionKind>('savings_ARS')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromBucket = buckets.find((b) => b.key === fromKey) ?? buckets[0]
  const toBucket = buckets.find((b) => b.key === toKey) ?? buckets[1]

  // Determinar currency efectivo. Si alguno de los dos tiene currency fija,
  // gana esa. Si ambos fijan currency y difieren, ya estamos en mismatch.
  const effectiveCurrency: Currency = fromBucket.fixedCurrency ?? toBucket.fixedCurrency ?? currency
  const currencyMismatch =
    fromBucket.fixedCurrency != null &&
    toBucket.fixedCurrency != null &&
    fromBucket.fixedCurrency !== toBucket.fixedCurrency

  // Toggle de currency disponible solo si NINGÚN bucket fija el currency
  // (general → general no llega acá porque same_bucket lo bloquea, pero
  // general → general distinto-currency es teóricamente posible — V1 lo
  // permite con toggle).
  const showCurrencyToggle = fromBucket.fixedCurrency == null && toBucket.fixedCurrency == null

  // Warning de saldo: solo cuando el origen tiene balance materializado.
  const numericAmount = parseMoneyInput(amount)
  const wouldGoNegative =
    fromBucket.balance != null &&
    fromBucket.balance.currency === effectiveCurrency &&
    numericAmount > 0 &&
    fromBucket.balance.amount - numericAmount < 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (currencyMismatch) {
      setError(ERROR_COPY.currency_mismatch)
      return
    }
    if (!numericAmount || numericAmount <= 0) {
      setError(ERROR_COPY.invalid_amount)
      return
    }
    setLoading(true)
    const result = await createTransfer({
      from: fromBucket.ref,
      to: toBucket.ref,
      amount: numericAmount,
      currency: effectiveCurrency,
      date,
      note: note.trim() || null,
    })
    setLoading(false)
    if (!result.ok) {
      const code = result.error ?? 'unknown'
      setError(ERROR_COPY[code] ?? ERROR_COPY.unknown)
      toast.error(ERROR_COPY[code] ?? ERROR_COPY.unknown, { duration: 5000 })
      return
    }
    toast.success('Transferencia registrada')
    onSuccess?.()
    onClose()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl z-10 animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 flex flex-col max-h-[90dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-500" />
            Transferir fondos
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-6 pb-6">
          {/* Origen */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">
              Origen
            </Label>
            <Select value={fromKey} onValueChange={(v) => setFromKey(v as BucketOptionKind)} disabled={loading}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[110]">
                {buckets.map((b) => (
                  <SelectItem key={`from-${b.key}`} value={b.key}>
                    <BucketRow opt={b} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destino */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">
              Destino
            </Label>
            <Select value={toKey} onValueChange={(v) => setToKey(v as BucketOptionKind)} disabled={loading}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[110]">
                {buckets
                  .filter((b) => b.key !== fromKey)
                  .map((b) => (
                    <SelectItem key={`to-${b.key}`} value={b.key}>
                      <BucketRow opt={b} />
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {currencyMismatch && (
            <p className="text-[12px] text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              Las monedas del origen ({fromBucket.fixedCurrency}) y el destino ({toBucket.fixedCurrency}) no coinciden. Por ahora solo se permiten transferencias en la misma moneda.
            </p>
          )}

          {/* Monto + Currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="transfer-amount" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">
                Monto
              </Label>
              <MoneyInput
                id="transfer-amount"
                placeholder="0,00"
                value={amount}
                onChange={setAmount}
                required
                className="h-10 text-base font-mono font-semibold tabular-nums rounded-xl"
                autoFocus
              />
            </div>
            <div className="w-24">
              <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">
                Moneda
              </Label>
              {showCurrencyToggle ? (
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)} disabled={loading}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 rounded-xl border border-input bg-muted/40 flex items-center justify-center text-[13px] font-semibold text-muted-foreground">
                  {effectiveCurrency}
                </div>
              )}
            </div>
          </div>

          {wouldGoNegative && fromBucket.balance && (
            <p className="text-[11.5px] text-amber-600 dark:text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              Después de esta transferencia, {fromBucket.label} quedaría en {formatCurrency(fromBucket.balance.amount - numericAmount, fromBucket.balance.currency)}. La transferencia se registra igual.
            </p>
          )}

          {/* Fecha */}
          <div>
            <Label htmlFor="transfer-date" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">
              Fecha
            </Label>
            <Input
              id="transfer-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={loading}
              className="h-10 rounded-xl"
            />
          </div>

          {/* Nota */}
          <div>
            <Label htmlFor="transfer-note" className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">
              Nota (opcional)
            </Label>
            <Input
              id="transfer-note"
              placeholder="Ej: Plata para el viaje, mes 4"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              className="h-10 rounded-xl"
            />
          </div>

          {error && !currencyMismatch && (
            <p className="text-[12px] text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || currencyMismatch}
            className="h-11 w-full rounded-xl font-semibold transition-all duration-150 hover:scale-[1.01] hover:shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              'Transferir'
            )}
          </Button>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function BucketRow({ opt }: { opt: BucketOption }) {
  const subtitle = bucketSubtitle(opt)
  return (
    <div className="flex items-center justify-between gap-3 w-full min-w-0">
      <span className="truncate text-foreground">{opt.label}</span>
      {subtitle && (
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
          {subtitle}
        </span>
      )}
    </div>
  )
}
