'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, FileSpreadsheet, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MonthPicker } from '@/components/month-picker'
import { fetchMonthlyReportData } from '@/app/(app)/dashboard/actions'
import { cn } from '@/lib/utils'

type ReportFormat = 'pdf' | 'excel'

interface GenerateReportDialogProps {
  /** YYYY-MM. Default que se muestra al abrir. */
  defaultMonth: string
  onClose: () => void
}

const MONTH_NAMES_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES_LONG[m - 1]} ${y}`
}

export function GenerateReportDialog({ defaultMonth, onClose }: GenerateReportDialogProps) {
  const [monthKey, setMonthKey] = useState(defaultMonth)
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const result = await fetchMonthlyReportData(monthKey)
      if (result.error || !result.transactions) {
        console.error('[GenerateReport] fetch error:', result.error)
        toast.error('No pudimos generar el reporte. Probá de nuevo.')
        return
      }

      const { transactions, goals, loans, debts } = result
      const label = monthLabel(monthKey)

      const { generatePDF, generateExcel } = await import('@/lib/monthly-report')
      if (format === 'pdf') {
        await generatePDF(transactions, goals!, loans!, debts!, label)
      } else {
        await generateExcel(transactions, goals!, loans!, debts!, label)
      }

      toast.success('Reporte descargado')
      onClose()
    } catch (err) {
      console.error('[GenerateReport] exception:', err)
      toast.error('No pudimos generar el reporte. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl z-10 animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 flex flex-col max-h-[90dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            Generar reporte
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-6">
          {/* Mes */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">
              Mes
            </label>
            <MonthPicker
              value={monthKey}
              onChange={setMonthKey}
              disabled={loading}
            />
          </div>

          {/* Formato */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-2 block tracking-wide uppercase">
              Formato
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { value: 'pdf' as const, label: 'PDF', icon: FileText },
                { value: 'excel' as const, label: 'Excel', icon: FileSpreadsheet },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormat(value)}
                  disabled={loading}
                  className={cn(
                    'flex items-center justify-center gap-2 h-10 rounded-xl border text-[12.5px] font-semibold transition-all duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    format === value
                      ? 'bg-foreground text-background border-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            El archivo contiene tus movimientos en texto plano. No lo subas a servicios cloud ni lo compartas sin pensarlo.
          </p>

          {/* Botón */}
          <Button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="h-11 w-full rounded-xl font-semibold transition-all duration-150 hover:scale-[1.01] hover:shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              'Descargar'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
