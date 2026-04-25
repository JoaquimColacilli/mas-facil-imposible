'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_NAMES_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

interface MonthPickerProps {
  /** YYYY-MM */
  value: string
  onChange: (monthKey: string) => void
  /** YYYY-MM inclusive */
  minMonth?: string
  /** YYYY-MM inclusive. Default: mes actual (no permite futuros). */
  maxMonth?: string
  align?: 'start' | 'center' | 'end'
  disabled?: boolean
}

export function MonthPicker({ value, onChange, minMonth, maxMonth, align = 'start', disabled = false }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => Number(value.split('-')[0]))

  const now = new Date()
  const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const effectiveMax = maxMonth ?? null

  const minYear = minMonth ? Number(minMonth.split('-')[0]) : -Infinity
  const maxYear = effectiveMax ? Number(effectiveMax.split('-')[0]) : Infinity

  const [valueY, valueM] = value.split('-').map(Number)
  const triggerLabel = `${MONTH_NAMES_LONG[valueM - 1]} ${valueY}`

  function pick(ym: string) {
    setOpen(false)
    onChange(ym)
  }

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-2 h-10 px-3 rounded-xl border text-[13px] font-medium transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-ring/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            open
              ? 'bg-foreground text-background border-foreground shadow-sm'
              : 'bg-background border-border text-foreground hover:bg-muted/40 hover:border-ring',
          )}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{triggerLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-3 rounded-2xl border-border/60 shadow-2xl z-[110]"
        align={align}
        sideOffset={8}
      >
        {/* Year nav */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setPickerYear((y) => y - 1)}
            disabled={pickerYear - 1 < minYear}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Año anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[13px] font-semibold text-foreground">{pickerYear}</span>
          <button
            type="button"
            onClick={() => setPickerYear((y) => y + 1)}
            disabled={pickerYear + 1 > maxYear}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Año siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1">
          {MONTH_NAMES_SHORT.map((name, i) => {
            const ym = `${pickerYear}-${String(i + 1).padStart(2, '0')}`
            const isCurrent = ym === value
            const isOutOfRange = (minMonth ? ym < minMonth : false) || (effectiveMax ? ym > effectiveMax : false)
            return (
              <button
                key={ym}
                type="button"
                disabled={isOutOfRange}
                onClick={() => pick(ym)}
                className={cn(
                  'py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-100',
                  isCurrent
                    ? 'bg-foreground text-background shadow-sm'
                    : isOutOfRange
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {name}
              </button>
            )
          })}
        </div>
        {/* Mes actual shortcut */}
        <button
          type="button"
          onClick={() => pick(nowYM)}
          disabled={(minMonth ? nowYM < minMonth : false) || (effectiveMax ? nowYM > effectiveMax : false)}
          className="w-full mt-2 py-1.5 rounded-lg text-[11px] font-semibold text-center bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
          Mes actual
        </button>
      </PopoverContent>
    </Popover>
  )
}
