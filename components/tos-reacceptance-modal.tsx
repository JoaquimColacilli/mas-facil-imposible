'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { TOS_VERSION, PRIVACY_VERSION } from '@/lib/legal-texts'
import { acceptLegalTerms } from '@/app/(app)/settings/data-actions'

export function TosReacceptanceModal({ open }: { open: boolean }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleAccept() {
    setSaving(true)
    const result = await acceptLegalTerms(TOS_VERSION, PRIVACY_VERSION)
    if (!result.ok) {
      toast.error(result.error)
      setSaving(false)
      return
    }
    // refresh() re-runs the server layout, which now sees the updated profile
    // and stops rendering the modal on next paint.
    router.refresh()
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle>Actualizamos nuestros términos</DialogTitle>
          <DialogDescription className="pt-2">
            Antes de continuar usando MFI, necesitamos que aceptes la versión actual de nuestros{' '}
            <Link
              href="/legal/tos"
              target="_blank"
              className="underline underline-offset-4 text-foreground hover:text-primary"
            >
              Términos y Condiciones
            </Link>{' '}
            y nuestra{' '}
            <Link
              href="/legal/privacy"
              target="_blank"
              className="underline underline-offset-4 text-foreground hover:text-primary"
            >
              Política de Privacidad
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground pt-1">
          Versiones actuales: ToS v{TOS_VERSION} · Privacy v{PRIVACY_VERSION}
        </p>
        <DialogFooter className="pt-2">
          <Button onClick={handleAccept} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Guardando…' : 'Aceptar y continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
