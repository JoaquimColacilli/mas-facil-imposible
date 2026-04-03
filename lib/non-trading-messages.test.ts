import { describe, it, expect } from 'vitest'
import {
  getNonTradingMessage,
  nthNonTradingDay,
  seededShuffle,
  WEEKEND_MESSAGES,
  HOLIDAY_MESSAGES,
} from './non-trading-messages'
import { isNonTradingDay } from './ar-holidays'

describe('nthNonTradingDay', () => {
  it('primer día no operable del mes tiene index 0', () => {
    // Enero 2026: día 1 es jueves (feriado Año Nuevo) → index 0
    expect(nthNonTradingDay(new Date(2026, 0, 1))).toBe(0)
  })

  it('segundo día no operable del mes tiene index 1', () => {
    // Enero 2026: día 1 = feriado (index 0), día 3 = sábado (index 1)
    expect(nthNonTradingDay(new Date(2026, 0, 3))).toBe(1)
  })

  it('conteo correcto para una semana — abril 2026', () => {
    // Abril 2026: 1=mié(hábil), 2=jue(Malvinas+JueSto), 3=vie(VierSto), 4=sáb, 5=dom
    expect(nthNonTradingDay(new Date(2026, 3, 2))).toBe(0) // primer non-trading del mes
    expect(nthNonTradingDay(new Date(2026, 3, 3))).toBe(1)
    expect(nthNonTradingDay(new Date(2026, 3, 4))).toBe(2)
    expect(nthNonTradingDay(new Date(2026, 3, 5))).toBe(3)
  })
})

describe('seededShuffle', () => {
  it('misma seed produce mismo resultado', () => {
    const a = seededShuffle(WEEKEND_MESSAGES, 202600)
    const b = seededShuffle(WEEKEND_MESSAGES, 202600)
    expect(a).toEqual(b)
  })

  it('distinta seed produce distinto orden', () => {
    const a = seededShuffle(WEEKEND_MESSAGES, 202600)
    const b = seededShuffle(WEEKEND_MESSAGES, 202601)
    expect(a).not.toEqual(b)
  })
})

describe('getNonTradingMessage', () => {
  it('determinístico — misma fecha da mismo resultado', () => {
    const date = new Date(2026, 3, 4) // sábado
    const a = getNonTradingMessage(date)
    const b = getNonTradingMessage(date)
    expect(a).toBe(b)
  })

  it('sin holidayName usa pool de weekend', () => {
    const date = new Date(2026, 3, 4) // sábado
    const msg = getNonTradingMessage(date)
    expect(WEEKEND_MESSAGES).toContain(msg)
  })

  it('con holidayName usa pool de feriados', () => {
    const msg = getNonTradingMessage(new Date(2026, 4, 25), 'Día de la Revolución de Mayo')
    // El mensaje debe contener el nombre del feriado
    expect(msg).toContain('Día de la Revolución de Mayo')
    // Verificar que viene del pool de feriados (sin el placeholder)
    const template = HOLIDAY_MESSAGES.find((m) =>
      msg === m.replace('{name}', 'Día de la Revolución de Mayo')
    )
    expect(template).toBeDefined()
  })

  it('feriado en fin de semana → prioriza pool de feriados cuando se pasa holidayName', () => {
    // Si se pasa holidayName, usa pool de feriados sin importar si es finde
    const msg = getNonTradingMessage(new Date(2026, 0, 1), 'Año Nuevo') // 1 ene 2026 = jueves
    expect(msg).toContain('Año Nuevo')
  })

  it('no hay duplicados en un mes', () => {
    // Abril 2026: colectar todos los non-trading days y sus mensajes
    const messages: string[] = []
    for (let d = 1; d <= 30; d++) {
      const date = new Date(2026, 3, d)
      if (isNonTradingDay(date)) {
        messages.push(getNonTradingMessage(date))
      }
    }
    const unique = new Set(messages)
    expect(unique.size).toBe(messages.length)
  })

  it('mismo index en meses distintos produce mensaje distinto', () => {
    // Primer sábado de abril vs primer sábado de mayo
    const abril = getNonTradingMessage(new Date(2026, 3, 4)) // 4 abr = sáb
    const mayo = getNonTradingMessage(new Date(2026, 4, 2)) // 2 may = sáb
    expect(abril).not.toBe(mayo)
  })
})
