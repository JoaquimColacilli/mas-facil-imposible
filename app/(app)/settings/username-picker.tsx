'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { validateUsername } from '@/lib/social/validate-username'

type Status =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }

const DEBOUNCE_MS = 350

interface UsernamePickerProps {
  /** Current username from the user's profile (NULL = not set yet). */
  initialValue?: string | null
  /** User id to exclude from "taken" checks (so editing your own value is OK). */
  selfId: string
  /** Called every render with current value + whether it's safe to submit. */
  onValidityChange?: (state: { value: string; canSubmit: boolean; normalized: string | null }) => void
  /** Custom label text. Defaults to "Username". */
  label?: string
  /** Show the @ prefix inside the input. Defaults to true. */
  showAtPrefix?: boolean
  /** Optional id for the input, for form labels. */
  id?: string
  disabled?: boolean
}

export function UsernamePicker({
  initialValue,
  selfId,
  onValidityChange,
  label = 'Username',
  showAtPrefix = true,
  id = 'username',
  disabled = false,
}: UsernamePickerProps) {
  const supabase = createClient()
  const [value, setValue] = useState(initialValue ?? '')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const reqIdRef = useRef(0)

  // Run validation + availability whenever value changes (debounced).
  useEffect(() => {
    const trimmed = value.trim()

    // Empty input = idle (CTA stays disabled, no error visible).
    if (!trimmed) {
      setStatus({ kind: 'idle' })
      return
    }

    const validation = validateUsername(trimmed)
    if (!validation.ok) {
      setStatus({ kind: 'invalid', message: validation.error })
      return
    }

    // If the normalized value matches initialValue, it's already ours — skip the
    // network round-trip and treat as available immediately.
    if (initialValue && initialValue.toLowerCase() === validation.normalized) {
      setStatus({ kind: 'available' })
      return
    }

    setStatus({ kind: 'checking' })
    const myReq = ++reqIdRef.current

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles_public')
        .select('id')
        .ilike('username', validation.normalized)
        .neq('id', selfId)
        .limit(1)
        .maybeSingle()

      // Stale response — a newer keystroke already overrode this check.
      if (myReq !== reqIdRef.current) return

      setStatus(data ? { kind: 'taken' } : { kind: 'available' })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [value, initialValue, selfId, supabase])

  // Bubble validity up to the parent on every render.
  useEffect(() => {
    if (!onValidityChange) return
    const validation = validateUsername(value.trim())
    const normalized = validation.ok ? validation.normalized : null
    const canSubmit = status.kind === 'available'
    onValidityChange({ value, canSubmit, normalized })
  }, [value, status, onValidityChange])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        {showAtPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
            @
          </span>
        )}
        <Input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase().replace(/\s/g, ''))}
          placeholder="joaquim_colacilli"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          className={cn(
            'h-9 pr-9',
            showAtPrefix && 'pl-7',
            status.kind === 'invalid' && 'border-destructive/60 focus-visible:ring-destructive/30',
            status.kind === 'taken' && 'border-destructive/60 focus-visible:ring-destructive/30',
            status.kind === 'available' && 'border-emerald-500/50 focus-visible:ring-emerald-500/20',
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {status.kind === 'checking' && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
          {status.kind === 'available' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
          {status.kind === 'taken' && <X className="w-3.5 h-3.5 text-destructive" />}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        3-20 caracteres. Letras minúsculas, números y guión bajo.
      </p>
      {status.kind === 'invalid' && (
        <p className="text-[12px] text-destructive">{status.message}</p>
      )}
      {status.kind === 'taken' && (
        <p className="text-[12px] text-destructive">Este username ya está en uso.</p>
      )}
    </div>
  )
}
