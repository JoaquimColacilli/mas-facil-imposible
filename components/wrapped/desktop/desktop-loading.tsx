'use client'

/**
 * Editorial desktop loading state. Mirrors the slide-1 background palette so
 * the transition into the first slide once data arrives feels like the same
 * scene revealing detail, not a mode swap.
 *
 * Renders inside a 16:9 stage frame matching the slides — same rounded
 * corners, shadow, gradient and blobs — so the WrappedDesktop shell can drop
 * it in place while data is in flight.
 */

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { DesktopEyebrow, DesktopSlideWrap } from './desktop-slide-primitives'

interface WrappedDesktopLoadingProps {
  /** Optional secondary line under "Preparando tu mes". */
  hint?: string
  /** Wires a close X in the top-right corner — useful since arrows/Esc
   *  aren't bound while loading is on screen. */
  onClose?: () => void
}

export function WrappedDesktopLoading({
  hint = 'Calculando tu resumen…',
  onClose,
}: WrappedDesktopLoadingProps) {
  return (
    <div className="wrapped-root relative w-full h-full flex flex-col items-center justify-center px-8 py-10">
      {onClose && (
        <div className="w-full max-w-[1280px] flex items-center justify-end mb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>
      )}
      <div
        className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_-30px_rgba(0,0,0,.6)]"
        style={{
          height: 'clamp(420px, calc(100vh - 220px), 720px)',
          width: 'min(100%, 1280px, calc(clamp(420px, calc(100vh - 220px), 720px) * 16 / 9))',
          aspectRatio: '16 / 9',
        }}
      >
      <DesktopSlideWrap
        colors={['oklch(0.45 0.10 260)', 'oklch(0.55 0.12 220)', 'oklch(0.50 0.10 155)']}
      >
        <div className="col-span-7 flex flex-col justify-center stagger">
          <DesktopEyebrow>Preparando tu mes</DesktopEyebrow>
          <h1
            className="font-serif font-semibold mt-4 leading-[0.88] tracking-tight"
            style={{ fontSize: 'clamp(56px, 7vw, 96px)' }}
          >
            Juntando tus movimientos
          </h1>
          <div className="font-serif text-white/70 mt-4 text-[18px] leading-[1.4] pretty max-w-[480px]">
            {hint}
          </div>
          <div className="mt-8 flex flex-col gap-2.5 max-w-[420px]">
            <ShimmerBar widthPct={92} />
            <ShimmerBar widthPct={74} />
            <ShimmerBar widthPct={56} />
          </div>
        </div>
        <div className="col-span-5 relative flex items-center justify-center stagger">
          <div className="relative w-[260px] h-[260px] rounded-full grid place-items-center">
            {/* Concentric pulse rings — softer, slower than mobile spin so it
                doesn't visually shout on a 16:9 stage. */}
            <div
              className="absolute inset-0 rounded-full pulse-ring"
              style={{ border: '2px solid rgba(255,255,255,.35)' }}
            />
            <div
              className="absolute inset-6 rounded-full"
              style={{
                background: 'radial-gradient(closest-side, rgba(255,255,255,.18), transparent)',
              }}
            />
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-[3px] border-white/15" />
              <div className="absolute inset-0 rounded-full border-[3px] border-white/85 border-t-transparent wrapped-spin" />
            </div>
          </div>
        </div>
      </DesktopSlideWrap>
      </div>
    </div>
  )
}

/**
 * Indeterminate skeleton bar — a rounded pill that breathes (opacity loop)
 * via JS so we don't need a new keyframe in the global CSS for one place.
 */
function ShimmerBar({ widthPct }: { widthPct: number }) {
  const [opacity, setOpacity] = useState(0.55)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = ((now - start) / 1500) % 1
      // Ease in/out via cosine so it feels like a soft heartbeat.
      const o = 0.4 + 0.25 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2))
      setOpacity(o)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])
  return (
    <div
      className="h-3 rounded-full bg-white"
      style={{ width: `${widthPct}%`, opacity, transition: 'opacity 80ms linear' }}
    />
  )
}
