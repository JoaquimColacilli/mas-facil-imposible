import { describe, it, expect } from 'vitest'
import { computeStreak } from './investment-streak'
import { isNonTradingDay } from './ar-holidays'

/** Mock simple: solo sábado y domingo son no-trading (sin feriados) */
function weekendOnly(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

describe('computeStreak', () => {
  // Semana 2026-03-16 (lun) a 2026-03-21 (sáb)
  // Lun=16, Mar=17, Mié=18, Jue=19, Vie=20, Sáb=21

  it('5 días hábiles consecutivos — streak = 5, pendingToday = false', () => {
    const logDates = new Set([
      '2026-03-16', // lunes
      '2026-03-17', // martes
      '2026-03-18', // miércoles
      '2026-03-19', // jueves
      '2026-03-20', // viernes
    ])
    const today = new Date(2026, 2, 20) // viernes 20/03

    const result = computeStreak(logDates, today, weekendOnly)
    expect(result.streak).toBe(5)
    expect(result.pendingToday).toBe(false)
  })

  it('streak sobrevive fin de semana — viernes + lunes siguiente', () => {
    const logDates = new Set([
      '2026-03-20', // viernes
      '2026-03-23', // lunes siguiente
    ])
    const today = new Date(2026, 2, 23) // lunes 23/03

    const result = computeStreak(logDates, today, weekendOnly)
    expect(result.streak).toBe(2)
    expect(result.pendingToday).toBe(false)
  })

  it('streak sobrevive feriado — 25 de mayo 2026 (lunes, Revolución de Mayo)', () => {
    // Vie 22/05 y Mar 26/05, el lunes 25/05 es feriado
    const logDates = new Set([
      '2026-05-22', // viernes
      '2026-05-26', // martes
    ])
    const today = new Date(2026, 4, 26) // martes 26/05

    const result = computeStreak(logDates, today, isNonTradingDay)
    expect(result.streak).toBe(2)
    expect(result.pendingToday).toBe(false)
  })

  it('día hábil sin snapshot rompe la racha — falta miércoles', () => {
    const logDates = new Set([
      '2026-03-16', // lunes
      '2026-03-17', // martes
      // falta miércoles 18
      '2026-03-19', // jueves
      '2026-03-20', // viernes
    ])
    const today = new Date(2026, 2, 20) // viernes 20/03

    const result = computeStreak(logDates, today, weekendOnly)
    expect(result.streak).toBe(2) // solo jueves + viernes
    expect(result.pendingToday).toBe(false)
  })

  it('logDates vacío — streak = 0, pendingToday depende de si hoy es hábil', () => {
    const logDates = new Set<string>()

    // Viernes (día hábil) → pendingToday = true
    const resultFri = computeStreak(logDates, new Date(2026, 2, 20), weekendOnly)
    expect(resultFri.streak).toBe(0)
    expect(resultFri.pendingToday).toBe(true)

    // Sábado (no hábil) → pendingToday = false
    const resultSat = computeStreak(logDates, new Date(2026, 2, 21), weekendOnly)
    expect(resultSat.streak).toBe(0)
    expect(resultSat.pendingToday).toBe(false)
  })

  it('hoy es día hábil sin log — pendingToday = true, streak cuenta días previos', () => {
    const logDates = new Set([
      '2026-03-16', // lunes
      '2026-03-17', // martes
      '2026-03-18', // miércoles
      '2026-03-19', // jueves
      // viernes 20 NO tiene log
    ])
    const today = new Date(2026, 2, 20) // viernes 20/03

    const result = computeStreak(logDates, today, weekendOnly)
    expect(result.streak).toBe(4)
    expect(result.pendingToday).toBe(true)
  })

  it('hoy es sábado (no hábil) — pendingToday = false, streak cuenta desde viernes', () => {
    const logDates = new Set([
      '2026-03-16', // lunes
      '2026-03-17', // martes
      '2026-03-18', // miércoles
      '2026-03-19', // jueves
      '2026-03-20', // viernes
    ])
    const today = new Date(2026, 2, 21) // sábado 21/03

    const result = computeStreak(logDates, today, weekendOnly)
    expect(result.streak).toBe(5)
    expect(result.pendingToday).toBe(false)
  })
})
