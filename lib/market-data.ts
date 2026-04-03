/**
 * Lógica para obtener datos de mercado argentino desde Yahoo Finance.
 * Módulo puro TypeScript — sin React ni dependencias de framework.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TickerQuote {
  ticker: string
  name: string
  price: number
  changePercent: number
  changeAbsolute: number
  previousClose: number
  intradayPrices: number[] // array of prices for mini chart
}

export interface MarketData {
  merval: TickerQuote
  tickers: TickerQuote[]
}

export type MarketStatus = 'open' | 'closed-weekend' | 'closed-holiday' | 'closed-hours'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TICKERS = [
  { symbol: '^MERV', name: 'MERVAL' },
  { symbol: 'GGAL.BA', name: 'GGAL' },
  { symbol: 'YPFD.BA', name: 'YPF' },
  { symbol: 'MELI.BA', name: 'MELI' },
  { symbol: 'BMA.BA', name: 'BMA' },
  { symbol: 'PAMP.BA', name: 'PAMP' },
  { symbol: 'TXAR.BA', name: 'TXAR' },
  { symbol: 'SUPV.BA', name: 'SUPV' },
  { symbol: 'BBAR.BA', name: 'BBAR' },
  { symbol: 'LOMA.BA', name: 'LOMA' },
] as const

/** Cantidad de tickers secundarios visibles por default (sin expandir) */
export const DEFAULT_VISIBLE_TICKERS = 4

// TODO: make tickers configurable in the future

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

const AR_TIMEZONE = 'America/Argentina/Buenos_Aires'
const MARKET_OPEN_HOUR = 11
const MARKET_CLOSE_HOUR = 17

const DAY_ABBREVS = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retorna la hora actual en Argentina (0-23) para una fecha dada.
 */
function getArgentinaHour(date: Date): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: AR_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(date)
  return parseInt(hourStr, 10)
}

/**
 * Retorna el día de la semana en Argentina para una fecha dada (0=dom, 6=sáb).
 */
function getArgentinaWeekday(date: Date): number {
  const weekdayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: AR_TIMEZONE,
    weekday: 'short',
  }).format(date)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[weekdayStr] ?? date.getDay()
}

/**
 * Avanza un día desde la fecha dada (en zona Argentina) y retorna una nueva Date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime())
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Encuentra el próximo día hábil (trading day) a partir del día siguiente a `from`.
 * Retorna la abreviatura española del día + " 11:00".
 */
function findNextTradingDayLabel(
  from: Date,
  isNonTradingDayFn: (d: Date) => boolean
): string {
  let candidate = addDays(from, 1)
  // Limit iterations to avoid infinite loops (max ~10 days covers any holiday stretch)
  for (let i = 0; i < 14; i++) {
    if (!isNonTradingDayFn(candidate)) {
      const dow = getArgentinaWeekday(candidate)
      return `${DAY_ABBREVS[dow]} ${MARKET_OPEN_HOUR}:00`
    }
    candidate = addDays(candidate, 1)
  }
  // Fallback — should never happen
  return `lun. ${MARKET_OPEN_HOUR}:00`
}

// ---------------------------------------------------------------------------
// Market status
// ---------------------------------------------------------------------------

/**
 * Determina si el mercado argentino está abierto o cerrado, y cuándo abre.
 *
 * @param now - Fecha/hora actual
 * @param isNonTradingDayFn - Función que retorna true si la fecha es no operable
 * @param getHolidayNameFn - Función que retorna el nombre del feriado o undefined
 */
export function getMarketStatus(
  now: Date,
  isNonTradingDayFn: (d: Date) => boolean,
  getHolidayNameFn: (d: Date) => string | undefined
): { status: MarketStatus; nextOpenLabel: string } {
  const dow = getArgentinaWeekday(now)
  const isNonTrading = isNonTradingDayFn(now)

  if (isNonTrading) {
    // Weekend
    if (dow === 0 || dow === 6) {
      // Find next Monday (or next trading day if Monday is also non-trading)
      const label = findNextTradingDayLabel(now, isNonTradingDayFn)
      return {
        status: 'closed-weekend',
        nextOpenLabel: `Abre ${label}`,
      }
    }

    // Weekday holiday
    const holidayName = getHolidayNameFn(now)
    const label = findNextTradingDayLabel(now, isNonTradingDayFn)
    return {
      status: 'closed-holiday',
      nextOpenLabel: `Feriado · Abre ${label}`,
    }
  }

  // Trading day — check hours
  const hour = getArgentinaHour(now)

  if (hour < MARKET_OPEN_HOUR) {
    return {
      status: 'closed-hours',
      nextOpenLabel: `Abre hoy ${MARKET_OPEN_HOUR}:00`,
    }
  }

  if (hour >= MARKET_CLOSE_HOUR) {
    // After close — find next trading day (could be tomorrow or later)
    const tomorrow = addDays(now, 1)
    if (isNonTradingDayFn(tomorrow)) {
      const label = findNextTradingDayLabel(now, isNonTradingDayFn)
      return {
        status: 'closed-hours',
        nextOpenLabel: `Cerrado · Abre ${label}`,
      }
    }
    return {
      status: 'closed-hours',
      nextOpenLabel: `Cerrado · Abre mañana ${MARKET_OPEN_HOUR}:00`,
    }
  }

  // Market is open
  return {
    status: 'open',
    nextOpenLabel: '',
  }
}

// ---------------------------------------------------------------------------
// Yahoo Finance response parsing
// ---------------------------------------------------------------------------

/**
 * Parsea la respuesta de Yahoo Finance chart API y extrae un TickerQuote.
 * Retorna null si la estructura es inválida.
 */
export function parseYahooChartResponse(
  json: any,
  tickerSymbol: string,
  tickerName: string
): TickerQuote | null {
  try {
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    if (!meta) return null

    const price: number = meta.regularMarketPrice
    const previousClose: number = meta.previousClose

    if (typeof price !== 'number' || typeof previousClose !== 'number') return null
    if (previousClose === 0) return null

    const changeAbsolute = price - previousClose
    const changePercent = ((price / previousClose) - 1) * 100

    // Extract intraday prices, filtering out nulls/undefined
    const closePrices: (number | null)[] =
      result.indicators?.quote?.[0]?.close ?? []
    const intradayPrices = closePrices.filter(
      (p): p is number => typeof p === 'number'
    )

    return {
      ticker: tickerSymbol,
      name: tickerName,
      price,
      changePercent,
      changeAbsolute,
      previousClose,
      intradayPrices,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

/**
 * Obtiene datos de un ticker via el proxy server-side para evitar CORS.
 * El proxy vive en app/api/market-proxy/route.ts y cachea 60s en el edge.
 */
export async function fetchTickerData(
  symbol: string,
  name: string
): Promise<TickerQuote | null> {
  try {
    const url = `/api/market-proxy?ticker=${encodeURIComponent(symbol)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return parseYahooChartResponse(json, symbol, name)
  } catch {
    return null
  }
}

/**
 * Obtiene datos de mercado para todos los tickers configurados.
 * Retorna null si no se pudo obtener el MERVAL (ticker principal).
 */
export async function fetchMarketData(): Promise<MarketData | null> {
  const results = await Promise.all(
    TICKERS.map((t) => fetchTickerData(t.symbol, t.name))
  )

  const merval = results[0]
  if (!merval) return null

  const tickers = results
    .slice(1)
    .filter((t): t is TickerQuote => t !== null)

  return { merval, tickers }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/**
 * Determina la dirección del cambio de precio para animaciones de flash.
 * Retorna 'up' si subió, 'down' si bajó, null si no cambió.
 */
export function flashDirection(
  prev: number,
  next: number
): 'up' | 'down' | null {
  if (next > prev) return 'up'
  if (next < prev) return 'down'
  return null
}
