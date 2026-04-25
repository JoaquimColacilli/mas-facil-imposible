'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface GradientBgProps {
  from: string
  to: string
  angle?: number
}

export function GradientBg({ from, to, angle = 155 }: GradientBgProps) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`,
        zIndex: 0,
      }}
    />
  )
}

interface BlobBgProps {
  colors: [string, string, string?]
  opacity?: number
}

export function BlobBg({ colors, opacity = 0.75 }: BlobBgProps) {
  const [c1, c2, c3] = colors
  const third = c3 ?? c1
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div
        className="blob blob-a"
        style={{
          left: '-10%',
          top: '-12%',
          width: '70%',
          height: '55%',
          background: c1,
          opacity,
        }}
      />
      <div
        className="blob blob-b"
        style={{
          right: '-15%',
          top: '20%',
          width: '80%',
          height: '60%',
          background: c2,
          opacity: opacity * 0.85,
        }}
      />
      <div
        className="blob blob-c"
        style={{
          left: '15%',
          bottom: '-18%',
          width: '75%',
          height: '55%',
          background: third,
          opacity: opacity * 0.7,
        }}
      />
    </div>
  )
}

interface SlideWrapProps {
  children: React.ReactNode
  gradient: { from: string; to: string }
  blobs: [string, string, string?]
  blobOpacity?: number
  grain?: 'full' | 'soft' | 'none'
  className?: string
}

export function SlideWrap({
  children,
  gradient,
  blobs,
  blobOpacity = 0.55,
  grain = 'full',
  className,
}: SlideWrapProps) {
  const grainCls = grain === 'none' ? '' : grain === 'soft' ? 'grain grain-soft' : 'grain'
  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden text-white',
        grainCls,
        className,
      )}
    >
      <GradientBg from={gradient.from} to={gradient.to} />
      <BlobBg colors={blobs} opacity={blobOpacity} />
      <div className="relative h-full w-full flex flex-col" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}

interface SparklineProps {
  daily: number[]
  peakIdx: number
  height?: number
}

export function Sparkline({ daily, peakIdx, height = 64 }: SparklineProps) {
  if (daily.length < 2) return null
  const max = Math.max(...daily, 1)
  const w = 320
  const step = w / (daily.length - 1)
  const pts = daily.map((v, i) => [i * step, height - (v / max) * height] as const)
  const d = pts
    .map((p, i) => (i === 0 ? `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`))
    .join(' ')
  const area = `${d} L ${w} ${height} L 0 ${height} Z`
  const peak = pts[peakIdx] ?? pts[pts.length - 1]
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <path d={area} fill="rgba(255,255,255,0.18)" />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={peak[0]} y1={0} x2={peak[0]} y2={height} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />
      <circle cx={peak[0]} cy={peak[1]} r={5} fill="white" />
      <circle cx={peak[0]} cy={peak[1]} r={9} fill="none" stroke="white" strokeOpacity={0.5} />
    </svg>
  )
}

/**
 * Count-up hook — eases to `target` over `duration` ms using a cubic-out curve.
 * Returns the current tick. Respects prefers-reduced-motion (returns target immediately).
 */
export function useCountUp(target: number, duration = 900, deps: React.DependencyList = []) {
  const [value, setValue] = useState(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof document !== 'undefined' && document.hidden) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, ...deps])

  return value
}
