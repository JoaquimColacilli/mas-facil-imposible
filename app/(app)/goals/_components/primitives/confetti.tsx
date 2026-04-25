'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444']
const PIECES = 18

interface ConfettiProps {
  /** Auto-stops after this many ms. Default 2400 — one full fall cycle. */
  durationMs?: number
}

/** Fires once when mounted, then unmounts itself after the animation
 *  completes. Caller is responsible for deciding *whether* to mount it
 *  (see lib/goals.shouldShowConfetti). */
export function Confetti({ durationMs = 2400 }: ConfettiProps) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), durationMs)
    return () => clearTimeout(id)
  }, [durationMs])
  if (!visible) return null
  return (
    <div
      className="confetti pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: PIECES }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${5 + ((i * 5.3) % 90)}%`,
            top: -10,
            width: 6,
            height: 10,
            borderRadius: 1,
            background: COLORS[i % COLORS.length],
            animation: 'confetti-fall 2.4s ease-in forwards',
            animationDelay: `${i * 0.13}s`,
            transform: `rotate(${i * 27}deg)`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(140px) rotate(360deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          span { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
  )
}
