'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Transaction } from '@/lib/types'
import { formatCurrency } from '@/lib/types'
import { CalendarDays, AlertTriangle, X, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

interface MonthAlertsBannerProps {
  allPending: Transaction[]
  currentMonth: string // "YYYY-MM"
  onConfirmCarryover: (months: string[]) => void
}

function getArgentinaDate() {
  const now = new Date()
  const argDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [y, m, d] = argDate.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function monthLabel(ym: string): string {
  const [, m] = ym.split('-').map(Number)
  return MONTH_NAMES[m - 1]
}

// ─── Alert wrapper ──────────────────────────────────────────────────────────

function AlertBanner({
  icon: Icon,
  children,
  onDismiss,
  visible,
}: {
  icon: typeof CalendarDays
  children: React.ReactNode
  onDismiss: () => void
  visible: boolean
}) {
  const [show, setShow] = useState(visible)
  const [fading, setFading] = useState(false)

  useEffect(() => { setShow(visible) }, [visible])

  function handleDismiss() {
    setFading(true)
    setTimeout(() => { setShow(false); onDismiss() }, 150)
  }

  if (!show) return null

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/8 dark:bg-amber-500/5 border border-amber-500/20 border-l-[3px] border-l-amber-500 transition-all duration-200',
        fading ? 'opacity-0 translate-y-[-4px]' : 'animate-fade-in-up',
      )}
    >
      <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
        {children}
      </div>
      <button
        onClick={handleDismiss}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
        title="Cerrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function MonthAlertsBanner({
  allPending,
  currentMonth,
  onConfirmCarryover,
}: MonthAlertsBannerProps) {
  const { day } = getArgentinaDate()
  const [y, m] = currentMonth.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const daysRemaining = daysInMonth - day

  // Dismiss state
  const closingKey = `mfi-closing-alert-dismissed-${currentMonth}-${day}`
  const carryoverKey = `mfi-carryover-alert-dismissed-${currentMonth}`

  const [closingDismissed, setClosingDismissed] = useState(false)
  const [carryoverDismissed, setCarryoverDismissed] = useState(false)

  useEffect(() => {
    try {
      setClosingDismissed(localStorage.getItem(closingKey) === '1')
      setCarryoverDismissed(localStorage.getItem(carryoverKey) === '1')
    } catch {}
  }, [closingKey, carryoverKey])

  // Partition pending by current vs previous months
  const pendingCurrentMonth = allPending.filter((t) => t.date.startsWith(currentMonth))
  const pendingOlderMonths = allPending.filter((t) => !t.date.startsWith(currentMonth))

  const olderMonths = [...new Set(pendingOlderMonths.map((t) => t.date.slice(0, 7)))].sort()
  const isSingleOlderMonth = olderMonths.length === 1

  const olderTotalARS = pendingOlderMonths.filter((t) => t.currency === 'ARS').reduce((s, t) => s + t.amount, 0)
  const olderTotalUSD = pendingOlderMonths.filter((t) => t.currency === 'USD').reduce((s, t) => s + t.amount, 0)

  const currentTotalARS = pendingCurrentMonth.filter((t) => t.currency === 'ARS').reduce((s, t) => s + t.amount, 0)
  const currentTotalUSD = pendingCurrentMonth.filter((t) => t.currency === 'USD').reduce((s, t) => s + t.amount, 0)

  // ── Conditions ──
  const showClosingAlert = daysRemaining <= 5 && pendingCurrentMonth.length > 0 && !closingDismissed
  const showCarryoverAlert = day <= 5 && pendingOlderMonths.length > 0 && !carryoverDismissed

  const dismissClosing = useCallback(() => {
    try { localStorage.setItem(closingKey, '1') } catch {}
    setClosingDismissed(true)
  }, [closingKey])

  const dismissCarryover = useCallback(() => {
    try { localStorage.setItem(carryoverKey, '1') } catch {}
    setCarryoverDismissed(true)
  }, [carryoverKey])

  function handleConfirmCarryover() {
    onConfirmCarryover(olderMonths)
    toast.success(`${pendingOlderMonths.length} gasto${pendingOlderMonths.length !== 1 ? 's' : ''} confirmado${pendingOlderMonths.length !== 1 ? 's' : ''}`)
  }

  function scrollToPending() {
    // Expand the pending bar and scroll to it
    try { localStorage.setItem('mfi-pending-expanded', '1') } catch {}
    window.dispatchEvent(new CustomEvent('expand-pending-bar'))
    const el = document.querySelector('[data-pending-bar]')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function formatPendingTotal(ars: number, usd: number): string {
    const parts: string[] = []
    if (ars > 0) parts.push(formatCurrency(ars, 'ARS'))
    if (usd > 0) parts.push(formatCurrency(usd, 'USD'))
    return parts.join(' + ')
  }

  const isLastDay = daysRemaining === 0
  const currentMonthLabel = monthLabel(currentMonth)

  if (!showCarryoverAlert && !showClosingAlert) return null

  return (
    <div className="flex flex-col gap-2">
      {/* Alert 2 — Carryover (pendientes arrastrados) — goes FIRST (higher priority) */}
      {showCarryoverAlert && (
        <AlertBanner icon={AlertTriangle} onDismiss={dismissCarryover} visible>
          <p className="text-[12px] text-foreground leading-snug">
            Tenés <span className="font-semibold">{pendingOlderMonths.length} gasto{pendingOlderMonths.length !== 1 ? 's' : ''} pendiente{pendingOlderMonths.length !== 1 ? 's' : ''}</span>
            {isSingleOlderMonth
              ? <> de <span className="font-semibold">{monthLabel(olderMonths[0])}</span></>
              : <> de <span className="font-semibold">meses anteriores</span></>
            }
            {' '}por <span className="font-mono font-semibold tabular-nums">{formatPendingTotal(olderTotalARS, olderTotalUSD)}</span> sin confirmar.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleConfirmCarryover}
            className="h-7 rounded-lg text-[11px] font-semibold gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-150 shrink-0"
          >
            <Check className="w-3 h-3" />
            Confirmar todos
          </Button>
        </AlertBanner>
      )}

      {/* Alert 1 — Month closing (últimos 5 días) */}
      {showClosingAlert && (
        <AlertBanner icon={CalendarDays} onDismiss={dismissClosing} visible>
          <p className="text-[12px] text-foreground leading-snug">
            {isLastDay
              ? <><span className="font-semibold">Hoy cierra {currentMonthLabel}.</span></>
              : <>Quedan <span className="font-semibold">{daysRemaining} día{daysRemaining !== 1 ? 's' : ''}</span> para cerrar {currentMonthLabel}.</>
            }
            {' '}Tenés <span className="font-semibold">{pendingCurrentMonth.length} gasto{pendingCurrentMonth.length !== 1 ? 's' : ''} pendiente{pendingCurrentMonth.length !== 1 ? 's' : ''}</span>
            {' '}por <span className="font-mono font-semibold tabular-nums">{formatPendingTotal(currentTotalARS, currentTotalUSD)}</span>.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={scrollToPending}
            className="h-7 rounded-lg text-[11px] font-semibold gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-150 shrink-0"
          >
            <ChevronDown className="w-3 h-3" />
            Revisar pendientes
          </Button>
        </AlertBanner>
      )}
    </div>
  )
}
