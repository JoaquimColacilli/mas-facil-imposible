'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-[14px] text-muted-foreground">Hubo un error al cargar el dashboard.</p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline" className="h-9 rounded-xl text-[12px]">
          Reintentar
        </Button>
        <Button onClick={() => window.location.href = '/dashboard'} className="h-9 rounded-xl text-[12px]">
          Recargar página
        </Button>
      </div>
    </div>
  )
}
