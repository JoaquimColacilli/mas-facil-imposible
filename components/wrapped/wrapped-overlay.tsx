'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { WrappedData } from '@/lib/wrapped/types'
import { PERSONALITIES } from '@/lib/wrapped/personalities'
import { isDesktopWrappedEnabled } from '@/lib/wrapped/feature-flags'
import {
  readWrappedProgress,
  writeWrappedProgress,
} from '@/lib/wrapped/progress-storage'
import {
  monthYearKey,
  trackCompleted,
  trackSlideViewed,
  type WrappedDevice,
} from '@/lib/wrapped/analytics'
import { WrappedStory } from './wrapped-story'
import { WrappedLoading } from './wrapped-loading'
import { WrappedEmpty } from './wrapped-empty'
import { ShareToCommunityDialog } from './share-to-community-dialog'
import { WrappedDesktop } from './desktop/wrapped-desktop'
import { WrappedDesktopLoading } from './desktop/desktop-loading'
import { DESKTOP_SLIDE_COMPONENTS } from './desktop/desktop-slides'
import { SLIDE_COMPONENTS } from './slides'
import './wrapped-styles.css'

type LoadingAction = 'share' | 'excel' | 'pdf' | 'wrapped-pdf' | null

interface WrappedOverlayProps {
  /** `null` = still loading. Wrapped always mounts into a portal on the body. */
  data: WrappedData | null
  onClose: () => void
  onDownloadExcel?: () => Promise<void> | void
  onDownloadPDF?: () => Promise<void> | void
  /** Called when user confirms publish — should create the community post. */
  currentUserId: string
}

const PHONE_W = 390
const PHONE_H = 844
const DESKTOP_QUERY = '(min-width: 1024px)'

export function WrappedOverlay({
  data,
  onClose,
  onDownloadExcel,
  onDownloadPDF,
  currentUserId,
}: WrappedOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const router = useRouter()

  // Slide index lives here so switching mode (mobile↔desktop) on resize keeps
  // the user on the same chapter. `null` means "not yet hydrated from storage"
  // — guards against flash of slide 0 when the resume is later in the deck.
  const [slideIndex, setSlideIndex] = useState<number | null>(null)

  // Dedupe analytics events per open: once a slide has been seen we don't
  // double-fire `wrapped_slide_viewed`, and we only fire `wrapped_completed`
  // once per session even if the user jumps back and then forward again.
  const viewedSetRef = useRef<Set<number>>(new Set())
  const completedFiredRef = useRef(false)

  const desktopFlagEnabled = useMemo(() => isDesktopWrappedEnabled(), [])

  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // matchMedia-driven breakpoint so the mode flips live when the user resizes
  // the window (e.g. docks a laptop to a monitor mid-story).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(DESKTOP_QUERY)
    const apply = () => setIsDesktopViewport(mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [])

  // Hydrate slide index from localStorage once data arrives — the key is
  // scoped by (year, month0) which we only know from the fetched data.
  useEffect(() => {
    if (!data) return
    if (slideIndex !== null) return
    const month0 = parseMonth0FromData(data)
    const totalForPersisted = data.empty
      ? 1
      : isDesktopViewport && desktopFlagEnabled
        ? DESKTOP_SLIDE_COMPONENTS.length
        : SLIDE_COMPONENTS.length
    const resumed = readWrappedProgress(data.year, month0, totalForPersisted)
    setSlideIndex(resumed)
  }, [data, desktopFlagEnabled, isDesktopViewport, slideIndex])

  const handleIndexChange = useCallback(
    (next: number) => {
      if (!data) return
      if (next === slideIndex && viewedSetRef.current.has(next)) return
      setSlideIndex(next)
      const month0 = parseMonth0FromData(data)
      writeWrappedProgress(data.year, month0, next)

      const device: WrappedDevice =
        isDesktopViewport && desktopFlagEnabled ? 'desktop' : 'mobile'
      const my = monthYearKey(data.year, month0)

      if (!viewedSetRef.current.has(next)) {
        viewedSetRef.current.add(next)
        trackSlideViewed({ index: next, device, monthYear: my })
      }

      // Completion fires when the last slide is reached, regardless of device.
      // Desktop and mobile have the same slide count (10), so indexing is
      // symmetric; if they diverge in the future we'd need per-device totals.
      const total =
        device === 'desktop'
          ? DESKTOP_SLIDE_COMPONENTS.length
          : SLIDE_COMPONENTS.length
      if (next >= total - 1 && !completedFiredRef.current) {
        completedFiredRef.current = true
        trackCompleted({ device, monthYear: my })
      }
    },
    [data, desktopFlagEnabled, isDesktopViewport, slideIndex],
  )

  // Re-arranca el recorrido desde slide 0. Reset del localStorage + de los
  // sets de dedupe de analytics, para que si el user re-recorre disparamos
  // `wrapped_slide_viewed` nuevamente (y `wrapped_completed` al llegar otra
  // vez al final). El index tracking del parent se re-hidrata vía
  // `onIndexChange` que fire la slide al remontar.
  //
  // Tiene que vivir arriba de cualquier early return — es un hook.
  const handleRestart = useCallback(() => {
    if (!data) return
    const month0 = parseMonth0FromData(data)
    writeWrappedProgress(data.year, month0, 0)
    viewedSetRef.current = new Set()
    completedFiredRef.current = false
    setSlideIndex(0)
  }, [data])

  if (!mounted) return null

  const handleDownloadExcel = async () => {
    if (!onDownloadExcel) return
    setLoadingAction('excel')
    try {
      await onDownloadExcel()
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDownloadPDF = async () => {
    if (!onDownloadPDF) return
    setLoadingAction('pdf')
    try {
      await onDownloadPDF()
    } finally {
      setLoadingAction(null)
    }
  }

  /**
   * Before: rendered the ShareCard off-screen and snapshotted it with
   * html-to-image. That path kept producing a black image because oklch()
   * colors inside foreignObject SVG don't rasterize reliably on any major
   * canvas engine. We now hand-draw the share layout with jsPDF — no DOM
   * snapshot, no oklch in the pipeline, reliable on every browser.
   */
  const handleDownloadWrappedPDF = async () => {
    if (!data) return
    setLoadingAction('wrapped-pdf')
    try {
      const { generateWrappedPDF } = await import('@/lib/wrapped/wrapped-pdf')
      await generateWrappedPDF(data)
      toast.success('PDF guardado')
    } catch (err) {
      console.error('[Wrapped] PDF export failed', err)
      toast.error('No pudimos generar el PDF')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleShare = () => {
    if (!data) return
    setShareOpen(true)
  }

  const handlePublished = (postId: string) => {
    setShareOpen(false)
    toast.success('Tu resumen está publicado')
    router.push(`/comunidad/${postId}`)
  }

  // Editorial desktop: lg+ AND sub-flag on. Fully replaces the phone mockup.
  const isDesktopEditorial = isDesktopViewport && desktopFlagEnabled

  // The desktop editorial path renders three distinct screens depending on
  // state. Empty state intentionally falls back to the phone mockup — it's a
  // rare corner case (full month with zero movements) and not worth a fourth
  // editorial layout right now.
  const desktopReady =
    data !== null && !data.empty && slideIndex !== null

  const overlay = (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Tu Mes en MFI"
    >
      <DesktopBackground data={data} show={isDesktopViewport && !!data} />

      {isDesktopEditorial && desktopReady ? (
        <WrappedDesktop
          data={data}
          initialIndex={slideIndex!}
          onIndexChange={handleIndexChange}
          onClose={onClose}
          onShare={handleShare}
          onDownloadWrappedPDF={handleDownloadWrappedPDF}
          onRestart={handleRestart}
          loadingAction={
            loadingAction === 'share' || loadingAction === 'wrapped-pdf' ? loadingAction : null
          }
        />
      ) : isDesktopEditorial && (data === null || (data && !data.empty)) ? (
        // Editorial loading — covers both "fetch in flight" and "data here
        // but slideIndex still hydrating from localStorage". Hint copy stays
        // generic so the second case doesn't flash a confusing message.
        <WrappedDesktopLoading onClose={onClose} />
      ) : (
        <div
          className="relative mx-auto"
          style={{
            width: 'min(100vw, 440px)',
            height: 'min(100vh, 900px)',
          }}
        >
          {/* Mobile viewports (or desktop with the sub-flag off, or empty
              state on desktop-editorial) render the phone-shape shell. */}
          <div className="relative w-full h-full lg:hidden">
            {renderMobileContents({
              data,
              slideIndex,
              onClose,
              handleShare,
              handleDownloadExcel,
              handleDownloadPDF,
              handleDownloadWrappedPDF,
              handleRestart,
              loadingAction,
              onIndexChange: handleIndexChange,
            })}
          </div>

          <div className="hidden lg:block">
            <DesktopPhoneFrame>
              {renderMobileContents({
                data,
                slideIndex,
                onClose,
                handleShare,
                handleDownloadExcel,
                handleDownloadPDF,
                handleDownloadWrappedPDF,
                handleRestart,
                loadingAction,
                onIndexChange: handleIndexChange,
              })}
            </DesktopPhoneFrame>
          </div>
        </div>
      )}

      {data && (
        <ShareToCommunityDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          data={data}
          currentUserId={currentUserId}
          onPublished={handlePublished}
        />
      )}
    </div>
  )

  return createPortal(overlay, document.body)
}

interface MobileContentsProps {
  data: WrappedData | null
  slideIndex: number | null
  onClose: () => void
  handleShare: () => void
  handleDownloadExcel: () => Promise<void>
  handleDownloadPDF: () => Promise<void>
  handleDownloadWrappedPDF: () => Promise<void>
  handleRestart: () => void
  loadingAction: LoadingAction
  onIndexChange: (next: number) => void
}

function renderMobileContents({
  data,
  slideIndex,
  onClose,
  handleShare,
  handleDownloadExcel,
  handleDownloadPDF,
  handleDownloadWrappedPDF,
  handleRestart,
  loadingAction,
  onIndexChange,
}: MobileContentsProps) {
  if (!data) return <WrappedLoading hint="Calculando tu resumen…" />
  if (data.empty) {
    return <WrappedEmpty monthLabel={data.month} year={data.year} onClose={onClose} />
  }
  if (slideIndex === null) return <WrappedLoading hint="Recuperando tu progreso…" />
  return (
    <WrappedStory
      data={data}
      initialIndex={slideIndex}
      onIndexChange={onIndexChange}
      onClose={onClose}
      onShare={handleShare}
      onDownloadExcel={handleDownloadExcel}
      onDownloadPDF={handleDownloadPDF}
      onDownloadWrappedPDF={handleDownloadWrappedPDF}
      onRestart={handleRestart}
      loadingAction={loadingAction}
    />
  )
}

function parseMonth0FromData(data: WrappedData): number {
  // monthKey is "YYYY-MM"; fall back to 0 if malformed (shouldn't happen).
  const parts = data.monthKey.split('-')
  const mm = Number.parseInt(parts[1] ?? '0', 10)
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) return 0
  return mm - 1
}

function DesktopPhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: `${PHONE_W}px`,
        height: `${PHONE_H}px`,
      }}
    >
      <div
        className="absolute inset-0 rounded-[42px] p-[6px]"
        style={{
          background: 'oklch(0.15 0.012 260)',
          boxShadow:
            '0 40px 100px -30px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06)',
        }}
      >
        <div className="w-full h-full rounded-[36px] overflow-hidden relative bg-black">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Subtle blurred gradient behind the desktop phone / editorial stage — uses
 * the current slide's personality palette. Reused in both desktop paths for
 * continuity. Hidden on mobile viewports.
 */
function DesktopBackground({ data, show }: { data: WrappedData | null; show: boolean }) {
  if (!data || !show) return null
  const p = PERSONALITIES[data.personality]
  return (
    <div
      aria-hidden
      className="wrapped-root hidden lg:block absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0, filter: 'blur(60px)', opacity: 0.5 }}
    >
      <div
        className="blob blob-a"
        style={{ left: '10%', top: '-5%', width: '60%', height: '55%', background: p.g1 }}
      />
      <div
        className="blob blob-b"
        style={{ right: '-5%', top: '30%', width: '60%', height: '55%', background: p.g2 }}
      />
      <div
        className="blob blob-c"
        style={{ left: '20%', bottom: '-15%', width: '65%', height: '50%', background: p.g1 }}
      />
    </div>
  )
}
