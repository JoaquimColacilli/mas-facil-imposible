import { describe, it, expect } from 'vitest'
import { getMarketStatus, parseYahooChartResponse, flashDirection } from './market-data'
import { isNonTradingDay, getHolidayName } from './ar-holidays'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Mock simple: sábados y domingos son non-trading, todo día de semana es hábil.
 * Usa Date.getDay() (UTC) — suficiente para tests donde la fecha UTC y AR coinciden
 * en día de la semana.
 */
const mockIsNonTradingDay = (d: Date): boolean => {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

const mockGetHolidayName = (_d: Date): string | undefined => undefined

// ---------------------------------------------------------------------------
// getMarketStatus
// ---------------------------------------------------------------------------

describe('getMarketStatus', () => {
  it('Lunes 14:00 AR → abierto', () => {
    // Monday 2026-03-16, 14:00 AR = 17:00 UTC
    const now = new Date('2026-03-16T17:00:00Z')
    const result = getMarketStatus(now, mockIsNonTradingDay, mockGetHolidayName)

    expect(result.status).toBe('open')
    expect(result.nextOpenLabel).toBe('')
  })

  it('Sábado → cerrado fin de semana', () => {
    // Saturday 2026-03-21, 12:00 AR = 15:00 UTC
    const now = new Date('2026-03-21T15:00:00Z')
    const result = getMarketStatus(now, mockIsNonTradingDay, mockGetHolidayName)

    expect(result.status).toBe('closed-weekend')
    expect(result.nextOpenLabel).toContain('lun.')
    expect(result.nextOpenLabel).toContain('11:00')
  })

  it('Feriado (25 de mayo 2026, lunes) → cerrado feriado', () => {
    // Monday 2026-05-25, 14:00 AR = 17:00 UTC
    const now = new Date('2026-05-25T17:00:00Z')
    const result = getMarketStatus(now, isNonTradingDay, getHolidayName)

    expect(result.status).toBe('closed-holiday')
    expect(result.nextOpenLabel).toContain('Feriado')
  })

  it('Lunes 10:00 AR (antes de apertura) → cerrado por horario', () => {
    // Monday 2026-03-16, 10:00 AR = 13:00 UTC
    const now = new Date('2026-03-16T13:00:00Z')
    const result = getMarketStatus(now, mockIsNonTradingDay, mockGetHolidayName)

    expect(result.status).toBe('closed-hours')
    expect(result.nextOpenLabel).toContain('hoy')
    expect(result.nextOpenLabel).toContain('11:00')
  })

  it('Lunes 18:00 AR (después de cierre) → cerrado por horario', () => {
    // Monday 2026-03-16, 18:00 AR = 21:00 UTC
    const now = new Date('2026-03-16T21:00:00Z')
    const result = getMarketStatus(now, mockIsNonTradingDay, mockGetHolidayName)

    expect(result.status).toBe('closed-hours')
    expect(result.nextOpenLabel).toContain('mañana')
  })
})

// ---------------------------------------------------------------------------
// parseYahooChartResponse
// ---------------------------------------------------------------------------

describe('parseYahooChartResponse', () => {
  it('Respuesta válida → extrae TickerQuote correctamente', () => {
    const json = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 2150000,
              previousClose: 2100000,
              currency: 'ARS',
            },
            indicators: {
              quote: [
                {
                  close: [2100000, 2110000, null, 2120000, 2150000],
                },
              ],
            },
          },
        ],
      },
    }

    const result = parseYahooChartResponse(json, '^MERV', 'MERVAL')

    expect(result).not.toBeNull()
    expect(result!.price).toBe(2150000)
    expect(result!.previousClose).toBe(2100000)
    expect(result!.changePercent).toBeCloseTo(2.38, 1)
    expect(result!.changeAbsolute).toBe(50000)
    expect(result!.intradayPrices).toHaveLength(4) // null filtered out
    expect(result!.name).toBe('MERVAL')
    expect(result!.ticker).toBe('^MERV')
  })

  it('Respuesta sin result → null', () => {
    const json = { chart: { result: [] } }
    expect(parseYahooChartResponse(json, '^MERV', 'MERVAL')).toBeNull()
  })

  it('Respuesta sin meta → null', () => {
    const json = { chart: { result: [{ indicators: {} }] } }
    expect(parseYahooChartResponse(json, '^MERV', 'MERVAL')).toBeNull()
  })

  it('Input basura → null', () => {
    expect(parseYahooChartResponse(null, '^MERV', 'MERVAL')).toBeNull()
    expect(parseYahooChartResponse({}, '^MERV', 'MERVAL')).toBeNull()
    expect(parseYahooChartResponse('string', '^MERV', 'MERVAL')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// flashDirection
// ---------------------------------------------------------------------------

describe('flashDirection', () => {
  it('retorna "up" cuando el precio sube', () => {
    expect(flashDirection(100, 105)).toBe('up')
  })

  it('retorna "down" cuando el precio baja', () => {
    expect(flashDirection(100, 95)).toBe('down')
  })

  it('retorna null cuando el precio no cambia', () => {
    expect(flashDirection(100, 100)).toBeNull()
  })
})
