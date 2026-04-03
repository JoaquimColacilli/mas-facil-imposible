import { describe, it, expect } from 'vitest'
import {
  computeEasterDate,
  isNonTradingDay,
  getHolidays,
  getHolidayName,
  applyTransferRule,
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

describe('applyTransferRule', () => {
  it('lunes → queda igual', () => {
    // 2026-08-17 es lunes
    const d = applyTransferRule(new Date(2026, 7, 17))
    expect(d.getDate()).toBe(17)
  })

  it('martes → lunes anterior', () => {
    // 2027-10-12 es martes
    const d = applyTransferRule(new Date(2027, 9, 12))
    expect(d.getDate()).toBe(11) // lunes 11
  })

  it('miércoles → lunes anterior', () => {
    // 2025-11-20 es jueves... busco un miércoles: 2026-08-12 es miércoles
    const d = applyTransferRule(new Date(2026, 7, 12))
    expect(d.getDate()).toBe(10) // lunes 10
  })

  it('jueves → lunes siguiente', () => {
    // 2025-11-20 es jueves
    const d = applyTransferRule(new Date(2025, 10, 20))
    expect(d.getDate()).toBe(24) // lunes 24
  })

  it('viernes → lunes siguiente', () => {
    // 2026-11-20 es viernes
    const d = applyTransferRule(new Date(2026, 10, 20))
    expect(d.getDate()).toBe(23) // lunes 23
  })

  it('domingo → lunes siguiente', () => {
    // 2025-10-12 es domingo
    const d = applyTransferRule(new Date(2025, 9, 12))
    expect(d.getDate()).toBe(13) // lunes 13
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

  it('Soberanía 2026 trasladado al lunes 23/11 → true', () => {
    expect(isNonTradingDay(new Date(2026, 10, 23))).toBe(true)
  })

  it('20/11/2026 (fecha original Soberanía, viernes) → false (fue trasladado)', () => {
    expect(isNonTradingDay(new Date(2026, 10, 20))).toBe(false)
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

  // 2026: 10 fijos + 3 trasladables + 4 calculables (Pascua) + 3 puentes = 20
  it('2026 tiene 20 feriados', () => {
    const h2026 = getHolidays(2026)
    expect(h2026.length).toBe(20)
  })

  // Sin puentes: 10 fijos + 3 trasladables + 4 calculables = 17
  it('año sin puentes tiene 17 feriados', () => {
    const h2030 = getHolidays(2030)
    expect(h2030.length).toBe(17)
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

  it('incluye 17 de junio (Güemes) como feriado separado', () => {
    const h2026 = getHolidays(2026)
    const guemes = h2026.find((h) => h.date.getMonth() === 5 && h.date.getDate() === 17)
    expect(guemes?.name).toBe('Paso a la Inmortalidad del Gral. Güemes')
  })

  it('incluye 20 de junio (Bandera) como feriado separado', () => {
    const h2026 = getHolidays(2026)
    const bandera = h2026.find((h) => h.date.getMonth() === 5 && h.date.getDate() === 20)
    expect(bandera?.name).toBe('Día de la Bandera')
  })

  it('13 de octubre 2026 NO es feriado (puente eliminado)', () => {
    const h2026 = getHolidays(2026)
    const oct13 = h2026.find((h) => h.date.getMonth() === 9 && h.date.getDate() === 13)
    expect(oct13).toBeUndefined()
  })

  it('Soberanía 2026 cae el 23/11 (trasladado desde viernes 20)', () => {
    const h2026 = getHolidays(2026)
    const soberania = h2026.find((h) => h.name === 'Día de la Soberanía Nacional')
    expect(soberania?.date.getMonth()).toBe(10)
    expect(soberania?.date.getDate()).toBe(23)
  })

  it('Diversidad Cultural 2027 se traslada al lunes 11/10 (martes 12 → lunes anterior)', () => {
    const h2027 = getHolidays(2027)
    const diversidad = h2027.find((h) => h.name === 'Día del Respeto a la Diversidad Cultural')
    expect(diversidad?.date.getMonth()).toBe(9)
    expect(diversidad?.date.getDate()).toBe(11)
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

  it('retorna Güemes para 17 de junio', () => {
    expect(getHolidayName(new Date(2026, 5, 17))).toBe('Paso a la Inmortalidad del Gral. Güemes')
  })

  it('retorna Bandera para 20 de junio', () => {
    expect(getHolidayName(new Date(2026, 5, 20))).toBe('Día de la Bandera')
  })
})
