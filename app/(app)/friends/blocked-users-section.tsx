'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ChevronDown, Ban } from 'lucide-react'
import { toast } from 'sonner'
import type { PublicProfile } from '@/lib/types'
import { unblockUser } from './actions'

interface BlockedUsersSectionProps {
  blocked: PublicProfile[]
}

export function BlockedUsersSection({ blocked }: BlockedUsersSectionProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<PublicProfile | null>(null)
  const [pending, startTransition] = useTransition()

  // Hidden completely when nothing to show — avoids visual noise for the
  // 99% of users who never block anyone.
  if (blocked.length === 0) return null

  function handleConfirm() {
    if (!confirming) return
    const target = confirming
    startTransition(async () => {
      const result = await unblockUser(target.id)
      if (!result.ok) {
        toast.error(result.error ?? 'No se pudo desbloquear.')
        return
      }
      toast.success('Usuario desbloqueado.')
      setConfirming(null)
      router.refresh()
    })
  }

  return (
    <section className="mt-8">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-border hover:bg-muted/40 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Ban className="w-4 h-4 text-muted-foreground" />
              Usuarios bloqueados
              <span className="text-[11px] font-bold bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
                {blocked.length}
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3">
          <p className="text-xs text-muted-foreground mb-3 px-1 leading-relaxed">
            Estos usuarios no pueden verte ni contactarte. No se enteran de que los bloqueaste.
          </p>

          <div className="rounded-lg border border-border overflow-hidden">
            {blocked.map((b) => {
              const initials = (b.nickname ?? b.username ?? '?').slice(0, 2).toUpperCase()
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0"
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    {b.avatar_url && <AvatarImage src={b.avatar_url} alt={`@${b.username}`} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {b.nickname ?? b.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{b.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setConfirming(b)}
                  >
                    Desbloquear
                  </Button>
                </div>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={!!confirming} onOpenChange={(o) => !o && !pending && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desbloquear a @{confirming?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Volverán a verse mutuamente en la app. No se les va a avisar del cambio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={pending}>
              {pending ? 'Desbloqueando…' : 'Desbloquear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
