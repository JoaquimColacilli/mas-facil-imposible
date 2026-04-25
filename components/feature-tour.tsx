'use client'

import { useEffect, useRef } from 'react'
import { driver, type Driver } from 'driver.js'

const TOUR_KEY = 'image_upload_v1'
const LS_KEY = `tour_${TOUR_KEY}`

const TITLE = 'Cargá gastos con una foto o PDF'
const DESCRIPTION =
  'Tocá este botón para sacarle foto a un ticket, subir un screenshot de transferencia o cargar el resumen de tu tarjeta. Si preferís, podés cargar a mano desde acá también.'

interface Props {
  seenTours: Record<string, string>
}

/**
 * Mounts a one-shot driver.js tour for the "image upload" feature.
 * Renders nothing — driver.js owns its own portal.
 *
 * Persistence is two-layer:
 *  - DB (`profiles.tours_seen`) — survives across devices.
 *  - localStorage cache — survives a flaky write to the DB and prevents
 *    the tour from showing twice in the same tab before the server reflects.
 *
 * Selectors:
 *  - desktop (>=768px): [data-tour="image-upload-button"]
 *  - mobile  (<768px):  [data-tour="quick-add-trigger"]
 *
 * If neither anchor is in the DOM after two attempts, falls back to a
 * centered popover (no spotlight).
 */
export function FeatureTour({ seenTours }: Props) {
  const driverRef = useRef<Driver | null>(null)

  useEffect(() => {
    // Cache from server wins over local; if server says seen, sync localStorage.
    if (seenTours[TOUR_KEY]) {
      try { localStorage.setItem(LS_KEY, '1') } catch {}
      return
    }
    // Local cache wins as a guard against duplicate runs in the same tab.
    try {
      if (localStorage.getItem(LS_KEY) === '1') return
    } catch {}

    const ATTEMPTS: { delay: number; selector: string | null }[] = []
    const isMobile = window.innerWidth < 768
    const selector = isMobile
      ? '[data-tour="quick-add-trigger"]'
      : '[data-tour="image-upload-button"]'
    ATTEMPTS.push({ delay: 600, selector })
    ATTEMPTS.push({ delay: 400, selector })
    ATTEMPTS.push({ delay: 0, selector: null }) // centered fallback

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    function start(target: string | null) {
      if (cancelled) return

      const overlayColor = (() => {
        try {
          const isDark = document.documentElement.classList.contains('dark')
          if (isDark) return '#000000'
          const bg = getComputedStyle(document.documentElement)
            .getPropertyValue('--background')
            .trim()
          return bg || '#000000'
        } catch {
          return '#000000'
        }
      })()

      const d = driver({
        showProgress: false,
        showButtons: ['next'],
        nextBtnText: 'Listo',
        doneBtnText: 'Listo',
        allowClose: true,
        animate: true,
        smoothScroll: true,
        overlayColor,
        overlayOpacity: 0.55,
        popoverClass: 'mfi-tour',
        steps: [
          {
            element: target ?? undefined,
            popover: {
              title: TITLE,
              description: DESCRIPTION,
              side: 'bottom',
              align: 'end',
            },
          },
        ],
        onDestroyed: handleDone,
      })
      driverRef.current = d
      d.drive()
    }

    function tryStart(idx: number) {
      if (cancelled) return
      const attempt = ATTEMPTS[idx]
      timer = setTimeout(() => {
        if (cancelled) return
        if (attempt.selector === null) {
          start(null)
          return
        }
        const el = document.querySelector(attempt.selector)
        if (el) {
          start(attempt.selector)
        } else if (idx + 1 < ATTEMPTS.length) {
          tryStart(idx + 1)
        }
      }, attempt.delay)
    }

    tryStart(0)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      // Tear down the popover if the user navigates away mid-tour.
      try {
        driverRef.current?.destroy()
      } catch {}
      driverRef.current = null
    }
  }, [seenTours])

  return null
}

function handleDone() {
  try { localStorage.setItem(LS_KEY, '1') } catch {}
  // Fire-and-forget; UX must not block on this. localStorage already
  // protects against re-showing in the same tab.
  void (async () => {
    try {
      const { markTourSeen } = await import('@/app/(app)/settings/actions')
      const res = await markTourSeen(TOUR_KEY)
      if (!res.ok) console.warn('[tour] markTourSeen returned !ok')
    } catch (err) {
      console.warn('[tour] markTourSeen failed', err)
    }
  })()
}
