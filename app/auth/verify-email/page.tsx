import Link from 'next/link'
import { TrendingUp, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-svh flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="text-foreground font-semibold text-base tracking-tight">MFI</span>
        </div>

        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-2 text-balance">Verificá tu email</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          Te enviamos un link de confirmación a tu email. Hacé clic en el link para activar tu cuenta y empezar a usar MFI.
        </p>

        <p className="text-xs text-muted-foreground mb-6">
          ¿No llegó?  Revisá la carpeta de spam o ingresá con tu cuenta si ya confirmaste.
        </p>

        <Link href="/auth/login">
          <Button variant="outline" className="w-full h-11">
            Ir al inicio de sesión
          </Button>
        </Link>
      </div>
    </div>
  )
}
