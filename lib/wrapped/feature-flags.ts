/**
 * Wrapped feature flags.
 *
 * Two env-driven switches so the feature can be rolled out (and rolled back)
 * independently on mobile and desktop:
 *
 *   NEXT_PUBLIC_WRAPPED_ENABLED   — master switch. False = chip hidden, no
 *                                   overlay mounts, regardless of device.
 *   NEXT_PUBLIC_WRAPPED_DESKTOP   — desktop sub-switch. False = desktop viewers
 *                                   fall back to the mobile phone-mockup
 *                                   experience while mobile users still get
 *                                   the full story.
 *
 * Defaults: both `true` in dev, both `false` in prod until we give go.
 */

function readFlag(raw: string | undefined, devDefault: boolean): boolean {
  if (raw === undefined) {
    return process.env.NODE_ENV !== 'production' ? devDefault : false
  }
  const normalized = raw.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true') return true
  if (normalized === '0' || normalized === 'false') return false
  return process.env.NODE_ENV !== 'production' ? devDefault : false
}

/** Master switch — if false, hide the chip and never mount the overlay. */
export function isWrappedEnabled(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_WRAPPED_ENABLED, true)
}

/**
 * Desktop sub-switch. Only meaningful when `isWrappedEnabled()` is true.
 * If false on a lg+ viewport, the overlay renders the existing mobile
 * phone-mockup experience instead of the editorial horizontal layout.
 */
export function isDesktopWrappedEnabled(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_WRAPPED_DESKTOP, true)
}

/**
 * Dev / QA mode. When true:
 *   - The banner bypasses the "first 5 days of the month" visibility gate
 *     and shows regardless of the current day of month.
 *   - The chip and the Wrapped overlay point to the **current** month
 *     instead of the previous one — so developers can see the feature
 *     against the month they're actively generating data on.
 *
 * Default: true in dev, false in prod. Flip to `false` in dev to rehearse
 * the prod behavior (previous-month + 5-day gate).
 */
export function isWrappedDevMode(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_WRAPPED_DEV, true)
}
