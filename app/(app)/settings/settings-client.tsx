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
import { LogOut, Save } from 'lucide-react'

interface SettingsClientProps {
  profile: Profile | null
  userEmail: string
}

export function SettingsClient({ profile, userEmail }: SettingsClientProps) {
  const supabase = createClient()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [currency, setCurrency] = useState<Currency>(profile?.default_currency ?? 'ARS')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, default_currency: currency, updated_at: new Date().toISOString() })
      .eq('id', profile?.id ?? '')

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-xl font-semibold text-foreground">Ajustes</h1>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name" className="text-xs text-muted-foreground">Nombre completo</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={userEmail} disabled className="h-10 opacity-60 cursor-not-allowed" />
            </div>
            {error && (
              <p className="text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" size="sm" className="gap-1.5 self-start" disabled={saving}>
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Preferencias</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Moneda por defecto</p>
              <p className="text-xs text-muted-foreground">Se usará al crear nuevos movimientos</p>
            </div>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-28 h-9">
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
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive-foreground border-destructive/30 hover:bg-destructive/10"
            onClick={() => signOut()}
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
