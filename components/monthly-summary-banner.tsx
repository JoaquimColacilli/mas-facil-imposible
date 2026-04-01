'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchMonthlyReportData } from '@/app/(app)/dashboard/actions'
import { getPreviousMonthRange } from '@/lib/month-utils'
import { FileSpreadsheet, FileText, X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MonthlySummaryBannerProps {
  userId: string
}

export function MonthlySummaryBanner({ userId }: MonthlySummaryBannerProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null)

  const { key: prevMonthKey, label: prevMonthLabel, day: currentDay } = getPreviousMonthRange()
  const storageKey = `mfi-monthly-summary-dismissed-${prevMonthKey}`

  useEffect(() => {
    if (currentDay > 5) return

    try {
      if (localStorage.getItem(storageKey) === '1') return
    } catch {}

    setVisible(true)

    // Create notification if doesn't exist
    const createNotification = async () => {
      const supabase = createClient()

      // Fetch recent notifications and check manually (avoids JSON operator issues)
      const { data: existing } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', userId)
        .eq('type', 'success')
        .order('created_at', { ascending: false })
        .limit(20)

      const alreadyExists = (existing ?? []).some(
        (n) => n.data?.type === 'monthly_summary' && n.data?.month === prevMonthKey,
      )

      if (!alreadyExists) {
        const capitalizedLabel = prevMonthLabel.charAt(0).toUpperCase() + prevMonthLabel.slice(1)
        const { error } = await supabase.from('notifications').insert({
          user_id: userId,
          type: 'success' as const,
          title: `Tu resumen de ${capitalizedLabel} está listo`,
          message: 'Descargá el resumen completo en Excel o PDF.',
          data: { type: 'monthly_summary', month: prevMonthKey },
        })
        if (error) console.error('[MonthlySummaryBanner] Error creating notification:', error.message)
      }
    }
    createNotification()
  }, [currentDay, storageKey, userId, prevMonthKey, prevMonthLabel])

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1')
    } catch {}
    setVisible(false)
  }, [storageKey])

  const handleDownload = useCallback(
    async (e: React.MouseEvent, format: 'excel' | 'pdf') => {
      e.stopPropagation()
      setLoading(format)
      try {
        const result = await fetchMonthlyReportData(prevMonthKey)
        if (result.error || !result.transactions) {
          console.error('Error fetching report data:', result.error)
          return
        }
        const { transactions, goals, loans, debts } = result
        const capitalizedLabel = prevMonthLabel.charAt(0).toUpperCase() + prevMonthLabel.slice(1)

        const { generateExcel, generatePDF } = await import('@/lib/monthly-report')
        if (format === 'excel') {
          await generateExcel(transactions, goals!, loans!, debts!, capitalizedLabel)
        } else {
          await generatePDF(transactions, goals!, loans!, debts!, capitalizedLabel)
        }
      } catch (err) {
        console.error('Error generating report:', err)
      } finally {
        setLoading(null)
      }
    },
    [prevMonthKey, prevMonthLabel],
  )

  if (!visible) return null

  const capitalizedLabel = prevMonthLabel.charAt(0).toUpperCase() + prevMonthLabel.slice(1)

  return (
    <div className="animate-fade-in-up flex items-center gap-1.5 h-9 pl-3 pr-1 rounded-xl bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/25 dark:border-primary/30 shrink-0">
      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="text-[11px] font-semibold text-foreground whitespace-nowrap hidden sm:inline">
        Resumen {capitalizedLabel}
      </span>
      <span className="text-[11px] font-semibold text-foreground whitespace-nowrap sm:hidden">
        Resumen
      </span>

      <button
        onClick={(e) => handleDownload(e, 'excel')}
        disabled={loading !== null}
        title="Descargar Excel"
        className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-primary/15 text-primary transition-colors disabled:opacity-50"
      >
        {loading === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={(e) => handleDownload(e, 'pdf')}
        disabled={loading !== null}
        title="Descargar PDF"
        className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-primary/15 text-primary transition-colors disabled:opacity-50"
      >
        {loading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={handleDismiss}
        title="Cerrar"
        className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
