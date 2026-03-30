'use client'

import { useState } from 'react'
import Link from 'next/link'
import { resetPassword } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await resetPassword(formData)
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="text-foreground font-semibold text-base tracking-tight">Finely</span>
        </div>

        {success ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Revisá tu email</h1>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Te enviamos un link para restablecer tu contraseña. Revisá también la carpeta de spam.
            </p>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full h-11">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground mb-1 text-balance">Olvidé mi contraseña</h1>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              Ingresá tu email y te enviamos un link para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vos@ejemplo.com"
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al inicio
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
