/**
 * Fetcher de indicadores macro de Argentina para el widget del topbar.
 * Módulo puro TypeScript — sin React ni dependencias de framework.
 *
 * Fuente: ArgentinaDatos (https://argentinadatos.com) — pública, sin API key, CORS OK.
 *
 * Por qué pegamos solo al endpoint histórico (y no también al `/ultimo`):
 * el histórico ya trae el último valor + el anterior en un solo response,
 * así calculamos el delta vs. día anterior sin gastar otro round-trip.
 */

export interface RiesgoPaisData {
  valor: number
  fecha: string              // ISO "YYYY-MM-DD"
  deltaAbsoluto: number | null  // valor - valor anterior (puntos)
  deltaPercent: number | null   // ((valor / prev) - 1) * 100
}

const HISTORICO_URL = 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais'

interface RiesgoPaisPoint {
  fecha: string
  valor: number
}

/**
 * Del array histórico extrae el último valor + el anterior con fecha DISTINTA.
 * Esto evita delta=0 falso cuando la API publica 2 registros con la misma fecha
 * (correcciones/reposts intradía).
 */
function pickLastTwoWithDifferentDates(points: RiesgoPaisPoint[]): [RiesgoPaisPoint, RiesgoPaisPoint | null] {
  // Ordenamos desc por fecha por si la API cambia el orden.
  const sorted = [...points].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const last = sorted[0]
  const prev = sorted.find((p, i) => i > 0 && p.fecha !== last.fecha) ?? null
  return [last, prev]
}

export async function fetchRiesgoPais(signal?: AbortSignal): Promise<RiesgoPaisData> {
  const res = await fetch(HISTORICO_URL, { signal })
  if (!res.ok) throw new Error(`Riesgo país HTTP ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json) || json.length === 0) throw new Error('Riesgo país sin datos')

  const normalized: RiesgoPaisPoint[] = json
    .filter((p) => p && typeof p.fecha === 'string' && typeof p.valor === 'number')
    .map((p) => ({ fecha: p.fecha, valor: Number(p.valor) }))

  if (normalized.length === 0) throw new Error('Riesgo país formato inválido')

  const [last, prev] = pickLastTwoWithDifferentDates(normalized)
  const valor = last.valor
  const deltaAbsoluto = prev ? valor - prev.valor : null
  const deltaPercent = prev && prev.valor !== 0 ? ((valor / prev.valor) - 1) * 100 : null

  return { valor, fecha: last.fecha, deltaAbsoluto, deltaPercent }
}
