/**
 * Lógica pura de streak de inversiones — sin dependencias de React ni @/ aliases.
 * Usado por el widget y los tests.
 */

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function computeStreak(
  logDates: Set<string>,
  today: Date,
  isNonTradingDayFn: (date: Date) => boolean
): { streak: number; pendingToday: boolean } {
  let streak = 0
  let pendingToday = false

  const cursor = new Date(today)
  let isFirstTradingDay = true

  while (true) {
    const iso = toISO(cursor)

    if (isNonTradingDayFn(cursor)) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    // It's a trading day
    if (logDates.has(iso)) {
      streak++
      isFirstTradingDay = false
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    // Trading day with no log
    if (isFirstTradingDay && toISO(today) === iso) {
      pendingToday = true
      isFirstTradingDay = false
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    // Past trading day with no log — streak breaks
    break
  }

  return { streak, pendingToday }
}
