'use client'

import { SlideWrap } from './slide-primitives'

interface WrappedLoadingProps {
  /** Optional "87 movimientos · calculando balance…" line. Omit to hide. */
  hint?: string
}

export function WrappedLoading({ hint }: WrappedLoadingProps) {
  return (
    <div className="wrapped-root absolute inset-0 bg-black" style={{ zIndex: 2 }}>
      <SlideWrap
        gradient={{ from: 'oklch(0.45 0.12 155)', to: 'oklch(0.50 0.10 65)' }}
        blobs={['oklch(0.65 0.14 155)', 'oklch(0.68 0.12 65)', 'oklch(0.55 0.14 295)']}
        blobOpacity={0.45}
      >
        <div className="pt-16 px-6 text-white/80 text-[12px] uppercase tracking-[0.22em] font-medium text-center">
          Preparando tu mes
        </div>
        <div className="flex-1 px-6 flex flex-col items-center justify-center gap-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-white/15" />
            <div className="absolute inset-0 rounded-full border-4 border-white/80 border-t-transparent wrapped-spin" />
          </div>
          <div className="text-center space-y-2">
            <div className="font-serif font-semibold text-white text-lg">Juntando tus movimientos</div>
            {hint && <div className="text-white/75 text-sm">{hint}</div>}
          </div>
          <div className="w-full space-y-2 mt-2">
            <div
              className="h-12 rounded-xl shimmer"
              style={{ background: 'rgba(255,255,255,.15)' }}
            />
            <div
              className="h-12 rounded-xl shimmer"
              style={{ background: 'rgba(255,255,255,.15)', animationDelay: '0.2s' }}
            />
            <div
              className="h-12 rounded-xl w-3/4 shimmer"
              style={{ background: 'rgba(255,255,255,.15)', animationDelay: '0.4s' }}
            />
          </div>
        </div>
        <div className="shrink-0 pb-16 text-center text-white/60 text-[11px]">MFI · {new Date().getFullYear()}</div>
      </SlideWrap>
    </div>
  )
}
