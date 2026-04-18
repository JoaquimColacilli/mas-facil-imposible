'use client'

import { useMemo } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePolling } from '@/hooks/use-polling'
import { fetchRiesgoPais, type RiesgoPaisData } from '@/lib/ar-datos'
import { getNextHoliday, daysUntil } from '@/lib/ar-holidays'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const numFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDayMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '')
}

function formatFullHoliday(date: Date): string {
  const str = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatWeekday(date: Date): string {
  const str = date.toLocaleDateString('es-AR', { weekday: 'long' })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatUpdatedDate(iso: string): string {
  // iso: "YYYY-MM-DD" → "16 abr"
  const [y, m, d] = iso.split('-').map(Number)
  return formatDayMonth(new Date(y, m - 1, d))
}

function daysLabel(n: number): string {
  if (n <= 0) return 'hoy'
  if (n === 1) return 'mañana'
  return `en ${n} días`
}

function daysShort(n: number): string {
  if (n <= 0) return 'hoy'
  if (n === 1) return 'mañana'
  return `${n}d`
}

export function ArDatosWidget() {
  const { data: riesgo } = usePolling<RiesgoPaisData>({
    key: 'mfi-ar-riesgo-pais',
    fetcher: () => fetchRiesgoPais(),
    intervalMs: 60 * 60 * 1000, // 1h
    cacheKey: 'mfi-ar-riesgo-pais-cache',
    cacheTtlMs: 60 * 60 * 1000,
  })

  const holidayInfo = useMemo(() => {
    const next = getNextHoliday(new Date())
    if (!next) return null
    return { holiday: next, days: daysUntil(next.date, new Date()) }
  }, [])

  const hasRiesgo = !!riesgo
  const hasHoliday = !!holidayInfo

  // Ambos datos fallaron → no mostrar widget.
  if (!hasRiesgo && !hasHoliday) return null

  // isStale semántico: la última fecha del dato es anterior al día calendario de hoy.
  // Fines de semana / feriados arrastran el valor del viernes y se ven "stale" hasta el lunes.
  const isStale = hasRiesgo && riesgo!.fecha < todayISO()

  // Color/flecha invertidos: bajar el riesgo país es BUENO.
  // USD y Crypto usan subir=verde; acá subir=rojo. Evidente en contexto macro argentino.
  const delta = riesgo?.deltaAbsoluto ?? null
  const deltaDir: 'up' | 'down' | null = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : null
  const DeltaIcon = deltaDir === 'up' ? ArrowUp : deltaDir === 'down' ? ArrowDown : null
  const deltaColor =
    deltaDir === 'up' ? 'text-rose-400' : deltaDir === 'down' ? 'text-emerald-400' : ''
  const deltaPctStr =
    riesgo?.deltaPercent != null
      ? `${Math.abs(riesgo.deltaPercent).toFixed(1)}%`
      : null

  return (
    <div className="hidden md:flex items-center shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-muted/40 border border-border/30 text-xs select-none',
              isStale && 'opacity-60',
            )}
          >
            {/* Slot 1 — Riesgo país */}
            {hasRiesgo && (
              <>
                <span className="text-muted-foreground">RP</span>
                <span className="font-mono tabular-nums text-foreground">
                  {numFmt.format(riesgo!.valor)}
                </span>
                {DeltaIcon && (
                  <span className={cn('flex items-center gap-0.5', deltaColor)}>
                    <DeltaIcon className="w-3 h-3" />
                    {deltaPctStr && (
                      <span className="hidden lg:inline font-mono tabular-nums text-[11px]">
                        {deltaPctStr}
                      </span>
                    )}
                  </span>
                )}
              </>
            )}

            {/* Divider entre slots */}
            {hasRiesgo && hasHoliday && <span className="w-px h-3.5 bg-border/50" />}

            {/* Slot 2 — Próximo feriado */}
            {hasHoliday && (
              <>
                <span className="text-muted-foreground">Fer.</span>
                <span className="hidden lg:inline font-mono tabular-nums text-foreground">
                  {formatDayMonth(holidayInfo!.holiday.date)}
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {daysShort(holidayInfo!.days)}
                </span>
              </>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="text-xs space-y-2">
            {hasRiesgo && (
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold">Riesgo país</p>
                  <span className="text-[10px] text-muted-foreground/70">
                    ↓ mejora · ↑ empeora
                  </span>
                </div>
                <p className="font-mono tabular-nums mt-0.5">
                  {numFmt.format(riesgo!.valor)} pts
                </p>
                {delta != null && deltaDir && (
                  <p className={cn('font-mono tabular-nums text-[11px]', deltaColor)}>
                    {deltaDir === 'up' ? '↑' : '↓'} {numFmt.format(Math.abs(delta))} vs. ayer
                    {deltaPctStr && ` (${deltaPctStr})`}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Actualizado: {formatUpdatedDate(riesgo!.fecha)}
                </p>
              </div>
            )}

            {hasRiesgo && hasHoliday && <div className="border-t border-white/10" />}

            {hasHoliday && (
              <div>
                <p className="font-semibold">Próximo feriado</p>
                <p className="mt-0.5">
                  {formatFullHoliday(holidayInfo!.holiday.date)} &middot; {holidayInfo!.holiday.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatWeekday(holidayInfo!.holiday.date)} &middot; {daysLabel(holidayInfo!.days)}
                </p>
              </div>
            )}

            <div className="border-t border-white/10" />

            <div className="text-muted-foreground/70 space-y-0.5">
              <p>Riesgo país se actualiza cada 1h</p>
              <p>Fuente: argentinadatos.com</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
