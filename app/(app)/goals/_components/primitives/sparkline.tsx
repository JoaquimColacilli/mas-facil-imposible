'use client'

import { useId } from 'react'

interface SparklineProps {
  data: number[]
  /** Optional target line to render as a dashed reference. */
  target?: number
  color: string
  height?: number
  /** Width is purely for the SVG viewBox; the element scales to its container. */
  width?: number
  showDots?: boolean
}

/** Cumulative-deposits sparkline. Caller decides whether to render at all
 *  (we don't fake a line at 0 — see lib/goals.buildSeries). */
export function Sparkline({
  data,
  target,
  color,
  height = 56,
  width = 240,
  showDots = false,
}: SparklineProps) {
  const id = useId().replace(/:/g, '')
  if (data.length === 0) return null

  const max = Math.max(target ?? -Infinity, ...data)
  const pad = 4
  const w = width
  const h = height
  const points = data.map((v, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2)
    const y = h - pad - (v / Math.max(1, max)) * (h - pad * 2)
    return [x, y, v] as const
  })
  const path = points
    .map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1))
    .join(' ')
  const areaPath =
    path +
    ` L ${points[points.length - 1][0]} ${h - pad} L ${points[0][0]} ${h - pad} Z`
  const last = points[points.length - 1]
  const targetY =
    target != null ? h - pad - (target / Math.max(1, max)) * (h - pad * 2) : null

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      {targetY != null && (
        <line
          x1={pad}
          x2={w - pad}
          y1={targetY}
          y2={targetY}
          stroke={color}
          strokeOpacity={0.35}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showDots &&
        points.slice(0, -1).map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={2} fill={color} fillOpacity={0.55} />
        ))}
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={color} stroke="white" strokeWidth={1.5} />
    </svg>
  )
}
