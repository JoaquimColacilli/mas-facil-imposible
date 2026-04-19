'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AtSign } from 'lucide-react'
import { toast } from 'sonner'
import { UsernamePicker } from '@/app/(app)/settings/username-picker'
import { setUsername as setUsernameAction } from '@/app/(app)/settings/social-actions'

interface UsernameSetupModalProps {
  /** True if this user finished onboarding pre-Fase-1 and has no username yet. */
  open: boolean
  userId: string
}

export function UsernameSetupModal({ open, userId }: UsernameSetupModalProps) {
  const router = useRouter()
  const [picker, setPicker] = useState<{ canSubmit: boolean; normalized: string | null }>({
    canSubmit: false,
    normalized: null,
  })
  const [saving, setSaving] = useState(false)

  const onValidityChange = useCallback(
    (state: { value: string; canSubmit: boolean; normalized: string | null }) =>
      setPicker({ canSubmit: state.canSubmit, normalized: state.normalized }),
    [],
  )

  async function handleSave() {
    if (!picker.normalized) return
    setSaving(true)
    const result = await setUsernameAction(picker.normalized)
    if (!result.ok) {
      toast.error(result.error)
      setSaving(false)
      return
    }
    // Re-runs the server layout, which now sees a profile with username and stops rendering this modal.
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
            <AtSign className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle>Elegí tu username</DialogTitle>
          <DialogDescription className="pt-2">
            Antes de continuar, necesitamos que elijas un username único. Lo vas a usar para que otros
            usuarios te puedan agregar como amigo si activás tu perfil social.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <UsernamePicker
            initialValue={null}
            selfId={userId}
            onValidityChange={onValidityChange}
            id="setup-username"
            disabled={saving}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!picker.canSubmit || saving}
            className="w-full sm:w-auto"
          >
            {saving ? 'Guardando…' : 'Guardar y continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
