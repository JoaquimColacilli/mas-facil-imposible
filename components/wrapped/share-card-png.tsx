'use client'

import { createRoot } from 'react-dom/client'
import type { WrappedData } from '@/lib/wrapped/types'
import { bakeOklchInTree } from '@/lib/wrapped/oklch'
import { ShareCard } from './share-card'
import './wrapped-styles.css'

/**
 * Render the ShareCard off-screen at a fixed pixel size, convert to PNG via
 * html-to-image, and trigger a download. We build an isolated React root so
 * the card is fully mounted (avoiding partial hydration of fonts/blobs).
 */
export async function renderShareCardToPNG(
  data: WrappedData,
  ratio: 'feed' | 'story',
): Promise<void> {
  const [width, height] = ratio === 'story' ? [1080, 1920] : [1080, 1350]

  // Off-screen host. `left: -99999px` keeps layout but hides it from the user.
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-99999px'
  host.style.top = '0'
  host.style.width = `${width}px`
  host.style.height = `${height}px`
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'
  document.body.appendChild(host)

  const root = createRoot(host)
  root.render(
    <div
      className="wrapped-root"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <ShareCard data={data} ratio={ratio} flat />
    </div>,
  )

  // Give React + CSS + fonts a frame to settle before snapshotting.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
  await document.fonts?.ready?.catch(() => undefined)
  await new Promise((r) => setTimeout(r, 120))

  // Bake any `oklch(...)` colors in the off-screen tree to hex. html-to-image
  // serializes the DOM into an <foreignObject> SVG and asks canvas to rasterize
  // it; modern color formats often come back as transparent/black there. The
  // walker only touches our isolated host, never the live UI.
  bakeOklchInTree(host)

  try {
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(host, {
      width,
      height,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: '#0a0a0a',
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `MFI_Wrapped_${data.monthKey}${ratio === 'story' ? '_story' : ''}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    root.unmount()
    host.remove()
  }
}
