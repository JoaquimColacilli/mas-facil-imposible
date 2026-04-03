import { describe, it, expect } from 'vitest'
import {
  computeEasterDate,
  isNonTradingDay,
  getHolidays,
  getHolidayName,
} from './ar-holidays'

describe('computeEasterDate', () => {
  it('2026 → 5 de abril', () => {
    const d = computeEasterDate(2026)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(3) // abril = 3
    expect(d.getDate()).toBe(5)
  })

  it('2027 → 28 de marzo', () => {
    const d = computeEasterDate(2027)
    expect(d.getFullYear()).toBe(2027)
    expect(d.getMonth()).toBe(2) // marzo = 2
    expect(d.getDate()).toBe(28)
  })

  it('2028 → 16 de abril', () => {
    const d = computeEasterDate(2028)
    expect(d.getFullYear()).toBe(2028)
    expect(d.getMonth()).toBe(3)
    expect(d.getDate()).toBe(16)
  })
})

describe('isNonTradingDay', () => {
  it('sábado → true', () => {
    expect(isNonTradingDay(new Date(2026, 3, 4))).toBe(true)
  })

  it('domingo → true', () => {
    expect(isNonTradingDay(new Date(2026, 3, 5))).toBe(true)
  })

  it('feriado fijo — 25 de mayo 2026 → true', () => {
    expect(isNonTradingDay(new Date(2026, 4, 25))).toBe(true)
  })

  it('Carnaval 2026 (lunes 16 de febrero) → true', () => {
    expect(isNonTradingDay(new Date(2026, 1, 16))).toBe(true)
  })

  it('Carnaval 2026 (martes 17 de febrero) → true', () => {
    expect(isNonTradingDay(new Date(2026, 1, 17))).toBe(true)
  })

  it('Carnaval 2029 (lunes 12 de febrero) → true', () => {
    expect(isNonTradingDay(new Date(2029, 1, 12))).toBe(true)
  })

  it('día hábil normal — miércoles 15 de abril 2026 → false', () => {
    expect(isNonTradingDay(new Date(2026, 3, 15))).toBe(false)
  })

  it('Viernes Santo 2026 (3 de abril) → true', () => {
    expect(isNonTradingDay(new Date(2026, 3, 3))).toBe(true)
  })

  it('Jueves Santo 2026 (2 de abril coincide con Malvinas) → true', () => {
    expect(isNonTradingDay(new Date(2026, 3, 2))).toBe(true)
  })
})

describe('getHolidays', () => {
  it('retorna array de { date, name }', () => {
    const h2026 = getHolidays(2026)
    expect(h2026[0]).toHaveProperty('date')
    expect(h2026[0]).toHaveProperty('name')
    expect(h2026[0].date).toBeInstanceOf(Date)
    expect(typeof h2026[0].name).toBe('string')
  })

  it('incluye 12 feriados fijos + 4 calculables + puentes del año', () => {
    const h2026 = getHolidays(2026)
    expect(h2026.length).toBe(20)
  })

  it('año sin puentes tiene 16 feriados', () => {
    const h2030 = getHolidays(2030)
    expect(h2030.length).toBe(16)
  })

  it('incluye nombre correcto para Navidad', () => {
    const h2026 = getHolidays(2026)
    const navidad = h2026.find((h) => h.date.getMonth() === 11 && h.date.getDate() === 25)
    expect(navidad?.name).toBe('Navidad')
  })

  it('incluye nombre Carnaval para días de carnaval', () => {
    const h2026 = getHolidays(2026)
    const carnavales = h2026.filter((h) => h.name === 'Carnaval')
    expect(carnavales.length).toBe(2)
  })
})

describe('getHolidayName', () => {
  it('retorna nombre del feriado para fecha válida', () => {
    expect(getHolidayName(new Date(2026, 4, 25))).toBe('Día de la Revolución de Mayo')
  })

  it('retorna undefined para día hábil', () => {
    expect(getHolidayName(new Date(2026, 3, 15))).toBeUndefined()
  })

  it('retorna nombre para Viernes Santo calculado', () => {
    expect(getHolidayName(new Date(2026, 3, 3))).toBe('Viernes Santo')
  })
})
