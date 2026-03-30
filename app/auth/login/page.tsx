'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { login } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col md:flex-row bg-background">

      {/* ── Left panel — editorial brand ── */}
      <div className="hidden md:flex md:w-[44%] lg:w-[42%] bg-foreground flex-col justify-between p-10 xl:p-14 relative overflow-hidden shrink-0">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative">
          <Image
            src="/mfi-logo.png"
            alt="MFI — Más Fácil Imposible"
            width={140}
            height={48}
            className="h-10 w-auto object-contain invert"
            priority
          />
        </div>

        {/* Central editorial copy */}
        <div className="relative space-y-6">
          <p className="font-serif text-[38px] xl:text-[44px] font-semibold text-background leading-[1.1] tracking-tight max-w-[340px] text-balance">
            Más fácil, imposible.
          </p>
          <p className="text-background/50 text-[14px] leading-relaxed max-w-[280px]">
            Tus finanzas personales, claras y sin fricciones. Ingresos, gastos, ahorros e inversiones en un solo lugar.
          </p>
        </div>

        {/* Bottom stat bar */}
        <div className="relative flex items-center gap-8">
          {[
            { label: 'ARS',  desc: 'Moneda local' },
            { label: 'USD',  desc: 'Dólar'         },
            { label: '100%', desc: 'Privado'        },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-background text-[15px] font-semibold font-mono leading-none">{item.label}</p>
              <p className="text-background/40 text-[10px] mt-1 leading-none tracking-wide">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="flex items-center mb-10 md:hidden">
            <Image
              src="/mfi-logo.png"
              alt="MFI — Más Fácil Imposible"
              width={120}
              height={40}
              className="h-8 w-auto object-contain dark:invert"
              priority
            />
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-[26px] font-semibold text-foreground tracking-tight leading-tight text-balance">
              Bienvenido de nuevo
            </h1>
            <p className="text-muted-foreground text-[14px] mt-1.5">
              Ingresá tu cuenta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vos@ejemplo.com"
                required
                autoComplete="email"
                className="h-11 rounded-xl text-[14px] border-border bg-background transition-shadow duration-150 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-semibold text-foreground">
                  Contraseña
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[12px] text-muted-foreground hover:text-primary transition-colors duration-150 font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl text-[14px] pr-10 border-border bg-background transition-shadow duration-150 focus-visible:ring-1 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors duration-150"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[13px] text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 leading-relaxed">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-[14px] font-semibold mt-1 shadow-none transition-opacity duration-150 hover:opacity-90"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <p className="text-center text-[13px] text-muted-foreground mt-6">
            ¿No tenés cuenta?{' '}
            <Link href="/auth/register" className="text-primary hover:underline font-semibold transition-colors duration-150">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
