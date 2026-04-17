'use client'

import { useEffect, useRef, useState } from 'react'
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  fetchGeocoding,
  fetchReverseGeocoding,
  fetchWeather,
  formatLocationDisplay,
  type GeocodingResult,
} from '@/lib/weather'
import { cn } from '@/lib/utils'

export interface LocationValue {
  lat: number
  lng: number
  name: string
  timezone: string
}

interface LocationPickerProps {
  value: LocationValue | null
  onChange: (value: LocationValue | null) => void
}

const DEBOUNCE_MS = 300

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [searching, setSearching] = useState(false)
  const [geolocating, setGeolocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Debounced search con AbortController para cancelar requests en vuelo.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const found = await fetchGeocoding(trimmed, controller.signal)
        if (!controller.signal.aborted) {
          setResults(found)
          setSearching(false)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setResults([])
          setSearching(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [query])

  function selectResult(r: GeocodingResult) {
    onChange({
      lat: r.latitude,
      lng: r.longitude,
      name: formatLocationDisplay(r),
      timezone: r.timezone,
    })
    setQuery('')
    setResults([])
    setError(null)
  }

  function clearLocation() {
    onChange(null)
  }

  async function useMyLocation() {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.')
      return
    }
    setGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        try {
          // El timezone IANA lo sacamos del forecast de Open-Meteo (authoritativo).
          // El nombre, de BigDataCloud (reverse-geocode gratuito sin API key).
          const [weather, reverse] = await Promise.all([
            fetchWeather(lat, lng),
            fetchReverseGeocoding(lat, lng),
          ])
          onChange({
            lat,
            lng,
            name: reverse?.name ?? 'Mi ubicación',
            timezone: weather.timezone,
          })
        } catch {
          setError('No pudimos resolver tu ubicación. Probá buscar manual.')
        } finally {
          setGeolocating(false)
        }
      },
      (err) => {
        setGeolocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setError('Permiso denegado. Buscá tu ciudad manual.')
        } else {
          setError('No pudimos acceder a tu ubicación. Buscá manual.')
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Estado actual */}
      {value && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{value.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{value.timezone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearLocation}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded cursor-pointer shrink-0"
            aria-label="Quitar ubicación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Botón de geolocation */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 self-start"
        onClick={useMyLocation}
        disabled={geolocating}
      >
        {geolocating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Crosshair className="w-3.5 h-3.5" />
        )}
        {geolocating ? 'Buscando tu ubicación...' : 'Usar mi ubicación actual'}
      </Button>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 uppercase tracking-wider">
        <span className="flex-1 h-px bg-border" />
        o buscá manual
        <span className="flex-1 h-px bg-border" />
      </div>

      {/* Input con búsqueda */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ciudad..."
          className="h-9 pl-8"
          autoComplete="off"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <div className="flex flex-col rounded-lg border border-border overflow-hidden">
          {results.map((r, i) => (
            <button
              key={`${r.latitude}-${r.longitude}-${i}`}
              type="button"
              onClick={() => selectResult(r)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors cursor-pointer',
                i < results.length - 1 && 'border-b border-border/60',
              )}
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-foreground truncate">{formatLocationDisplay(r)}</span>
                {r.admin1 && (
                  <span className="text-[11px] text-muted-foreground truncate">{r.admin1}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Sin resultados para &quot;{query}&quot;.</p>
      )}

      {error && (
        <p className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5">
          {error}
        </p>
      )}
    </div>
  )
}
