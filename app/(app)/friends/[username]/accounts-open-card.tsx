import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { decryptRow } from '@/lib/crypto'
import { formatCurrency } from '@/lib/types'
import type { Loan, Debt, Currency } from '@/lib/types'

interface AccountsOpenCardProps {
  viewerId: string
  peerId: string
  peerUsername: string | null
}

/**
 * Resumen de loans/debts abiertos entre el viewer y el peer.
 *
 * Reglas del §11.6:
 *   - Solo mostrar montos del viewer (sus loans.friend_id=peer y debts.friend_id=peer).
 *   - Nunca leer montos del peer. Del peer solo se expone la existencia del
 *     linked_*_id (booleano "está vinculado") via los registros propios.
 *   - Sin tab ni navigation: una card inline abajo del "Actividad".
 */
export async function AccountsOpenCard({
  viewerId,
  peerId,
  peerUsername,
}: AccountsOpenCardProps) {
  const supabase = await createClient()

  // RLS ya filtra por user_id = viewerId via auth.uid() policy.
  const [{ data: loansRaw }, { data: debtsRaw }] = await Promise.all([
    supabase.from('loans').select().eq('user_id', viewerId).eq('friend_id', peerId).eq('paid', false),
    supabase.from('debts').select().eq('user_id', viewerId).eq('friend_id', peerId).eq('paid', false),
  ])

  const loans = ((loansRaw ?? []) as any[]).map((r) => decryptRow(r) as Loan)
  const debts = ((debtsRaw ?? []) as any[]).map((r) => decryptRow(r) as Debt)

  if (loans.length === 0 && debts.length === 0) return null

  // Totales por currency — no mezclamos ARS y USD.
  const totals = {
    loans: sumByCurrency(loans),
    debts: sumByCurrency(debts),
  }

  const name = peerUsername ? `@${peerUsername}` : 'este amigo'

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-foreground">
          Cuentas abiertas con {name}
        </CardTitle>
        <Link
          href="/dashboard"
          className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          Ver en dashboard →
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loans.length > 0 && (
          <AccountRow
            label={`${name} te debe`}
            count={loans.length}
            totals={totals.loans}
            tone="amber"
          />
        )}
        {debts.length > 0 && (
          <AccountRow
            label={`Le debés a ${name}`}
            count={debts.length}
            totals={totals.debts}
            tone="rose"
          />
        )}
      </CardContent>
    </Card>
  )
}

function AccountRow({
  label,
  count,
  totals,
  tone,
}: {
  label: string
  count: number
  totals: Partial<Record<Currency, number>>
  tone: 'amber' | 'rose'
}) {
  const color = tone === 'amber' ? 'text-amber-500' : 'text-rose-500'
  const entries = Object.entries(totals) as [Currency, number][]
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground leading-tight">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {count} registro{count !== 1 ? 's' : ''} pendiente{count !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {entries.map(([cur, amt]) => (
          <span key={cur} className={`text-[12.5px] font-bold font-mono tabular-nums ${color}`}>
            {formatCurrency(amt, cur)}
          </span>
        ))}
      </div>
    </div>
  )
}

function sumByCurrency(rows: { amount: number; currency: Currency }[]): Partial<Record<Currency, number>> {
  const out: Partial<Record<Currency, number>> = {}
  for (const r of rows) {
    out[r.currency] = (out[r.currency] ?? 0) + r.amount
  }
  return out
}
