'use client'

import { useState } from 'react'
import type { Profile, Currency } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/app/auth/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ThemeToggle } from '@/components/theme-toggle'
import { AvatarUpload } from '@/components/avatar-upload'
import { MoodPicker } from '@/components/mood-picker'
import { LogOut, Save, Lock, Eye, EyeOff, CheckCircle2, Mail, User, AtSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsClientProps {
  profile: Profile | null
  userEmail: string
  userId: string
}

export function SettingsClient({ profile, userEmail, userId }: SettingsClientProps) {
  const supabase = createClient()

  // Profile form
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [currency, setCurrency] = useState<Currency>(profile?.default_currency ?? 'ARS')
  const [moodEmoji, setMoodEmoji] = useState(profile?.mood_emoji ?? null)
  const [moodText, setMoodText] = useState(profile?.mood_text ?? null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : userEmail.slice(0, 2).toUpperCase()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName || null,
        nickname: nickname || null,
        mood_emoji: moodEmoji,
        mood_text: moodText,
        default_currency: currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)

    if (newPassword.length < 6) {
      setPwError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden.')
      return
    }

    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwError(error.message)
    } else {
      setPwSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwSaved(false), 3000)
    }
    setPwSaving(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Ajustes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* ── Left column: Profile card ──────────────────────────── */}
        <Card className="lg:sticky lg:top-20">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <AvatarUpload
              userId={userId}
              currentUrl={avatarUrl}
              fallbackInitials={initials}
              onUploaded={(url) => setAvatarUrl(url)}
            />

            <div className="flex flex-col items-center gap-0.5 mt-1">
              <p className="text-base font-semibold text-foreground leading-tight">
                {fullName || 'Sin nombre'}
              </p>
              {nickname && (
                <p className="text-sm text-muted-foreground">@{nickname}</p>
              )}
            </div>

            {(moodEmoji || moodText) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60">
                {moodEmoji && <span className="text-sm">{moodEmoji}</span>}
                {moodText && <span className="text-xs text-muted-foreground">{moodText}</span>}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Mail className="w-3 h-3" />
              {userEmail}
            </div>
          </CardContent>
        </Card>

        {/* ── Right column: Forms ────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="full_name" className="text-xs text-muted-foreground">Nombre completo</Label>
                    <Input
                      id="full_name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="nickname" className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><AtSign className="w-3 h-3" /> Apodo</span>
                    </Label>
                    <Input
                      id="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value.replace(/\s/g, '').toLowerCase())}
                      placeholder="tu_apodo"
                      maxLength={20}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={userEmail} disabled className="h-9 opacity-60 cursor-not-allowed" />
                </div>

                {/* Mood */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <MoodPicker
                    emoji={moodEmoji}
                    text={moodText}
                    onEmojiChange={setMoodEmoji}
                    onTextChange={setMoodText}
                  />
                </div>

                {/* Preferences inline */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Moneda por defecto</p>
                    <p className="text-xs text-muted-foreground">Para nuevos movimientos</p>
                  </div>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Tema</p>
                    <p className="text-xs text-muted-foreground">Claro u oscuro</p>
                  </div>
                  <ThemeToggle />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" size="sm" className="gap-1.5 self-start" disabled={saving}>
                  {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new_pw" className="text-xs text-muted-foreground">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="new_pw"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="h-9 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirm_pw" className="text-xs text-muted-foreground">Confirmar contraseña</Label>
                    <Input
                      id="confirm_pw"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetir contraseña"
                      className="h-9"
                    />
                  </div>
                </div>

                {pwError && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {pwError}
                  </p>
                )}
                {pwSaved && (
                  <p className="text-sm text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Contraseña actualizada correctamente.
                  </p>
                )}

                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 self-start"
                  disabled={pwSaving || !newPassword}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {pwSaving ? 'Cambiando...' : 'Cambiar contraseña'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Session */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Sesión</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => signOut()}
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
