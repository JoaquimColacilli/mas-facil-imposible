/**
 * Persists the current slide index of the Wrapped overlay so the user can
 * cross devices mid-recorrido: start on mobile at slide 4, pick it up on
 * laptop at slide 4 desktop. Key is scoped per month (year_month) because the
 * Wrapped is month-bound — once the month changes, progress resets naturally.
 *
 * Key format: `mfi_wrapped_progress_${year}_${month0based+1, 2-digit}`
 * e.g. April 2026 → `mfi_wrapped_progress_2026_04`
 *
 * Stored as a plain integer string. Index is clamped to [0, total-1] on read
 * to survive future slide count changes.
 */

const KEY_PREFIX = 'mfi_wrapped_progress_'

function keyFor(year: number, month0: number): string {
  const mm = String(month0 + 1).padStart(2, '0')
  return `${KEY_PREFIX}${year}_${mm}`
}

export function readWrappedProgress(
  year: number,
  month0: number,
  slideCount: number,
): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(keyFor(year, month0))
    if (raw === null) return 0
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 0) return 0
    return Math.min(n, Math.max(0, slideCount - 1))
  } catch {
    return 0
  }
}

export function writeWrappedProgress(
  year: number,
  month0: number,
  index: number,
): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(keyFor(year, month0), String(index))
  } catch {
    // Quota or privacy mode — silently drop, cross-device resume just
    // degrades to "start at 0" which matches first-time behavior.
  }
}

export function clearWrappedProgress(year: number, month0: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(keyFor(year, month0))
  } catch {}
}
