'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AtSign, Save, CheckCircle2, Copy, Share2, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { UsernamePicker } from './username-picker'
import { setUsername as setUsernameAction } from './social-actions'

const BIO_MAX = 160

interface SocialProfileCardProps {
  profile: Profile
  userId: string
}

export function SocialProfileCard({ profile, userId }: SocialProfileCardProps) {
  const supabase = createClient()
  const router = useRouter()

  const [pickerState, setPickerState] = useState<{
    value: string
    canSubmit: boolean
    normalized: string | null
  }>({ value: profile.username ?? '', canSubmit: !!profile.username, normalized: profile.username })

  const [isDiscoverable, setIsDiscoverable] = useState(profile.is_discoverable)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !profile.username) {
      setInviteUrl(null)
      return
    }
    setInviteUrl(`${window.location.origin}/add/${profile.username}`)
  }, [profile.username])

  const onPickerChange = useCallback(
    (state: { value: string; canSubmit: boolean; normalized: string | null }) => {
      setPickerState(state)
    },
    [],
  )

  async function handleSave() {
    setSaving(true)
    try {
      // 1. username via server action (handles rate limit + same-value short-circuit)
      const desired = pickerState.normalized
      if (!desired) {
        toast.error('Elegí un username válido antes de guardar.')
        setSaving(false)
        return
      }
      const usernameResult = await setUsernameAction(desired)
      if (!usernameResult.ok) {
        toast.error(usernameResult.error)
        setSaving(false)
        return
      }

      // 2. is_discoverable + bio via direct browser update (RLS protected).
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          is_discoverable: isDiscoverable,
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (profileErr) {
        toast.error('No se pudo guardar el perfil social.')
        setSaving(false)
        return
      }

      setSaved(true)
      toast.success('Perfil social actualizado.')
      setTimeout(() => setSaved(false), 2000)

      // Refresh server components so the topbar/sidebar reflect new values.
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    toast.success('Link copiado al portapapeles.')
  }

  async function handleShare() {
    if (!inviteUrl) return
    try {
      await navigator.share({
        title: 'Sumame en MFI',
        text: `Agregame en MFI: @${profile.username}`,
        url: inviteUrl,
      })
    } catch {
      // User canceled or unsupported — silent.
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const bioCount = bio.length
  const overBio = bioCount > BIO_MAX

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AtSign className="w-4 h-4 text-muted-foreground" />
          Perfil social
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Username */}
        <UsernamePicker
          initialValue={profile.username}
          selfId={userId}
          onValidityChange={onPickerChange}
          id="settings-username"
          disabled={saving}
        />

        {/* Discoverable toggle */}
        <div className="flex items-start justify-between gap-4 pt-2 border-t border-border">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Permitir que otros te encuentren</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Si lo activás, cualquiera puede encontrarte buscando tu username y enviarte solicitudes
              de amistad. Si lo desactivás, solo te podés agregar mediante link directo.
            </p>
          </div>
          <Switch
            checked={isDiscoverable}
            onCheckedChange={setIsDiscoverable}
            disabled={saving}
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label htmlFor="settings-bio" className="text-xs text-muted-foreground">
              Bio
            </Label>
            <span
              className={cn(
                'text-[11px]',
                overBio ? 'text-destructive font-medium' : 'text-muted-foreground',
              )}
            >
              {bioCount}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Una breve descripción visible en tu perfil público (opcional)."
            maxLength={BIO_MAX + 20 /* allow a little over to show the warning */}
            rows={3}
            className="resize-none text-sm"
            disabled={saving}
          />
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          size="sm"
          className="gap-1.5 self-start"
          disabled={saving || !pickerState.canSubmit || overBio}
        >
          {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar perfil social'}
        </Button>

        {/* Invite link — only when username is set */}
        {inviteUrl && (
          <div className="flex flex-col gap-2 pt-3 border-t border-border">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Link2 className="w-3 h-3" />
              Link de invitación
            </Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="text-xs font-mono text-foreground/80 truncate flex-1" title={inviteUrl}>
                {inviteUrl}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canShare && (
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleShare}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartir
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopy}
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

