'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, TransactionType, Currency } from '@/lib/types'
import { formatCurrency } from '@/lib/types'
import { cn } from '@/lib/utils'
import { liveFormatMoney, parseMoneyInput } from '@/components/money-input'
import {
  ArrowDownLeft, ArrowUpRight, PiggyBank, TrendingUp,
  Check, ChevronDown, X,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPES: { key: TransactionType; label: string; short: string; color: string; bg: string; icon: React.ElementType }[] = [
  { key: 'expense',    label: 'Gasto',     short: 'G', color: 'text-rose-500',    bg: 'bg-rose-500/15',    icon: ArrowUpRight  },
  { key: 'income',     label: 'Ingreso',   short: 'I', color: 'text-emerald-500', bg: 'bg-emerald-500/15', icon: ArrowDownLeft },
  { key: 'savings',    label: 'Ahorro',    short: 'A', color: 'text-sky-500',     bg: 'bg-sky-500/15',     icon: PiggyBank     },
  { key: 'investment', label: 'Inversión', short: 'Inv', color: 'text-violet-500', bg: 'bg-violet-500/15', icon: TrendingUp    },
]

function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  if (iso === t) return 'hoy'
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`
}

// ─── TypePill ────────────────────────────────────────────────────────────────

function TypePill({ value, onChange }: { value: TransactionType; onChange: (t: TransactionType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = TYPES.find(t => t.key === value)!

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        tabIndex={1}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) } }}
        className={cn(
          'flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-semibold border transition-all duration-150 whitespace-nowrap',
          cfg.bg, cfg.color, 'border-current/20 hover:border-current/40',
        )}
      >
        <cfg.icon className="w-3.5 h-3.5" />
        {cfg.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[130px]">
          {TYPES.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => { onChange(t.key); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium hover:bg-muted transition-colors text-left',
                t.key === value && 'bg-muted',
              )}
            >
              <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', t.bg)}>
                <t.icon className={cn('w-3 h-3', t.color)} />
              </div>
              <span className="text-foreground">{t.label}</span>
              {t.key === value && <Check className="w-3 h-3 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MFIQuickEntryProps {
  defaultCurrency?: Currency
  onEntryAdded?: (tx: Transaction) => void
}

export function MFIQuickEntry({ defaultCurrency = 'ARS', onEntryAdded }: MFIQuickEntryProps) {
  const supabase = createClient()
  const [type, setType]         = useState<TransactionType>('expense')
  const [amount, setAmount]     = useState('')
  const [currency, setCurrency] = useState<Currency>(defaultCurrency)
  const [desc, setDesc]         = useState('')
  const [date, setDate]         = useState(todayISO)
  const [saving, setSaving]     = useState(false)
  const [flash, setFlash]       = useState<Transaction | null>(null)
  const [recent, setRecent]     = useState<Transaction[]>([])

  const amountRef = useRef<HTMLInputElement>(null)

  // Focus monto al montar
  useEffect(() => { amountRef.current?.focus() }, [])

  const handleSave = useCallback(async () => {
    const amt = parseMoneyInput(amount)
    if (!amt || amt <= 0) { amountRef.current?.focus(); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data } = await supabase.from('transactions').insert({
      user_id: user.id,
      type,
      amount: amt,
      currency,
      date,
      note: desc.trim() || null,
      status: 'confirmed',
    }).select('*, category:categories(*)').single()

    if (data) {
      const tx = data as Transaction
      setFlash(tx)
      setRecent(prev => [tx, ...prev].slice(0, 8))
      onEntryAdded?.(tx)
      toast.success('Movimiento agregado')
      setTimeout(() => setFlash(null), 2000)
      // Reset (keep type + currency + date)
      setAmount('')
      setDesc('')
      amountRef.current?.focus()
    } else {
      toast.error('No se pudo guardar. Intentá de nuevo.', { duration: 5000 })
    }
    setSaving(false)
  }, [amount, type, currency, date, desc, supabase, onEntryAdded])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  const typeCfg = TYPES.find(t => t.key === type)!

  return (
    <div className="border-b border-border bg-muted/30 px-4 md:px-6 py-3 flex flex-col gap-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
            Modo rápido
          </span>
          <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
            · Tab para avanzar, Enter para guardar
          </span>
        </div>
        {flash && (
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-500 animate-in fade-in slide-in-from-right-2 duration-200">
            <Check className="w-3.5 h-3.5" />
            {formatCurrency(flash.amount, flash.currency)} guardado
          </div>
        )}
      </div>

      {/* Entry row */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Tipo */}
        <TypePill value={type} onChange={setType} />

        {/* Monto */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[120px] max-w-[200px]">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-mono select-none">
              {currency === 'USD' ? 'U$S' : '$'}
            </span>
            <input
              ref={amountRef}
              tabIndex={2}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(liveFormatMoney(e.target.value))}
              onKeyDown={handleKeyDown}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-background text-[13px] font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          {/* Moneda toggle */}
          <button
            type="button"
            tabIndex={3}
            onClick={() => setCurrency(c => c === 'ARS' ? 'USD' : 'ARS')}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-9 px-2.5 rounded-xl border text-[11px] font-bold tracking-wide transition-all shrink-0',
              currency === 'USD'
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground',
            )}
          >
            {currency}
          </button>
        </div>

        {/* Descripción */}
        <input
          tabIndex={4}
          type="text"
          placeholder="Descripción (opcional)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[140px] h-9 px-3 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />

        {/* Fecha */}
        <input
          tabIndex={5}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9 w-[130px] px-3 rounded-xl border border-border bg-background text-[12px] text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shrink-0"
        />

        {/* Save */}
        <button
          tabIndex={6}
          type="button"
          onClick={handleSave}
          disabled={saving || !amount}
          className={cn(
            'h-9 px-4 rounded-xl text-[12px] font-bold transition-all duration-150 shrink-0',
            'disabled:opacity-40',
            amount
              ? cn(typeCfg.bg, typeCfg.color, 'hover:opacity-80')
              : 'bg-muted text-muted-foreground',
          )}
        >
          {saving ? '…' : 'Guardar'}
        </button>
      </div>

      {/* Recent entries (this session) */}
      {recent.length > 0 && (
        <div className="flex flex-col gap-0.5 pt-1 border-t border-border/60">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">
            Últimas entradas
          </p>
          {recent.map((tx) => {
            const cfg = TYPES.find(t => t.key === tx.type)!
            return (
              <div key={tx.id} className="flex items-center gap-3 text-[12px] py-0.5 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', cfg.bg)}>
                  <cfg.icon className={cn('w-3 h-3', cfg.color)} />
                </div>
                <span className="text-muted-foreground w-16 shrink-0">{formatShortDate(tx.date)}</span>
                <span className="flex-1 text-foreground/80 truncate">{tx.note ?? cfg.label}</span>
                <span className={cn('font-mono font-semibold tabular-nums shrink-0', cfg.color)}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
