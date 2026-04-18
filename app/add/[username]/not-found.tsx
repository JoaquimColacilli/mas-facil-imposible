import Link from 'next/link'
import { ArrowLeft, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AddUsernameNotFound() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <span className="font-serif text-lg font-bold tracking-tight">MFI</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
            <UserX className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Usuario no encontrado</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este usuario no existe o no permite ser encontrado.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
