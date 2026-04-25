'use client'

import { cn } from '@/lib/utils'

interface DesktopSlideWrapProps {
  colors: [string, string, string?]
  children: React.ReactNode
  className?: string
}

/**
 * Full-stage slide wrapper for the desktop editorial layout.
 * - Gradient 135° from colors[0] → colors[1]
 * - Three blurred blobs (colors[0], colors[1], colors[2] ?? colors[0])
 * - Inner 12-col grid with px-24 py-16 (matches design-refs/wrapped-bundle/wrapped.desktop.js)
 *
 * The stage container sets `--wrapped-hero-scale` (CSS var) which hero numbers
 * can multiply with `calc(var(--wrapped-hero-scale, 1) * ...)`. Used to
 * shrink oversized type on laptops <520px tall.
 */
export function DesktopSlideWrap({ colors, children, className }: DesktopSlideWrapProps) {
  const [c1, c2, c3Raw] = colors
  const c3 = c3Raw ?? c1
  return (
    <div className={cn('relative w-full h-full overflow-hidden text-white', className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          zIndex: 0,
        }}
      />
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="wd-blob"
          style={{
            left: '-8%',
            top: '-15%',
            width: '45%',
            height: '60%',
            background: c1,
            filter: 'blur(90px)',
            opacity: 0.55,
          }}
        />
        <div
          className="wd-blob"
          style={{
            right: '-10%',
            bottom: '-20%',
            width: '50%',
            height: '65%',
            background: c2,
            filter: 'blur(100px)',
            opacity: 0.55,
          }}
        />
        <div
          className="wd-blob"
          style={{
            left: '30%',
            bottom: '-10%',
            width: '40%',
            height: '40%',
            background: c3,
            filter: 'blur(110px)',
            opacity: 0.4,
          }}
        />
      </div>
      <div
        className="relative h-full grid grid-cols-12 gap-10 px-24 py-16"
        style={{ zIndex: 1 }}
      >
        {children}
      </div>
    </div>
  )
}

export function DesktopEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[12px] tracking-[0.2em] uppercase text-white/70">
      {children}
    </div>
  )
}

interface ScaledHeroProps {
  /** The font-size expression (e.g. "clamp(80px, 11vw, 180px)") to scale. */
  fontSize: string
  /** Tailwind classes for weight/leading/tracking/color. */
  className?: string
  color?: string
  children: React.ReactNode
  as?: 'div' | 'h1' | 'h2' | 'span'
}

/**
 * Wraps hero numbers/titles with a `calc(var(--wrapped-hero-scale, 1) * …)`
 * font-size so the stage wrapper can collapse oversized type on short
 * laptops (< 520px stage height).
 */
export function ScaledHero({
  fontSize,
  className,
  color,
  children,
  as = 'div',
}: ScaledHeroProps) {
  const Tag = as
  return (
    <Tag
      className={cn('font-serif font-semibold leading-[0.92] tracking-tight', className)}
      style={{
        fontSize: `calc(var(--wrapped-hero-scale, 1) * (${fontSize}))`,
        color,
      }}
    >
      {children}
    </Tag>
  )
}
