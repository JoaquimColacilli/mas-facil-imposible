'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Props {
  urls: string[]
  className?: string
}

/** Tile layout for up to 4 images. Click opens a lightbox dialog. */
export function ImageGrid({ urls, className }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (!urls || urls.length === 0) return null

  const count = urls.length
  const gridClass =
    count === 1
      ? 'grid-cols-1'
      : count === 2
        ? 'grid-cols-2'
        : count === 3
          ? 'grid-cols-2 [&>*:first-child]:row-span-2'
          : 'grid-cols-2'
  const ratio =
    count === 1 ? 'aspect-[16/10]' : count === 3 ? 'auto-rows-[140px]' : 'aspect-square'

  return (
    <>
      <div
        className={cn(
          'grid gap-1.5 rounded-lg overflow-hidden',
          gridClass,
          count === 3 ? 'auto-rows-[140px]' : '',
          className,
        )}
      >
        {urls.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setLightboxIdx(i)
            }}
            className={cn(
              'relative overflow-hidden rounded-md border border-border bg-muted/40 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              count === 1 ? ratio : '',
              count === 2 ? 'aspect-square' : '',
              count === 3 && i === 0 ? 'row-span-2 h-full' : '',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>

      <Dialog
        open={lightboxIdx !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxIdx(null)
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[92vw] sm:max-w-5xl p-0 bg-black/90 border-0"
        >
          <DialogTitle className="sr-only">Imagen adjunta</DialogTitle>
          {lightboxIdx !== null && (
            <div
              className="relative grid place-items-center min-h-[60vh]"
              onClick={() => setLightboxIdx(null)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIdx(null)
                }}
                className="absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[lightboxIdx]}
                alt=""
                className="max-h-[85vh] max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
