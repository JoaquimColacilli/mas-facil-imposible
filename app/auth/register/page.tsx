'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirm_password') as string
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col md:flex-row bg-background">

      {/* ── Left panel ─────────────────────────────── */}
      <div className="hidden md:flex md:w-[44%] lg:w-[40%] bg-foreground flex-col justify-between p-10 xl:p-14 relative overflow-hidden shrink-0">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative flex items-baseline gap-2">
          <span className="font-serif text-[22px] font-semibold tracking-tight text-background leading-none">MFI</span>
          <span className="text-[9px] font-sans uppercase tracking-[0.18em] text-background/40 leading-none font-medium">Finanzas</span>
        </div>
        <div className="relative space-y-5">
          <p className="font-serif text-[34px] xl:text-[38px] font-semibold text-background leading-[1.15] tracking-tight max-w-[300px] text-balance">
            Conocé a dónde va tu dinero.
          </p>
          <p className="text-background/50 text-[14px] leading-relaxed max-w-[260px]">
            Creá tu cuenta en segundos y empezá a registrar tus finanzas de forma simple y privada.
          </p>
        </div>
        <div className="relative flex items-center gap-6">
          {[
            { label: 'ARS', desc: 'Moneda local' },
            { label: 'USD', desc: 'Dólar' },
            { label: '100%', desc: 'Privado' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-background text-[15px] font-semibold font-mono leading-none">{item.label}</p>
              <p className="text-background/40 text-[10px] mt-1 leading-none tracking-wide">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[360px]">
          {/* Mobile brand */}
          <div className="flex items-baseline gap-2 mb-10 md:hidden">
            <span className="font-serif text-[20px] font-semibold tracking-tight text-foreground leading-none">MFI</span>
            <span className="text-[9px] font-sans uppercase tracking-[0.18em] text-foreground/35 leading-none">Finanzas</span>
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-[26px] font-semibold text-foreground tracking-tight leading-tight text-balance">
              Creá tu cuenta
            </h1>
            <p className="text-muted-foreground text-[14px] mt-1.5">
              Empezá a organizar tus finanzas hoy
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name" className="text-[13px] font-semibold text-foreground">Nombre completo</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Joaquim Colacilli"
                required
                autoComplete="name"
                className="h-11 rounded-xl text-[14px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vos@ejemplo.com"
                required
                autoComplete="email"
                className="h-11 rounded-xl text-[14px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-[13px] font-semibold text-foreground">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-11 rounded-xl text-[14px] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm_password" className="text-[13px] font-semibold text-foreground">Confirmar contraseña</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repetí tu contraseña"
                required
                autoComplete="new-password"
                className="h-11 rounded-xl text-[14px]"
              />
            </div>

            {error && (
              <div className="text-[13px] text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 leading-relaxed">
                {error}
              </div>
            )}

            <Button type="submit" className="h-11 w-full rounded-xl text-[14px] font-semibold mt-1 shadow-none" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-[13px] text-muted-foreground mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-semibold">
              Ingresá
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
