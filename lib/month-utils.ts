/** Returns previous month info based on Argentina timezone. */
export function getPreviousMonthRange() {
  const now = new Date()
  const argDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [argYear, argMonth, argDay] = argDate.split('-').map(Number)

  // Previous month
  let prevYear = argYear
  let prevMonth = argMonth - 1
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear -= 1
  }

  const key = `${prevYear}-${String(prevMonth).padStart(2, '0')}`
  const label = new Date(prevYear, prevMonth - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })

  return { key, label, day: argDay }
}

/** Returns current month info based on Argentina timezone. */
export function getCurrentMonthRange() {
  const now = new Date()
  const argDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [argYear, argMonth, argDay] = argDate.split('-').map(Number)

  const key = `${argYear}-${String(argMonth).padStart(2, '0')}`
  const label = new Date(argYear, argMonth - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })

  return { key, label, day: argDay }
}
