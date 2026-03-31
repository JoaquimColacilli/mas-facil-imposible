'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { changelog, ChangelogEntry } from '@/lib/changelog'
import { updateLastSeenVersion } from '@/app/actions/user'
import { Sparkles } from 'lucide-react'

function isNewer(current: string, lastSeen: string) {
  if (!lastSeen) return true
  const cParts = current.split('.').map(Number)
  const lParts = lastSeen.split('.').map(Number)
  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const c = cParts[i] || 0
    const l = lParts[i] || 0
    if (c > l) return true
    if (c < l) return false
  }
  return false
}

export function WhatsNewModal({ lastSeenVersion }: { lastSeenVersion: string | null | undefined }) {
  const [open, setOpen] = useState(false)
  const [unseenVersions, setUnseenVersions] = useState<ChangelogEntry[]>([])

  useEffect(() => {
    // Solo mostramos Novedades en cliente si el usuario tiene una sesión "cargada".
    // Evaluamos las versiones que son más nuevas que lo que vió el usuario.
    const missing = changelog.filter(entry => isNewer(entry.version, lastSeenVersion || '0.0.0'))
    
    if (missing.length > 0) {
      if (!lastSeenVersion) {
        // En su primer ingreso después de que esta feature exista, mostrame nomás la primera para no atosigar.
        setUnseenVersions([missing[0]])
      } else {
        setUnseenVersions(missing)
      }
      // Pequeño timeout para no pelear con la inicialización visual inmediata.
      const t = setTimeout(() => setOpen(true), 500)
      return () => clearTimeout(t)
    }
  }, [lastSeenVersion])

  async function handleClose(val: boolean) {
    if (!val) {
      setOpen(false)
      const latestVersion = changelog[0].version
      await updateLastSeenVersion(latestVersion)
    }
  }

  if (unseenVersions.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center text-xl">¿Qué hay de nuevo?</DialogTitle>
          <DialogDescription className="text-center">
            MFI sigue mejorando. Te presentamos las últimas novedades.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-6 pr-2">
          {unseenVersions.map((entry) => (
            <div key={entry.version} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold bg-muted px-2 py-0.5 rounded text-foreground">
                  v{entry.version}
                </span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground/90">
                {entry.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-6 sm:justify-center border-t border-border pt-4">
          <Button onClick={() => handleClose(false)} className="w-full sm:w-auto font-semibold">
            ¡Entendido!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
