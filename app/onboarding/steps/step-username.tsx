'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { UsernamePicker } from '@/app/(app)/settings/username-picker'

export interface StepUsernameValidity {
  canSubmit: boolean
  normalized: string | null
}

interface StepUsernameProps {
  userId: string
  initialValue: string | null
  saving: boolean
  canSubmit: boolean
  onValidityChange: (state: StepUsernameValidity) => void
  onNext: () => void
  onBack: () => void
}

export function StepUsername({
  userId,
  initialValue,
  saving,
  canSubmit,
  onValidityChange,
  onNext,
  onBack,
}: StepUsernameProps) {
  const handleValidity = useCallback(
    (state: { value: string; canSubmit: boolean; normalized: string | null }) =>
      onValidityChange({ canSubmit: state.canSubmit, normalized: state.normalized }),
    [onValidityChange],
  )

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-svh flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-card border border-border/50 shadow-2xl shadow-primary/5 sm:rounded-[2.5rem] rounded-3xl p-6 sm:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

        <div className="relative z-10">
          {/* Back */}
          <div className="mb-8 flex justify-start">
            <button
              type="button"
              onClick={onBack}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 -ml-3 rounded-full hover:bg-muted/50"
            >
              ← Atrás
            </button>
          </div>

          {/* Header */}
          <div className="mb-10 text-center">
            <h2 className="text-[28px] font-bold tracking-tight text-foreground">Elegí tu username</h2>
            <p className="text-muted-foreground mt-2 text-[15px]">
              Tu identificador único en MFI. Es público si activás tu perfil social.
            </p>
          </div>

          {/* Picker */}
          <div className="space-y-2 w-full">
            <UsernamePicker
              initialValue={initialValue}
              selfId={userId}
              onValidityChange={handleValidity}
              id="onboarding-username"
              disabled={saving}
            />
          </div>

          {/* CTA */}
          <div className="mt-12 flex justify-center w-full">
            <Button
              onClick={onNext}
              disabled={saving || !canSubmit}
              className="h-14 w-full rounded-2xl text-[15px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
            >
              {saving ? 'Guardando…' : 'Continuar →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
