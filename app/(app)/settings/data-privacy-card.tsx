'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Download, Trash2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { exportMyData, deleteMyAccount } from './data-actions'
import { signOut } from '@/app/auth/actions'

const DELETE_CONFIRMATION = 'BORRAR MI CUENTA'

export function DataPrivacyCard({ userId }: { userId: string }) {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [step1Open, setStep1Open] = useState(false)
  const [step2Open, setStep2Open] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const result = await exportMyData()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const blob = new Blob([JSON.stringify(result.payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const today = new Date().toISOString().slice(0, 10)
      const shortId = userId.slice(0, 8)
      a.href = url
      a.download = `mfi-export-${shortId}-${today}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Tus datos se descargaron correctamente.')
    } catch (e) {
      toast.error('No se pudo exportar. Intentá de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  function handleStartDelete() {
    setStep1Open(true)
  }

  function handleContinueToConfirm() {
    setStep1Open(false)
    setConfirmText('')
    // Slight delay so the first dialog animates out before the second opens.
    setTimeout(() => setStep2Open(true), 100)
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    const result = await deleteMyAccount(confirmText)
    if (!result.ok) {
      toast.error(result.error)
      setDeleting(false)
      return
    }
    toast.success('Tu cuenta fue eliminada.')
    setStep2Open(false)
    await signOut()
    router.push('/auth/login')
  }

  const confirmMatches = confirmText === DELETE_CONFIRMATION

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          Privacidad y datos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Exportar mis datos</p>
            <p className="text-xs text-muted-foreground">
              Descargá un JSON con toda la información que tenemos sobre vos.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 self-start sm:self-auto"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exportando…' : 'Exportar JSON'}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Borrar mi cuenta</p>
            <p className="text-xs text-muted-foreground">
              Elimina permanentemente tu cuenta y todos los datos asociados. Acción irreversible.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 self-start sm:self-auto text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleStartDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Borrar cuenta
          </Button>
        </div>
      </CardContent>

      {/* Step 1 — heads-up */}
      <AlertDialog open={step1Open} onOpenChange={setStep1Open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos tus datos: transacciones, metas, cobros, deudas, inversiones y
              configuración. Esta acción es irreversible y no hay período de gracia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleContinueToConfirm}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 2 — typed confirmation */}
      <AlertDialog open={step2Open} onOpenChange={(open) => !deleting && setStep2Open(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Última confirmación</AlertDialogTitle>
            <AlertDialogDescription>
              Para confirmar, escribí <strong className="font-mono">{DELETE_CONFIRMATION}</strong> exactamente como aparece.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="delete-confirm" className="text-xs text-muted-foreground">
              Confirmación
            </Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRMATION}
              autoComplete="off"
              autoFocus
              disabled={deleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!confirmMatches || deleting}
            >
              {deleting ? 'Borrando…' : 'Borrar mi cuenta'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
