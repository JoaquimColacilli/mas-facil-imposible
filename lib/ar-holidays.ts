/**
 * Feriados nacionales argentinos y detección de días no operables (mercado).
 * Cubre feriados inamovibles, feriados calculables (Carnaval, Semana Santa)
 * y feriados puente/turísticos decretados por año.
 */

interface FixedHoliday {
  month: number
  day: number
  name: string
}

export interface Holiday {
  date: Date
  name: string
}

/** Feriados inamovibles — Ley 27.399 y complementarias */
export const FIXED_HOLIDAYS: FixedHoliday[] = [
  { month: 1, day: 1, name: 'Año Nuevo' },
  { month: 3, day: 24, name: 'Día de la Memoria' },
  { month: 4, day: 2, name: 'Día del Veterano y de los Caídos del Atlántico Sur' },
  { month: 5, day: 1, name: 'Día del Trabajador' },
  { month: 5, day: 25, name: 'Día de la Revolución de Mayo' },
  { month: 6, day: 20, name: 'Paso a la Inmortalidad del Gral. Güemes / Día de la Bandera' },
  { month: 7, day: 9, name: 'Día de la Independencia' },
  { month: 8, day: 17, name: 'Paso a la Inmortalidad del Gral. San Martín' },
  { month: 10, day: 12, name: 'Día del Respeto a la Diversidad Cultural' },
  { month: 11, day: 20, name: 'Día de la Soberanía Nacional' },
  { month: 12, day: 8, name: 'Inmaculada Concepción de María' },
  { month: 12, day: 25, name: 'Navidad' },
]

/**
 * Algoritmo de Computus (Meeus/Jones/Butcher) para calcular la fecha de Pascua.
 * Retorna la fecha del Domingo de Pascua para el año dado.
 */
export function computeEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/**
 * Feriados puente/turísticos por año — decretados anualmente por el gobierno.
 * Se pueblan manualmente cuando se publica el decreto (suele ser en diciembre).
 */
export const BRIDGE_HOLIDAYS: Record<number, FixedHoliday[]> = {
  2025: [
    { month: 5, day: 2, name: 'Feriado puente turístico' },
    { month: 8, day: 15, name: 'Feriado puente turístico' },
    { month: 11, day: 21, name: 'Feriado puente turístico' },
    { month: 12, day: 26, name: 'Feriado puente turístico' },
  ],
  2026: [
    { month: 3, day: 23, name: 'Feriado puente turístico' },
    { month: 7, day: 10, name: 'Feriado puente turístico' },
    { month: 10, day: 13, name: 'Feriado puente turístico' },
    { month: 12, day: 7, name: 'Feriado puente turístico' },
  ],
  // TODO: agregar feriados puente cuando se publique el decreto anual (suele ser en diciembre)
}

/**
 * Retorna todos los feriados nacionales de un año como array de { date, name }.
 * Incluye: fijos + Carnaval + Semana Santa + puente del año.
 */
export function getHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = []

  // Feriados inamovibles
  for (const h of FIXED_HOLIDAYS) {
    holidays.push({ date: new Date(year, h.month - 1, h.day), name: h.name })
  }

  // Feriados calculables a partir de Pascua
  const easter = computeEasterDate(year)
  const easterTime = easter.getTime()
  const DAY_MS = 86_400_000

  // Lunes de Carnaval (48 días antes de Pascua)
  holidays.push({ date: new Date(easterTime - 48 * DAY_MS), name: 'Carnaval' })
  // Martes de Carnaval (47 días antes de Pascua)
  holidays.push({ date: new Date(easterTime - 47 * DAY_MS), name: 'Carnaval' })
  // Jueves Santo (3 días antes de Pascua)
  holidays.push({ date: new Date(easterTime - 3 * DAY_MS), name: 'Jueves Santo' })
  // Viernes Santo (2 días antes de Pascua)
  holidays.push({ date: new Date(easterTime - 2 * DAY_MS), name: 'Viernes Santo' })

  // Feriados puente del año
  const bridge = BRIDGE_HOLIDAYS[year]
  if (bridge) {
    for (const h of bridge) {
      holidays.push({ date: new Date(year, h.month - 1, h.day), name: h.name })
    }
  }

  return holidays
}

/**
 * Busca si una fecha matchea un feriado y retorna su nombre, o undefined si no.
 */
export function getHolidayName(date: Date): string | undefined {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  const holidays = getHolidays(year)
  const match = holidays.find(
    (h) => h.date.getFullYear() === year && h.date.getMonth() === month && h.date.getDate() === day
  )
  return match?.name
}

/**
 * Retorna `true` si la fecha es un día no operable del mercado argentino:
 * sábado, domingo, o feriado nacional.
 */
export function isNonTradingDay(date: Date): boolean {
  const day = date.getDay()
  // 0 = domingo, 6 = sábado
  if (day === 0 || day === 6) return true

  return getHolidayName(date) !== undefined
}
