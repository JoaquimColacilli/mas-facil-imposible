import { Settings } from 'lucide-react'

export default function MFISettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
        <Settings className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-[14px] font-semibold text-foreground">Ajustes</p>
      <p className="text-[13px] text-muted-foreground">Próximamente en Modo MFI</p>
    </div>
  )
}
