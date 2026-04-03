import { isNonTradingDay } from './ar-holidays'

export const WEEKEND_MESSAGES = [
  'Fin de semana 😴',
  'El mercado descansa 💤',
  'Modo domingo 🛋️',
  'Sin operaciones hoy 🌙',
  'Relax day 😎',
  'Fuera de horario 🏖️',
  'El mercado duerme 🌚',
  'Día libre 🎮',
  'Nada que operar 🧉',
  'Descansamos 🐌',
  'Off duty 🎧',
  'Pausa de mercado ⏸️',
  'Sin ruido de mercado 🤫',
  'Weekend vibes 🌿',
  'Hasta el lunes 👋',
]

export const HOLIDAY_MESSAGES = [
  'Feriado: {name} 🇦🇷',
  '¡Hoy es {name}! 🎉',
  'Feriado patrio: {name} 🇦🇷',
  'Mercado cerrado por {name} 🏛️',
  'Hoy se celebra {name} ✨',
  'Sin operaciones — {name} 🇦🇷',
  'Jornada no hábil: {name} 🎊',
  'El mercado honra {name} 🫡',
  'Día de {name} 🇦🇷',
  'Feriado nacional: {name} 🏠',
  'No se opera — {name} 🧉',
  'Cerrado por {name} 🎈',
  '¡Feliz {name}! 🇦🇷',
  'Hoy toca {name} 🌟',
  '{name} — sin mercado 🛌',
]

/**
 * Cuenta cuántos días no operables hay desde el 1 del mes hasta `date` (inclusive).
 * Retorna índice 0-based.
 */
export function nthNonTradingDay(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  let count = 0

  for (let d = 1; d <= day; d++) {
    if (isNonTradingDay(new Date(year, month, d))) {
      if (d === day) return count
      count++
    }
  }

  return count
}

/**
 * Fisher-Yates shuffle con PRNG determinístico (Linear Congruential Generator).
 * Misma seed = mismo orden, siempre.
 */
export function seededShuffle<T>(pool: readonly T[], seed: number): T[] {
  const arr = [...pool]
  let s = seed

  function nextRandom(): number {
    // LCG parameters (Numerical Recipes)
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr
}

/**
 * Retorna un mensaje descriptivo para un día no operable.
 * Determinístico: misma fecha = mismo mensaje. No se repite dentro del mes.
 */
export function getNonTradingMessage(date: Date, holidayName?: string): string {
  const pool = holidayName ? HOLIDAY_MESSAGES : WEEKEND_MESSAGES
  const seed = date.getFullYear() * 100 + date.getMonth()
  const shuffled = seededShuffle(pool, seed)
  const index = nthNonTradingDay(date)
  const msg = shuffled[index % shuffled.length]
  return holidayName ? msg.replace('{name}', holidayName) : msg
}
