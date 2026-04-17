'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Sun,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { usePolling } from '@/hooks/use-polling'
import { fetchWeather, wmoBucket, wmoLabelEs, type WeatherCurrent, type WmoBucket } from '@/lib/weather'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface WeatherClockWidgetProps {
  profile: Profile | null
}

const ICON_BY_BUCKET: Record<WmoBucket, LucideIcon> = {
  'clear':         Sun,
  'partly-cloudy': CloudSun,
  'cloudy':        Cloud,
  'fog':           CloudFog,
  'drizzle':       CloudDrizzle,
  'rain':          CloudRain,
  'snow':          CloudSnow,
  'thunderstorm':  CloudLightning,
}

function formatTimeInZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }
}

export function WeatherClockWidget({ profile }: WeatherClockWidgetProps) {
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<Date>(() => new Date())

  const hasLocation =
    typeof profile?.location_lat === 'number' &&
    typeof profile?.location_lng === 'number' &&
    typeof profile?.location_timezone === 'string'

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reloj: tick cada 60s, independiente del fetch del clima.
  // Alineado al próximo cambio de minuto para no desfasar.
  useEffect(() => {
    if (!mounted) return
    const toNextMinute = 60_000 - (Date.now() % 60_000)
    let interval: ReturnType<typeof setInterval> | null = null
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60_000)
    }, toNextMinute)
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [mounted])

  const lat = profile?.location_lat ?? null
  const lng = profile?.location_lng ?? null
  const cacheKey = hasLocation ? `mfi-weather-${lat}-${lng}` : null

  const { data: weather } = usePolling<WeatherCurrent>({
    key: cacheKey ?? 'mfi-weather-disabled',
    fetcher: async () => {
      if (!hasLocation) throw new Error('Sin ubicación configurada')
      return fetchWeather(lat as number, lng as number)
    },
    intervalMs: 10 * 60 * 1000,
    cacheKey,
    cacheTtlMs: 10 * 60 * 1000,
  })

  // Estado 1 — no hay ubicación configurada: CTA sutil.
  if (!hasLocation) {
    return (
      <Link
        href="/settings"
        aria-label="Configurar ubicación"
        className="hidden sm:flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[11px] font-medium text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
      >
        <MapPin className="w-3.5 h-3.5" />
        <span>Configurá tu zona</span>
      </Link>
    )
  }

  // Hasta hidratar evitamos mismatch SSR/CSR (Intl + timezone del usuario
  // pueden renderizar distinto server vs client). Reserva ancho aproximado.
  if (!mounted) {
    return <div className="hidden sm:block h-9 w-[88px] shrink-0" aria-hidden />
  }

  const timezone = profile?.location_timezone as string
  const locationName = profile?.location_name ?? 'Tu ubicación'
  const timeStr = formatTimeInZone(now, timezone)

  // Estado 2 — hay ubicación pero el clima falló: degradamos a solo hora.
  if (!weather) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-muted/40 border border-border/30 text-xs select-none shrink-0">
        <span className="font-mono tabular-nums text-foreground">{timeStr}</span>
      </div>
    )
  }

  const bucket = wmoBucket(weather.weatherCode)
  const Icon = ICON_BY_BUCKET[bucket]
  const tempStr = `${Math.round(weather.temperatureC)}°`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-muted/40 border border-border/30 text-xs select-none shrink-0',
          )}
        >
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-mono tabular-nums text-foreground">{tempStr}</span>
          {/* Hora: oculta en mobile (<sm), el OS ya la muestra */}
          <span className="hidden sm:inline w-px h-3.5 bg-border/50" />
          <span className="hidden sm:inline font-mono tabular-nums text-foreground">{timeStr}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs p-3">
        <div className="text-xs space-y-1">
          <p className="font-semibold">{locationName}</p>
          <p className="text-muted-foreground">
            {wmoLabelEs(weather.weatherCode)} · {tempStr}C
          </p>
          <p className="text-muted-foreground">Hora local: {timeStr}</p>
          <div className="border-t border-white/10 my-1.5" />
          <p className="text-muted-foreground/70">Se actualiza cada 10 min</p>
          <p className="text-muted-foreground/70">Fuente: open-meteo.com</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
