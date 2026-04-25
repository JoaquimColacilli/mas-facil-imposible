/**
 * Wrapped telemetry. Thin wrapper around @vercel/analytics so we can A/B the
 * desktop rediseño vs the phone-mockup experience and measure the completion
 * funnel.
 *
 * Two events:
 *   - wrapped_slide_viewed  { index, device, monthYear }
 *       fires once per slide per session (dedup per open so a user scrubbing
 *       back-and-forth doesn't inflate counts).
 *   - wrapped_completed     { device, monthYear }
 *       fires the first time the last slide is reached in a given session.
 *
 * `monthYear` is the MM-YYYY of the data being reviewed, not the current
 * clock month — important because the user can open the Wrapped retroactively.
 */

import { track } from '@vercel/analytics'

export type WrappedDevice = 'mobile' | 'desktop'

function safeTrack(name: string, props: Record<string, string | number>) {
  try {
    track(name, props)
  } catch {
    // Vercel Analytics may be blocked (ad-block, opt-out). Dropping the
    // event is preferable to crashing the overlay.
  }
}

export function trackSlideViewed(params: {
  index: number
  device: WrappedDevice
  monthYear: string
}) {
  safeTrack('wrapped_slide_viewed', params)
}

export function trackCompleted(params: {
  device: WrappedDevice
  monthYear: string
}) {
  safeTrack('wrapped_completed', params)
}

/** Format MM-YYYY, zero-padded. month0 is 0-based. */
export function monthYearKey(year: number, month0: number): string {
  return `${String(month0 + 1).padStart(2, '0')}-${year}`
}
