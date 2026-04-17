/**
 * Fetchers de clima y geocoding para el widget de topbar.
 * Módulo puro TypeScript — sin React ni dependencias de framework.
 *
 * APIs usadas (ambas sin API key, con CORS habilitado):
 *   - Open-Meteo forecast:   https://api.open-meteo.com/v1/forecast
 *   - Open-Meteo geocoding:  https://geocoding-api.open-meteo.com/v1/search  (búsqueda por nombre)
 *   - BigDataCloud reverse:  https://api.bigdatacloud.net/data/reverse-geocode-client
 *
 * ¿Por qué BigDataCloud? Open-Meteo geocoding SOLO soporta búsqueda por nombre de ciudad
 * (no reverse-geocoding lat/lng → nombre). Para el flujo "usar mi ubicación actual" necesitamos
 * convertir las coords de `navigator.geolocation` en un nombre legible ("Buenos Aires, Argentina").
 * BigDataCloud es gratuito, sin API key, y resuelve eso en un solo request. Si falla, fallback
 * a "Mi ubicación" editable a mano.
 *
 * El `timezone` IANA siempre sale del forecast de Open-Meteo (con `timezone=auto`), no de
 * BigDataCloud. Así garantizamos coherencia entre lo que la UI muestra y lo que la API cachea.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WeatherCurrent {
  temperatureC: number
  weatherCode: number
  timezone: string // IANA, p.ej. "America/Argentina/Buenos_Aires"
}

export interface GeocodingResult {
  name: string        // "Córdoba"
  admin1?: string     // "Córdoba" (provincia) o "CA"
  country?: string    // "Argentina"
  countryCode?: string
  latitude: number
  longitude: number
  timezone: string
}

export interface ReverseGeocodingResult {
  name: string        // Display listo, p.ej. "Buenos Aires, Argentina"
  latitude: number
  longitude: number
}

// ─── WMO weather code → icon + label es-AR ────────────────────────────────
// Tabla oficial: https://open-meteo.com/en/docs#weather_variable_documentation

export type WmoBucket =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunderstorm'

export function wmoBucket(code: number): WmoBucket {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95 && code <= 99) return 'thunderstorm'
  return 'cloudy'
}

export function wmoLabelEs(code: number): string {
  switch (wmoBucket(code)) {
    case 'clear':         return 'Despejado'
    case 'partly-cloudy': return 'Parcialmente nublado'
    case 'cloudy':        return 'Nublado'
    case 'fog':           return 'Niebla'
    case 'drizzle':       return 'Llovizna'
    case 'rain':          return 'Lluvia'
    case 'snow':          return 'Nieve'
    case 'thunderstorm':  return 'Tormenta'
  }
}

// ─── Fetchers ──────────────────────────────────────────────────────────────

const FORECAST_URL   = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL  = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_URL    = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

export async function fetchWeather(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<WeatherCurrent> {
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`)
  const json = await res.json()
  const temperature = json?.current?.temperature_2m
  const weatherCode = json?.current?.weather_code
  const timezone = json?.timezone
  if (typeof temperature !== 'number' || typeof weatherCode !== 'number' || typeof timezone !== 'string') {
    throw new Error('Respuesta de clima inválida')
  }
  return { temperatureC: temperature, weatherCode, timezone }
}

export async function fetchGeocoding(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(trimmed)}&count=5&language=es&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`)
  const json = await res.json()
  const results: any[] = Array.isArray(json?.results) ? json.results : []
  return results.map((r): GeocodingResult => ({
    name: String(r.name ?? ''),
    admin1: r.admin1 ? String(r.admin1) : undefined,
    country: r.country ? String(r.country) : undefined,
    countryCode: r.country_code ? String(r.country_code) : undefined,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    timezone: String(r.timezone ?? 'UTC'),
  }))
}

/**
 * Reverse geocoding: lat/lng → nombre legible.
 * Usa BigDataCloud (sin API key, CORS OK). Si falla, devuelve null y el caller
 * debe usar un fallback (p.ej. "Mi ubicación" editable manualmente).
 */
export async function fetchReverseGeocoding(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodingResult | null> {
  try {
    const url = `${REVERSE_URL}?latitude=${lat}&longitude=${lng}&localityLanguage=es`
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const json = await res.json()
    const city = json?.city || json?.locality || json?.principalSubdivision
    const country = json?.countryName
    const parts = [city, country].filter((v) => typeof v === 'string' && v.length > 0)
    const name = parts.length > 0 ? parts.join(', ') : 'Mi ubicación'
    return { name, latitude: lat, longitude: lng }
  } catch {
    return null
  }
}

export function formatLocationDisplay(result: GeocodingResult): string {
  const country = result.country ?? ''
  return country ? `${result.name}, ${country}` : result.name
}
