import Link from 'next/link'
import { MessageCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ChatNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <MessageCircle className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <h1 className="text-lg font-semibold text-foreground">
          No encontramos esta conversación
        </h1>
        <p className="text-sm text-muted-foreground">
          Puede ser que el usuario ya no exista o que no tengas permiso para verla.
        </p>
      </div>
      <Button asChild size="sm" className="gap-1.5">
        <Link href="/chat">
          <ArrowLeft className="w-4 h-4" />
          Volver a mensajes
        </Link>
      </Button>
    </div>
  )
}
