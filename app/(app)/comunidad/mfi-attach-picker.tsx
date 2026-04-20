'use client'

import { useEffect, useState } from 'react'
import { Receipt, Target, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency,
  type CommunityPostEmbed,
  type Currency,
} from '@/lib/types'
import { MfiEmbed } from './mfi-embed'

interface Props {
  onSelect: (embed: CommunityPostEmbed) => void
  onClose: () => void
}

type TxnRow = {
  id: string
  amount: number
  currency: Currency
  date: string
  note: string | null
  type: string
  category: { name: string } | null
}

type GoalRow = {
  id: string
  name: string
  current_amount: number
  target_amount: number
  currency: Currency
  created_at: string
  deadline: string | null
}

function monthsBetween(startIso: string, endIso: string | null): number {
  const start = new Date(startIso)
  const end = endIso ? new Date(endIso) : new Date()
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()),
  )
}

function txnToEmbed(t: TxnRow): CommunityPostEmbed {
  const title = t.note?.trim() || t.category?.name || 'Movimiento'
  return {
    kind: 'txn',
    target_id: t.id,
    title,
    amount: Number(t.amount),
    currency: t.currency,
    category: t.category?.name ?? null,
    date: t.date,
  }
}

function goalToEmbed(g: GoalRow): CommunityPostEmbed {
  const now = new Date().toISOString()
  const months = monthsBetween(g.created_at, now)
  const total = g.deadline ? monthsBetween(g.created_at, g.deadline) : undefined
  return {
    kind: 'goal',
    target_id: g.id,
    title: g.name,
    current_amount: Number(g.current_amount),
    target_amount: Number(g.target_amount),
    currency: g.currency,
    months,
    total_months: total,
  }
}

export function MfiAttachPicker({ onSelect }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [txns, setTxns] = useState<TxnRow[]>([])
  const [goals, setGoals] = useState<GoalRow[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const [txnRes, goalRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, amount, currency, date, note, type, category:categories(name)')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .order('date', { ascending: false })
          .limit(10),
        supabase
          .from('goals')
          .select(
            'id, name, current_amount, target_amount, currency, created_at, deadline',
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      if (cancelled) return
      setTxns((txnRes.data as unknown as TxnRow[] | null) ?? [])
      setGoals((goalRes.data as GoalRow[] | null) ?? [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  return (
    <div className="rounded-xl border border-border bg-popover text-popover-foreground p-3 shadow-lg w-80">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Adjuntar desde MFI
      </div>
      {loading ? (
        <div className="py-8 grid place-items-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : txns.length === 0 && goals.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No hay movimientos ni metas para adjuntar.
        </div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {goals.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5">
                <Target className="w-3 h-3" />
                Metas activas
              </div>
              <div className="space-y-1.5">
                {goals.map((g) => {
                  const embed = goalToEmbed(g)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onSelect(embed)}
                      className="w-full text-left rounded-lg hover:bg-muted transition-colors p-1"
                    >
                      <MfiEmbed data={embed} variant="compact" />
                    </button>
                  )
                })}
              </div>
            </section>
          )}
          {txns.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5">
                <Receipt className="w-3 h-3" />
                Movimientos recientes
              </div>
              <div className="space-y-1.5">
                {txns.map((t) => {
                  const embed = txnToEmbed(t)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelect(embed)}
                      className="w-full text-left rounded-lg hover:bg-muted transition-colors p-1"
                    >
                      <div className="rounded-lg border border-border bg-muted/40 p-2.5 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-muted text-muted-foreground">
                          <Receipt className="w-4 h-4" strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {t.category?.name ?? 'Sin categoría'}
                          </div>
                          <div className="font-medium text-sm truncate">
                            {embed.title}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm text-foreground">
                            {formatCurrency(Number(t.amount), t.currency)}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
