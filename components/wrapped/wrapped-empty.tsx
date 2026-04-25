'use client'

import { X } from 'lucide-react'
import { SlideWrap } from './slide-primitives'

interface WrappedEmptyProps {
  monthLabel: string
  year: number
  onClose: () => void
  onAddTransaction?: () => void
}

export function WrappedEmpty({ monthLabel, year, onClose, onAddTransaction }: WrappedEmptyProps) {
  return (
    <div className="wrapped-root absolute inset-0 bg-black" style={{ zIndex: 2 }}>
      <SlideWrap
        gradient={{ from: 'oklch(0.45 0.10 260)', to: 'oklch(0.48 0.10 155)' }}
        blobs={['oklch(0.58 0.12 260)', 'oklch(0.62 0.12 155)', 'oklch(0.58 0.10 230)']}
        blobOpacity={0.45}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-4 w-8 h-8 rounded-full grid place-items-center bg-black/20 backdrop-blur text-white/90 hover:bg-black/30"
          style={{ zIndex: 20 }}
          aria-label="Cerrar"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
        <div className="flex-1 px-8 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl grid place-items-center bg-white/15 border border-white/22 text-3xl">🍃</div>
          <div className="font-serif font-bold text-white text-[22px] leading-tight balance">
            Tu {monthLabel.toLowerCase()} estuvo tranquilo
          </div>
          <p className="text-white/85 text-[15px] pretty max-w-[280px]">
            Agregá movimientos a lo largo del mes y te armamos un resumen con los datos más interesantes.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 w-full max-w-[280px]">
            <EmptyStat label="Movs" value="0" />
            <EmptyStat label="Ahorro" value="$ 0" />
            <EmptyStat label="Metas" value="0" />
          </div>
          {onAddTransaction && (
            <button
              type="button"
              onClick={onAddTransaction}
              className="mt-3 h-11 px-5 rounded-xl bg-white font-serif font-semibold shadow-lg"
              style={{ color: 'oklch(0.50 0.10 155)' }}
            >
              Agregar un movimiento
            </button>
          )}
        </div>
        <div className="shrink-0 pb-16 text-center text-white/60 text-[11px]">
          Nos vemos el próximo cierre 👋 · {year}
        </div>
      </SlideWrap>
    </div>
  )
}

function EmptyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2 bg-white/10 border border-white/18 text-center">
      <div className="text-white/60 text-[10px] uppercase tracking-wider font-medium">{label}</div>
      <div className="font-mono text-white text-sm mt-0.5">{value}</div>
    </div>
  )
}
