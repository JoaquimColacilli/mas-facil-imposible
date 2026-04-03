'use client'

import { useState, useEffect, useRef } from 'react'
import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlertTriangle, ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const EXPANDED_KEY = 'mfi-pending-expanded'

interface PendingTransactionsBarProps {
  transactions: Transaction[]
  currentMonth: string
  onConfirmOne: (id: string) => void
  onConfirmAll: () => void
}

export function PendingTransactionsBar({
  transactions,
  currentMonth,
  onConfirmOne,
  onConfirmAll,
}: PendingTransactionsBarProps) {
  const pending = transactions.filter((t) => t.status === 'pending')

  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(EXPANDED_KEY) === '1' } catch { return false }
  })
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set())
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    try { localStorage.setItem(EXPANDED_KEY, expanded ? '1' : '0') } catch {}
  }, [expanded])

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [pending.length, expanded])

  if (pending.length === 0) return null

  const totalARS = pending.filter((t) => t.currency === 'ARS').reduce((s, t) => s + t.amount, 0)
  const totalUSD = pending.filter((t) => t.currency === 'USD').reduce((s, t) => s + t.amount, 0)

  function formatTotal() {
    const parts: string[] = []
    if (totalARS > 0) parts.push(formatCurrency(totalARS, 'ARS'))
    if (totalUSD > 0) parts.push(formatCurrency(totalUSD, 'USD'))
    return parts.join(' · ')
  }

  function handleConfirmOne(tx: Transaction) {
    setFadingOut((prev) => new Set(prev).add(tx.id))
    const name = tx.note ?? tx.category?.name ?? 'Movimiento'
    setTimeout(() => {
      onConfirmOne(tx.id)
      setFadingOut((prev) => { const n = new Set(prev); n.delete(tx.id); return n })
      toast.success(`${name} marcado como pagado`)
    }, 300)
  }

  function handleConfirmAll() {
    setConfirmAllOpen(false)
    onConfirmAll()
    toast.success(`${pending.length} gasto${pending.length !== 1 ? 's' : ''} marcado${pending.length !== 1 ? 's' : ''} como pagado${pending.length !== 1 ? 's' : ''}`)
  }

  const isSingle = pending.length === 1
  const single = isSingle ? pending[0] : null

  return (
    <div className="bg-amber-500/8 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden animate-fade-in-up">
      {/* Summary bar */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left group transition-colors duration-100 hover:bg-amber-500/5"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-foreground leading-none truncate">
            {isSingle
              ? (single!.note ?? single!.category?.name ?? 'Gasto pendiente')
              : `${pending.length} gastos pendientes`}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums">
            {isSingle ? formatCurrency(single!.amount, single!.currency) : formatTotal()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isSingle ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConfirmOne(single!)}
              className="h-7 rounded-lg text-[11px] font-semibold gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-150"
            >
              <Check className="w-3 h-3" />
              Confirmar
            </Button>
          ) : (
            <Popover open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg text-[11px] font-semibold gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-150"
                >
                  <Check className="w-3 h-3" />
                  Confirmar todos
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4 rounded-xl" align="end">
                <p className="text-[13px] font-semibold text-foreground mb-1">
                  ¿Confirmar {pending.length} gastos pendientes?
                </p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Se marcarán como pagados.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmAllOpen(false)}
                    className="flex-1 h-8 rounded-lg text-[11px]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmAll}
                    className="flex-1 h-8 rounded-lg text-[11px] font-semibold"
                  >
                    Confirmar todos
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {/* Expanded list */}
      <div
        style={{ height: expanded ? contentHeight : 0 }}
        className="transition-[height] duration-300 ease-in-out overflow-hidden"
      >
        <div ref={contentRef} className="border-t border-amber-500/15">
          {pending.map((tx) => (
            <div
              key={tx.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 transition-all duration-300 hover:bg-amber-500/5 group/row',
                fadingOut.has(tx.id) && 'opacity-0 h-0 py-0 overflow-hidden',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-foreground truncate leading-none">
                  {tx.note ?? tx.category?.name ?? 'Sin descripción'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                  {tx.category?.name && tx.note ? `${tx.category.name} · ` : ''}
                  {formatDate(tx.date)}
                </p>
              </div>
              <span className="text-[12px] font-bold tabular-nums font-mono text-rose-500 shrink-0">
                −{formatCurrency(tx.amount, tx.currency)}
              </span>
              <button
                onClick={() => handleConfirmOne(tx)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-amber-500 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-100 shrink-0"
                title="Confirmar"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
