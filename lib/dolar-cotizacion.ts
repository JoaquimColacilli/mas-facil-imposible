/**
 * Lógica pura de cotización USD — sin dependencias de React ni @/ aliases.
 * Usado por el widget y los tests.
 */

export interface DolarQuote {
  compra: number
  venta: number
  fechaActualizacion: string
}

export interface DolarData {
  mep: DolarQuote
  blue: DolarQuote
  stale: boolean
}

const API_URL = 'https://dolarapi.com/v1/dolares'
const CACHE_KEY = 'mfi-usd-cache'
const TTL = 3_600_000 // 1 hour

export const numFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

export function parseDolarResponse(
  data: any[],
): { mep: DolarQuote; blue: DolarQuote } | null {
  if (!Array.isArray(data)) return null

  const blueRaw = data.find((d) => d.casa === 'blue')
  const mepRaw = data.find((d) => d.casa === 'bolsa')

  if (!blueRaw || !mepRaw) return null

  const toDolarQuote = (raw: any): DolarQuote => ({
    compra: Number(raw.compra),
    venta: Number(raw.venta),
    fechaActualizacion: String(raw.fechaActualizacion),
  })

  return { mep: toDolarQuote(mepRaw), blue: toDolarQuote(blueRaw) }
}

function readCache(): { data: { mep: DolarQuote; blue: DolarQuote }; timestamp: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeCache(data: { mep: DolarQuote; blue: DolarQuote }) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // quota exceeded — ignore
  }
}

export async function fetchDolarData(): Promise<DolarData | null> {
  const cached = readCache()
  if (cached && Date.now() - cached.timestamp < TTL) {
    return { ...cached.data, stale: false }
  }

  try {
    const res = await fetch(API_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const parsed = parseDolarResponse(json)
    if (!parsed) throw new Error('Parse error')

    writeCache(parsed)
    return { ...parsed, stale: false }
  } catch {
    if (cached) {
      return { ...cached.data, stale: true }
    }
    return null
  }
}
