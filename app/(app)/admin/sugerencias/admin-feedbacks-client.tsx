'use client'

import { useState } from 'react'
import type { Feedback } from '@/lib/types'
import { updateFeedbackStatus } from './actions'
import { Lightbulb, CheckCircle2, Circle, Clock, Mail, Calendar, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminFeedbacksClient({ initialFeedbacks }: { initialFeedbacks: Feedback[] }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks)

  async function toggleStatus(id: string, current: string) {
    const nextStatus = current === 'pending' ? 'reviewed' : 'pending'
    try {
      await updateFeedbackStatus(id, nextStatus)
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: nextStatus } : f))
    } catch {
      // silently ignore
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border/60">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sugerencias Recibidas</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Panel exclusivo de administración. {feedbacks.filter(f => f.status === 'pending').length} pendientes de lectura.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {feedbacks.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            No hay sugerencias en la base de datos todavía.
          </div>
        ) : (
          feedbacks.map(f => (
            <div 
              key={f.id} 
              className={cn(
                "bg-card border rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all relative overflow-hidden",
                f.status === 'reviewed' ? "border-border opacity-75 grayscale-[20%]" : "border-amber-500/30"
              )}
            >
              {f.status === 'reviewed' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              )}
              {f.status === 'pending' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              )}

              {/* Meta information */}
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground truncate">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{f.profile?.email || 'Usuario Desconocido'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Calendar className="w-3 h-3 shrink-0" />
                    {formatDate(f.created_at)}
                  </div>
                </div>
                
                <button
                  onClick={() => toggleStatus(f.id, f.status)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors",
                    f.status === 'reviewed' 
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                  )}
                >
                  {f.status === 'reviewed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {f.status === 'reviewed' ? 'Revisado' : 'Pendiente'}
                </button>
              </div>

              {/* Message text */}
              <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap flex-1 bg-muted/20 p-3 rounded-xl border border-border/40">
                {f.message}
              </p>

              {/* Images */}
              {f.image_urls && f.image_urls.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none mt-1">
                  {f.image_urls.map((url, index) => (
                    <a 
                      key={index} 
                      href={url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="group relative w-16 h-16 rounded-lg border border-border overflow-hidden shrink-0 bg-muted/40"
                    >
                      <img src={url} alt="adjunto" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-white" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
