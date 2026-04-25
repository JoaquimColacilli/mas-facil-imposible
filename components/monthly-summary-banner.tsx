'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchMonthlyReportData,
  fetchMonthlyWrappedData,
} from '@/app/(app)/dashboard/actions'
import { getCurrentMonthRange, getPreviousMonthRange } from '@/lib/month-utils'
import { FileSpreadsheet, FileText, X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WrappedData } from '@/lib/wrapped/types'
import { isWrappedDevMode, isWrappedEnabled } from '@/lib/wrapped/feature-flags'
import { WrappedOverlay } from './wrapped/wrapped-overlay'
import './wrapped/wrapped-styles.css'

interface MonthlySummaryBannerProps {
  userId: string
}

const DAY_GATE = 5

export function MonthlySummaryBanner({ userId }: MonthlySummaryBannerProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null)
  const [wrappedOpen, setWrappedOpen] = useState(false)
  const [wrappedData, setWrappedData] = useState<WrappedData | null>(null)

  // Prod behavior: banner only visible the first 5 days of the new month, and
  // opens the *previous* month's Wrapped (the one that just ended).
  // Dev mode (NEXT_PUBLIC_WRAPPED_DEV=true, defaults to true in dev) bypasses
  // the gate and points at the **current** month so you can preview against
  // live data.
  const devMode = isWrappedDevMode()
  const prev = getPreviousMonthRange()
  const cur = getCurrentMonthRange()
  const targetKey = devMode ? cur.key : prev.key
  const targetLabel = devMode ? cur.label : prev.label
  const currentDay = prev.day

  // The Excel/PDF downloads in this banner always cover the month that just
  // ended — those are "post-mortem reports", independent of the chip target.
  const reportMonthKey = prev.key
  const reportMonthLabel = prev.label

  const storageKey = `mfi-monthly-summary-dismissed-${targetKey}`
  const wrappedDismissKey = `mfi-wrapped-dismissed-${targetKey}`
  const capitalizedReportLabel =
    reportMonthLabel.charAt(0).toUpperCase() + reportMonthLabel.slice(1)

  useEffect(() => {
    // Master flag off → banner stays hidden and we never create the
    // notification. Flipping the flag back on is enough to restore it.
    if (!isWrappedEnabled()) return

    // 5-day window: comentado a propósito en el rollout inicial para que el
    // chip sea visible todo el mes mientras los usuarios se familiarizan con
    // la feature. Cuando reactivemos el gate, también podemos mover el
    // chequeo al server action si queremos evitar el fetch innecesario.
    // if (!devMode && currentDay > DAY_GATE) return

    try {
      if (localStorage.getItem(storageKey) === '1') return
    } catch {}

    setVisible(true)

    // Create notification if doesn't exist — always references the *report*
    // month (prev), which is the one the user gets an Excel/PDF of.
    const createNotification = async () => {
      const supabase = createClient()

      const { data: existing } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', userId)
        .eq('type', 'success')
        .order('created_at', { ascending: false })
        .limit(20)

      const alreadyExists = (existing ?? []).some(
        (n) => n.data?.type === 'monthly_summary' && n.data?.month === reportMonthKey,
      )

      if (!alreadyExists) {
        const { error } = await supabase.from('notifications').insert({
          user_id: userId,
          type: 'success' as const,
          title: `Tu resumen de ${capitalizedReportLabel} está listo`,
          message: 'Descargalo o recorrelo como una historia.',
          data: { type: 'monthly_summary', month: reportMonthKey },
        })
        if (error) console.error('[MonthlySummaryBanner] Error creating notification:', error.message)
      }
    }
    createNotification()
  }, [currentDay, devMode, storageKey, userId, reportMonthKey, capitalizedReportLabel])

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1')
      // Dismissing the whole row also dismisses the wrapped chip for the month.
      localStorage.setItem(wrappedDismissKey, '1')
    } catch {}
    setVisible(false)
  }, [storageKey, wrappedDismissKey])

  const handleDownload = useCallback(
    async (e: React.MouseEvent, format: 'excel' | 'pdf') => {
      e.stopPropagation()
      setLoading(format)
      try {
        const result = await fetchMonthlyReportData(reportMonthKey)
        if (result.error || !result.transactions) {
          console.error('Error fetching report data:', result.error)
          return
        }
        const { transactions, goals, loans, debts } = result
        const label =
          reportMonthLabel.charAt(0).toUpperCase() + reportMonthLabel.slice(1)

        const { generateExcel, generatePDF } = await import('@/lib/monthly-report')
        if (format === 'excel') {
          await generateExcel(transactions, goals!, loans!, debts!, label)
        } else {
          await generatePDF(transactions, goals!, loans!, debts!, label)
        }
      } catch (err) {
        console.error('Error generating report:', err)
      } finally {
        setLoading(null)
      }
    },
    [reportMonthKey, reportMonthLabel],
  )

  const handleOpenWrapped = useCallback(async () => {
    setWrappedOpen(true)
    setWrappedData(null)
    try {
      const result = await fetchMonthlyWrappedData(targetKey)
      if (result.error || !result.data) {
        console.error('[Wrapped] fetch error', result.error)
        setWrappedOpen(false)
        return
      }
      setWrappedData(result.data)
    } catch (err) {
      console.error('[Wrapped] fetch exception', err)
      setWrappedOpen(false)
    }
  }, [targetKey])

  const handleWrappedClose = useCallback(() => {
    setWrappedOpen(false)
    setWrappedData(null)
  }, [])

  const downloadExcel = useCallback(async () => {
    const result = await fetchMonthlyReportData(reportMonthKey)
    if (result.error || !result.transactions) return
    const { generateExcel } = await import('@/lib/monthly-report')
    await generateExcel(
      result.transactions,
      result.goals!,
      result.loans!,
      result.debts!,
      capitalizedReportLabel,
    )
  }, [reportMonthKey, capitalizedReportLabel])

  const downloadPDF = useCallback(async () => {
    const result = await fetchMonthlyReportData(reportMonthKey)
    if (result.error || !result.transactions) return
    const { generatePDF } = await import('@/lib/monthly-report')
    await generatePDF(
      result.transactions,
      result.goals!,
      result.loans!,
      result.debts!,
      capitalizedReportLabel,
    )
  }, [reportMonthKey, capitalizedReportLabel])

  if (!visible) return null

  return (
    <>
      <div className="animate-fade-in-up flex items-center gap-1.5 h-9 pl-1 pr-1 rounded-xl bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/25 dark:border-primary/30 shrink-0">
        {/* Wrapped chip — prominent, shimmer, "nuevo" badge */}
        <button
          type="button"
          onClick={handleOpenWrapped}
          title={`Tu ${targetLabel.toLowerCase()} en MFI`}
          className="group relative inline-flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-lg text-white font-serif font-semibold text-[11.5px] overflow-hidden shadow-sm"
          style={{
            background:
              'linear-gradient(92deg, oklch(0.50 0.10 155) 0%, oklch(0.60 0.10 65) 100%)',
          }}
        >
          <span
            aria-hidden
            className="absolute inset-0 opacity-60 wrapped-chip-shimmer pointer-events-none"
          />
          <span
            className="relative w-4 h-4 rounded-full grid place-items-center"
            style={{ background: 'rgba(255,255,255,.25)' }}
          >
            <Sparkles className="w-2.5 h-2.5" strokeWidth={2.4} />
          </span>
          <span className="relative hidden sm:inline">Tu {targetLabel.toLowerCase()}</span>
          <span className="relative sm:hidden">Tu mes</span>
          <span
            className="relative text-[9px] font-mono px-1 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,.28)' }}
          >
            nuevo
          </span>
        </button>

        {/* Divider */}
        <span className="h-4 w-px bg-primary/20 mx-0.5" aria-hidden />

        {/* Excel */}
        <button
          onClick={(e) => handleDownload(e, 'excel')}
          disabled={loading !== null}
          title="Descargar Excel"
          className={cn(
            'h-6 w-6 flex items-center justify-center rounded-lg hover:bg-primary/15 text-primary transition-colors disabled:opacity-50',
          )}
        >
          {loading === 'excel' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5" />
          )}
        </button>
        {/* PDF */}
        <button
          onClick={(e) => handleDownload(e, 'pdf')}
          disabled={loading !== null}
          title="Descargar PDF"
          className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-primary/15 text-primary transition-colors disabled:opacity-50"
        >
          {loading === 'pdf' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
        </button>
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          title="Cerrar"
          className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {wrappedOpen && (
        <WrappedOverlay
          data={wrappedData}
          onClose={handleWrappedClose}
          onDownloadExcel={downloadExcel}
          onDownloadPDF={downloadPDF}
          currentUserId={userId}
        />
      )}
    </>
  )
}
