'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Formats a raw string as es-AR money on every keystroke.
 * Uses `.` as thousands separator and `,` as decimal separator.
 * e.g. "1000" → "1.000", "1000,5" → "1.000,5"
 */
export function liveFormatMoney(raw: string): string {
  const cleaned = raw.replace(/[^0-9,]/g, '')
  const commaIdx = cleaned.indexOf(',')
  const intPart = commaIdx >= 0 ? cleaned.slice(0, commaIdx) : cleaned
  const decPart = commaIdx >= 0 ? cleaned.slice(commaIdx + 1) : null
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart !== null ? formattedInt + ',' + decPart : formattedInt
}

/**
 * Parses a formatted es-AR money string back to a number.
 * "1.000,50" → 1000.5
 */
export function parseMoneyInput(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0
}

/**
 * Converts a stored numeric value to a formatted display string for input initialisation.
 * 15000 → "15.000", 1500.5 → "1.500,5"
 */
export function formatMoneyInput(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (!num || isNaN(num)) return ''
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2, useGrouping: true }).format(num)
}

interface MoneyInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value' | 'type'> {
  value: string
  onChange: (value: string) => void
}

/**
 * Drop-in replacement for shadcn <Input> on amount fields.
 * Formats value as es-AR money on every keystroke.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput({ value, onChange, className, ...props }, ref) {
    return (
      <Input
        ref={ref}
        {...props}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(liveFormatMoney(e.target.value))}
        className={cn(className)}
      />
    )
  },
)
