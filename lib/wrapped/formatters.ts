/**
 * es-AR number formatters for the Wrapped feature.
 * Mirror the ones in design-refs/wrapped-bundle/wrapped.data.js so the visual
 * output matches the approved design 1:1.
 */

export function fmtARS(n: number, withSign = false): string {
  const abs = Math.abs(n)
  const s = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs)
  const sign = withSign ? (n >= 0 ? '+ ' : '− ') : n < 0 ? '− ' : ''
  return sign + '$ ' + s
}

export function fmtARSd(n: number, withSign = false): string {
  const abs = Math.abs(n)
  const s = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)
  const sign = withSign ? (n >= 0 ? '+ ' : '− ') : n < 0 ? '− ' : ''
  return sign + '$ ' + s
}

export function fmtUSD(n: number): string {
  return (
    'U$S ' +
    new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(
      Math.abs(n),
    )
  )
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('es-AR').format(n)
}

export function fmtPct(n: number, withSign = true): string {
  const prefix = withSign && n >= 0 ? '+' : ''
  return (
    prefix +
    new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n) +
    '%'
  )
}
