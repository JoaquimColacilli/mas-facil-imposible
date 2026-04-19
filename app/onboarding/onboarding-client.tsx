'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Table2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { TOS_VERSION, PRIVACY_VERSION } from '@/lib/legal-texts'
import { setUsername as setUsernameAction } from '@/app/(app)/settings/social-actions'
import { StepUsername, type StepUsernameValidity } from './steps/step-username'
import { toast } from 'sonner'

type Mode = 'classic' | 'mfi'
type Currency = 'ARS' | 'USD'
type Step = 0 | 1 | 2 | 3 | 4

interface Profile {
  full_name?: string | null
  default_currency?: string | null
  preferred_mode?: string | null
  onboarding_completed?: boolean | null
  username?: string | null
}

interface OnboardingClientProps {
  profile: Profile | null
  userId: string
}

// ─── Progress Dots ────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            i < current
              ? 'bg-primary/40'
              : i === current
                ? 'bg-primary w-4'
                : 'bg-muted',
          )}
        />
      ))}
    </div>
  )
}

// ─── Mini Dashboard Preview ───────────────────────────────────────────────────

function DashboardPreview() {
  return (
    <div className="w-full space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/40">
      {/* KPI row */}
      <div className="flex gap-1.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 h-7 rounded-md bg-muted/60 border border-border/30" />
        ))}
      </div>
      {/* Chart area */}
      <div className="w-full h-10 rounded-md bg-muted/60 border border-border/30 relative overflow-hidden">
        <div className="absolute inset-0 flex items-end gap-0.5 px-2 pb-1">
          {[40, 60, 35, 70, 55, 80, 45].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-primary/20"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Mini Table Preview ───────────────────────────────────────────────────────

function TablePreview() {
  return (
    <div className="w-full rounded-lg bg-muted/30 border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex gap-1 px-2 py-1.5 bg-muted/50 border-b border-border/30">
        {['Fecha', 'Tipo', 'Descripción', 'Monto'].map((h) => (
          <div
            key={h}
            className={cn(
              'h-2 rounded-sm bg-muted-foreground/30',
              h === 'Descripción' ? 'flex-[2]' : 'flex-1',
            )}
          />
        ))}
      </div>
      {/* Data rows */}
      {[...Array(2)].map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-1 px-2 py-1.5 border-b border-border/20">
          {[1, 1, 2, 1].map((flex, i) => (
            <div
              key={i}
              className="h-2 rounded-sm bg-muted/70"
              style={{ flex }}
            />
          ))}
        </div>
      ))}
      {/* New row (dashed) */}
      <div className="flex gap-1 px-2 py-1.5">
        {[1, 1, 2, 1].map((flex, i) => (
          <div
            key={i}
            className="h-2 rounded-sm border border-dashed border-border/40"
            style={{ flex }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Mode Card ────────────────────────────────────────────────────────────────

function ModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: Mode
  selected: boolean
  onSelect: () => void
}) {
  const isClassic = mode === 'classic'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 cursor-pointer',
        'min-h-[260px] flex flex-col gap-4',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        selected
          ? 'border-primary ring-2 ring-primary/30 bg-primary/[0.02]'
          : 'border-border hover:border-primary/40 bg-card',
      )}
    >
      {/* Top-right decorations */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {!isClassic && (
          <span className="bg-primary/15 text-primary text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide">
            Recomendado
          </span>
        )}
        {selected && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground animate-in zoom-in-50 duration-200">
            <Check className="w-3 h-3" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Icon + Title */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200',
            selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {isClassic ? (
            <LayoutDashboard className="w-5 h-5" />
          ) : (
            <Table2 className="w-5 h-5" />
          )}
        </div>
        <span className="text-[17px] font-bold leading-tight">
          {isClassic ? 'Modo Clásico' : 'Modo MFI'}
        </span>
      </div>

      {/* Description */}
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        {isClassic
          ? 'Dashboard con KPIs, gráficos de gastos e ingresos, metas visuales y análisis detallado.'
          : 'Tabla tipo planilla. Ingresá gastos con Tab + Enter, sin modales ni clics extra.'}
      </p>

      {/* Tag */}
      <span
        className={cn(
          'self-start text-[11px] font-semibold px-2.5 py-1 rounded-full',
          selected
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {isClassic ? 'Ideal para analizar' : 'Ideal para registrar rápido'}
      </span>

      {/* Preview */}
      <div className="mt-auto">
        {isClassic ? <DashboardPreview /> : <TablePreview />}
      </div>
    </button>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-svh flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center gap-0 w-full max-w-sm mx-auto">
        {/* Logo block */}
        <div
          className="animate-in fade-in zoom-in-95 duration-500 w-full flex justify-center"
          style={{ animationDelay: '0ms', animationFillMode: 'both' }}
        >
          <h1 className="font-serif text-[100px] font-bold tracking-tighter leading-none text-foreground select-none">
            MFI
          </h1>
        </div>

        <div
          className="animate-in fade-in duration-500 mt-2 w-full flex justify-center"
          style={{ animationDelay: '80ms', animationFillMode: 'both' }}
        >
          <p className="text-[11px] tracking-[0.3em] ml-[0.3em] text-muted-foreground/70 font-medium uppercase text-center">
            Más Fácil, Imposible
          </p>
        </div>

        <div
          className="animate-in fade-in duration-500 w-16 my-7 flex justify-center"
          style={{ animationDelay: '160ms', animationFillMode: 'both' }}
        >
          <div className="h-px bg-border w-full" />
        </div>

        <div
          className="animate-in fade-in duration-500 space-y-2"
          style={{ animationDelay: '240ms', animationFillMode: 'both' }}
        >
          <p className="text-[18px] text-muted-foreground font-medium">
            Tu app de finanzas personales.
          </p>
          <p className="text-[14px] text-muted-foreground/60">
            Simple. Rápida. Sin excusas.
          </p>
        </div>

        <div
          className="animate-in fade-in zoom-in-95 duration-500 mt-10"
          style={{ animationDelay: '380ms', animationFillMode: 'both' }}
        >
          <Button
            onClick={onNext}
            className="h-12 rounded-2xl px-8 text-[15px] font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-shadow"
          >
            Empezar →
          </Button>
        </div>
      </div>
    </div>
  )
}

function StepMode({
  selectedMode,
  onSelect,
  onNext,
  onBack,
}: {
  selectedMode: Mode | null
  onSelect: (m: Mode) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-svh flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-[850px] bg-card border border-border/50 shadow-2xl shadow-primary/5 sm:rounded-[2.5rem] rounded-3xl p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle glassmorphism/gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Back */}
          <div className="mb-8">
            <button
              type="button"
              onClick={onBack}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 -ml-3 rounded-full hover:bg-muted/50"
            >
              ← Atrás
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-[28px] font-bold tracking-tight text-foreground">
              ¿Cómo querés usar MFI?
            </h2>
            <p className="text-muted-foreground mt-2 text-[15px]">
              Elegí la experiencia que mejor se adapte a tu día a día.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ModeCard
              mode="classic"
              selected={selectedMode === 'classic'}
              onSelect={() => onSelect('classic')}
            />
            <ModeCard
              mode="mfi"
              selected={selectedMode === 'mfi'}
              onSelect={() => onSelect('mfi')}
            />
          </div>

          {/* CTA */}
          <div className="mt-12 flex justify-center">
            <Button
              onClick={onNext}
              disabled={!selectedMode}
              className="h-14 rounded-2xl px-12 text-[15px] font-semibold disabled:opacity-40 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Continuar →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepConfig({
  name,
  currency,
  saving,
  acceptedLegal,
  onNameChange,
  onCurrencyChange,
  onAcceptedLegalChange,
  onNext,
  onBack,
}: {
  name: string
  currency: Currency
  saving: boolean
  acceptedLegal: boolean
  onNameChange: (v: string) => void
  onCurrencyChange: (v: Currency) => void
  onAcceptedLegalChange: (v: boolean) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-svh flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-card border border-border/50 shadow-2xl shadow-primary/5 sm:rounded-[2.5rem] rounded-3xl p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle gradient accent */}
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
            <h2 className="text-[28px] font-bold tracking-tight text-foreground">
              Últimos detalles
            </h2>
            <p className="text-muted-foreground mt-2 text-[15px]">
              ¡Ya casi terminamos! Configurá tu perfil.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-8 w-full text-left">
            {/* Name */}
            <div className="space-y-2.5">
              <Label htmlFor="onboarding-name" className="text-[14px] font-semibold text-foreground">
                ¿Cómo te llamás?
              </Label>
              <Input
                id="onboarding-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Ej. Joaquin"
                className="h-12 rounded-xl text-[15px] bg-background border-border/60 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            {/* Currency */}
            <div className="space-y-3">
              <Label className="text-[14px] font-semibold text-foreground">
                Moneda principal
              </Label>
              <div className="flex gap-3">
                {(['ARS', 'USD'] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onCurrencyChange(c)}
                    className={cn(
                      'flex-1 h-14 rounded-2xl font-semibold text-[14px] border-2 transition-all duration-200 shadow-sm',
                      currency === c
                        ? 'bg-primary/5 text-primary border-primary ring-4 ring-primary/10'
                        : 'bg-background text-muted-foreground border-border/50 hover:border-border hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    {c === 'ARS' ? 'ARS — Pesos' : 'USD — Dólar'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Legal acceptance */}
          <div className="mt-8">
            <Separator className="mb-6" />
            <label
              htmlFor="onboarding-legal"
              className="flex items-start gap-3 cursor-pointer select-none"
            >
              <Checkbox
                id="onboarding-legal"
                checked={acceptedLegal}
                onCheckedChange={(v) => onAcceptedLegalChange(v === true)}
                className="mt-0.5"
              />
              <span className="text-[13px] leading-relaxed text-muted-foreground">
                Acepto los{' '}
                <Link
                  href="/legal/tos"
                  target="_blank"
                  className="underline underline-offset-4 text-foreground hover:text-primary"
                >
                  Términos y Condiciones
                </Link>{' '}
                y la{' '}
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  className="underline underline-offset-4 text-foreground hover:text-primary"
                >
                  Política de Privacidad
                </Link>
                .
              </span>
            </label>
          </div>

          {/* CTA */}
          <div className="mt-8 flex justify-center w-full">
            <Button
              onClick={onNext}
              disabled={saving || !name.trim() || !acceptedLegal}
              className="h-14 w-full rounded-2xl text-[15px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
            >
              Continuar →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepDone({ name }: { name: string }) {
  const displayName = name.trim() ? name.trim().split(' ')[0] : 'vos'

  return (
    <div className="animate-in fade-in duration-300">
      <div className="max-w-2xl mx-auto px-4 py-16 min-h-svh flex flex-col items-center justify-center text-center gap-6">
        {/* Animated checkmark */}
        <div className="animate-in zoom-in-50 duration-500 flex items-center justify-center w-24 h-24 rounded-full border-4 border-emerald-500/30 bg-emerald-500/10">
          <span className="text-[40px] leading-none text-emerald-500 font-bold">✓</span>
        </div>

        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-2"
          style={{ animationDelay: '200ms', animationFillMode: 'both' }}
        >
          <h2 className="text-[28px] font-bold tracking-tight">
            ¡Todo listo, {displayName}!
          </h2>
          <p className="text-muted-foreground text-[15px]">Abriendo tu app…</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingClient({ profile, userId }: OnboardingClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(0)
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null)
  const [name, setName] = useState(profile?.full_name ?? '')
  const [currency, setCurrency] = useState<Currency>(
    (profile?.default_currency as Currency) ?? 'ARS',
  )
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [usernameValidity, setUsernameValidity] = useState<StepUsernameValidity>({
    canSubmit: !!profile?.username,
    normalized: profile?.username ?? null,
  })
  const [saving, setSaving] = useState(false)

  // Auto-navigate after step 4 (Done)
  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => {
        router.push(selectedMode === 'mfi' ? '/mfi' : '/dashboard')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [step, selectedMode, router])

  const handleConfigContinue = () => {
    // No DB writes here — defer to step 3 (Username) so the whole onboarding
    // commits atomically only when the user finishes the flow.
    setStep(3)
  }

  const handleUsernameContinue = async () => {
    if (!usernameValidity.canSubmit || !usernameValidity.normalized) return
    setSaving(true)
    try {
      // 1. Reserve the username via the server action (handles unicidad + rate limit).
      const usernameResult = await setUsernameAction(usernameValidity.normalized)
      if (!usernameResult.ok) {
        toast.error(usernameResult.error)
        setSaving(false)
        return
      }

      // 2. Persist the rest of the onboarding profile.
      const now = new Date().toISOString()
      await supabase
        .from('profiles')
        .update({
          full_name: name.trim() || null,
          default_currency: currency,
          preferred_mode: selectedMode,
          onboarding_completed: true,
          tos_accepted_at: now,
          tos_version: TOS_VERSION,
          privacy_accepted_at: now,
          privacy_version: PRIVACY_VERSION,
        })
        .eq('id', userId)

      setStep(4)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-svh bg-background">
      {/* Subtle gradient backdrop */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />

      {/* Step 0 — Welcome */}
      {step === 0 && <StepWelcome onNext={() => setStep(1)} />}

      {/* Step 1 — Mode selection */}
      {step === 1 && (
        <StepMode
          selectedMode={selectedMode}
          onSelect={setSelectedMode}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {/* Step 2 — Config */}
      {step === 2 && (
        <StepConfig
          name={name}
          currency={currency}
          saving={saving}
          acceptedLegal={acceptedLegal}
          onNameChange={setName}
          onCurrencyChange={setCurrency}
          onAcceptedLegalChange={setAcceptedLegal}
          onNext={handleConfigContinue}
          onBack={() => setStep(1)}
        />
      )}

      {/* Step 3 — Username */}
      {step === 3 && (
        <StepUsername
          userId={userId}
          initialValue={profile?.username ?? null}
          saving={saving}
          canSubmit={usernameValidity.canSubmit}
          onValidityChange={setUsernameValidity}
          onNext={handleUsernameContinue}
          onBack={() => setStep(2)}
        />
      )}

      {/* Step 4 — Done */}
      {step === 4 && <StepDone name={name} />}

      {/* Progress dots — hidden on welcome and done screens */}
      {step !== 0 && step !== 4 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center animate-in fade-in duration-300">
          <ProgressDots current={step} total={5} />
        </div>
      )}
    </div>
  )
}
