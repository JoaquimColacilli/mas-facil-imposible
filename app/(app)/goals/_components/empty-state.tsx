'use client'

import { Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GoalCategory } from '@/lib/types'

export interface GoalTemplate {
  id: string
  label: string
  hint: string
  /** Pre-fill values for the create modal. */
  prefill: {
    name: string
    category: GoalCategory
    currency: 'USD' | 'ARS'
    target_amount: number
    monthsToDeadline: number
    monthly_target: number
  }
}

const TEMPLATES: GoalTemplate[] = [
  {
    id: 'viaje-6m',
    label: 'Viaje',
    hint: 'U$S 1.500 en 6 meses',
    prefill: {
      name: 'Viaje',
      category: 'viaje',
      currency: 'USD',
      target_amount: 1500,
      monthsToDeadline: 6,
      monthly_target: 250,
    },
  },
  {
    id: 'emergencia-12m',
    label: 'Fondo de emergencia',
    hint: '6 meses de gastos',
    prefill: {
      name: 'Fondo de emergencia',
      category: 'emergencia',
      currency: 'USD',
      target_amount: 6000,
      monthsToDeadline: 12,
      monthly_target: 500,
    },
  },
  {
    id: 'auto-24m',
    label: 'Auto',
    hint: 'U$S 18.000 en 24 meses',
    prefill: {
      name: 'Auto 0km',
      category: 'auto',
      currency: 'USD',
      target_amount: 18000,
      monthsToDeadline: 24,
      monthly_target: 750,
    },
  },
]

interface GoalsEmptyProps {
  onNew: (template?: GoalTemplate) => void
}

export function GoalsEmpty({ onNew }: GoalsEmptyProps) {
  return (
    <div className="rounded-2xl bg-card border border-border p-10 grid place-items-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 grid place-items-center mb-4">
        <Target className="w-9 h-9 text-emerald-600" />
      </div>
      <h3 className="font-semibold text-[20px] text-foreground">Todavía no tenés metas</h3>
      <p className="text-muted-foreground text-[14px] max-w-md mt-2" style={{ textWrap: 'pretty' as never }}>
        Una meta es una promesa con un número y una fecha. Empezá con algo chico — un viaje en 6 meses,
        un fondo de emergencia — y dejá que el ahorro automático haga el resto.
      </p>
      <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
        <Button onClick={() => onNew()} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Crear mi primera meta
        </Button>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl w-full">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.id}
            onClick={() => onNew(t)}
            className="rounded-xl border border-border p-4 text-left hover:bg-muted/40 hover:border-emerald-500/30 transition-colors"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
              Idea {i + 1}
            </div>
            <div className="font-semibold text-foreground mt-1">{t.label}</div>
            <div className="text-[12px] text-muted-foreground mt-1" style={{ textWrap: 'pretty' as never }}>
              {t.hint}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export { TEMPLATES }
