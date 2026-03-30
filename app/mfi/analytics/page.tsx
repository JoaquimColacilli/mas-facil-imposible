import { BarChart3 } from 'lucide-react'

export default function MFIAnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
        <BarChart3 className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-[14px] font-semibold text-foreground">Análisis</p>
      <p className="text-[13px] text-muted-foreground">Próximamente en Modo MFI</p>
    </div>
  )
}
