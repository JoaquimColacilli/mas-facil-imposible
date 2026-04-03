'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDolarResponse, numFmt, type DolarQuote } from '@/lib/dolar-cotizacion'
import { usePolling } from '@/hooks/use-polling'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

type FlashDir = 'up' | 'down' | null

interface FlashState {
  mep: FlashDir
  blue: FlashDir
}

interface DolarPollData {
  mep: DolarQuote
  blue: DolarQuote
}

async function fetchDolarDataRaw(): Promise<DolarPollData> {
  const res = await fetch('https://dolarapi.com/v1/dolares')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const parsed = parseDolarResponse(json)
  if (!parsed) throw new Error('Parse error')
  return parsed
}

function formatPrice(value: number) {
  return `$${numFmt.format(value)}`
}

function spreadPct(quote: DolarQuote) {
  if (quote.compra === 0) return '0.0'
  return ((quote.venta - quote.compra) / quote.compra * 100).toFixed(1)
}

export function UsdCotizacionWidget() {
  const { data, isStale, lastUpdated, refetch, onCooldown } = usePolling<DolarPollData>({
    key: 'mfi-usd-rates',
    fetcher: fetchDolarDataRaw,
    intervalMs: 5 * 60 * 1000,
    cacheKey: 'mfi-usd-cache',
  })

  const [flash, setFlash] = useState<FlashState>({ mep: null, blue: null })
  const prevRef = useRef<{ mep: number; blue: number } | null>(null)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    if (!data) return

    const prev = prevRef.current
    if (prev) {
      const newFlash: FlashState = {
        mep:
          data.mep.venta > prev.mep
            ? 'up'
            : data.mep.venta < prev.mep
              ? 'down'
              : null,
        blue:
          data.blue.venta > prev.blue
            ? 'up'
            : data.blue.venta < prev.blue
              ? 'down'
              : null,
      }

      if (newFlash.mep || newFlash.blue) {
        setFlash(newFlash)
        const timer = setTimeout(() => setFlash({ mep: null, blue: null }), 400)
        return () => clearTimeout(timer)
      }
    }

    prevRef.current = { mep: data.mep.venta, blue: data.blue.venta }
  }, [data])

  const handleRefresh = useCallback(async () => {
    if (onCooldown || spinning) return
    setSpinning(true)
    await refetch()
    setTimeout(() => setSpinning(false), 500)
  }, [onCooldown, spinning, refetch])

  if (!data) return null

  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="hidden md:flex items-center gap-1 shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-muted/40 border border-border/30 text-xs select-none',
              isStale && 'opacity-60',
            )}
          >
            {/* MEP */}
            <span className="text-muted-foreground">MEP</span>
            <span
              className={cn(
                'font-mono tabular-nums text-foreground transition-colors duration-400',
                flash.mep === 'up' && 'text-emerald-400',
                flash.mep === 'down' && 'text-rose-400',
              )}
            >
              {formatPrice(data.mep.venta)}
            </span>

            {/* Divider */}
            <span className="w-px h-3.5 bg-border/50" />

            {/* Blue */}
            <span className="text-muted-foreground">Blue</span>
            <span
              className={cn(
                'font-mono tabular-nums text-foreground transition-colors duration-400',
                flash.blue === 'up' && 'text-emerald-400',
                flash.blue === 'down' && 'text-rose-400',
              )}
            >
              {formatPrice(data.blue.venta)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="text-xs space-y-1.5">
            {/* MEP section */}
            <div>
              <p className="font-semibold">Dolar MEP</p>
              <p className="font-mono tabular-nums">
                Compra: {formatPrice(data.mep.compra)} / Venta: {formatPrice(data.mep.venta)}
              </p>
            </div>

            {/* Blue section */}
            <div>
              <p className="font-semibold">Dolar Blue</p>
              <p className="font-mono tabular-nums">
                Compra: {formatPrice(data.blue.compra)} / Venta: {formatPrice(data.blue.venta)}
              </p>
            </div>

            {/* Spread */}
            <p className="font-mono tabular-nums">
              Spread MEP: {spreadPct(data.mep)}%
            </p>

            {/* Separator */}
            <div className="border-t border-white/10 my-1.5" />

            {/* Footer */}
            <div className="text-muted-foreground/70 space-y-0.5">
              <p>Se actualiza cada 5 min</p>
              {isStale ? (
                <p>Datos en cache (sin conexion)</p>
              ) : lastUpdatedStr ? (
                <p>Ultima act: {lastUpdatedStr} hs</p>
              ) : null}
              <p>Fuente: dolarapi.com</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleRefresh}
            disabled={onCooldown}
            className={cn(
              'p-1 rounded-md transition-colors',
              onCooldown
                ? 'opacity-30 cursor-not-allowed'
                : 'text-muted-foreground/50 hover:text-muted-foreground cursor-pointer',
            )}
          >
            <RefreshCw
              className="w-3.5 h-3.5"
              style={{
                transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
                transition: spinning ? 'transform 0.5s ease-out' : 'none',
              }}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {onCooldown ? 'Espera 30s' : 'Actualizar ahora'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
