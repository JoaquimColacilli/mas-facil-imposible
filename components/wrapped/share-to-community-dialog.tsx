'use client'

import { useState } from 'react'
import { Loader2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import type { CommunityPost, CommunityPostEmbed } from '@/lib/types'
import type { WrappedData } from '@/lib/wrapped/types'
import {
  PERSONALITIES,
  PERSONALITY_COMMUNITY_CATEGORY,
} from '@/lib/wrapped/personalities'
import { ShareCard } from './share-card'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: WrappedData
  currentUserId: string
  onPublished: (postId: string) => void
}

function buildDefaultTitle(data: WrappedData): string {
  const p = PERSONALITIES[data.personality]
  return `Mi ${data.month.toLowerCase()} en MFI — ${p.label.toLowerCase()}`
}

function buildDefaultBody(data: WrappedData): string {
  const p = PERSONALITIES[data.personality]
  const hashtags = [
    '#wrapped',
    `#${data.month.toLowerCase()}${data.year}`,
    `#${p.id}`,
  ].join(' ')
  return `Este fue mi ${data.month.toLowerCase()} 👇\n¿Sos del ${p.label.toLowerCase()} también? Contame cómo te fue.\n\n${hashtags}`
}

function buildEmbed(data: WrappedData): Extract<CommunityPostEmbed, { kind: 'wrapped' }> {
  return {
    kind: 'wrapped',
    month_label: data.month,
    month_key: data.monthKey,
    year: data.year,
    personality: data.personality,
    balance_ars: data.balance.ars,
    savings_total_ars: data.savings.savings + data.savings.investment,
    top_category_name: data.topCategory?.name ?? '—',
    top_category_amount_ars: data.topCategory?.amount ?? 0,
    top_category_pct: data.topCategory?.pctOfExpenses ?? 0,
    daily: data.peakDay?.daily ?? [],
    user_name: data.user.name,
    user_initials: data.user.initials,
  }
}

export function ShareToCommunityDialog({
  open,
  onOpenChange,
  data,
  currentUserId,
  onPublished,
}: Props) {
  const [title, setTitle] = useState(buildDefaultTitle(data))
  const [body, setBody] = useState(buildDefaultBody(data))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const p = PERSONALITIES[data.personality]
  const category = PERSONALITY_COMMUNITY_CATEGORY[data.personality]
  const hashtags = ['wrapped', `${data.month.toLowerCase()}${data.year}`, p.id]

  const handlePublish = async () => {
    if (submitting) return
    if (title.trim().length === 0) {
      setError('Poné un título.')
      return
    }
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { data: row, error: insertError } = await supabase
      .from('community_posts')
      .insert({
        user_id: currentUserId,
        category,
        title: title.trim(),
        body: body.trim(),
        embed: buildEmbed(data),
        image_urls: [],
      })
      .select('id')
      .single()

    setSubmitting(false)

    if (insertError || !row) {
      setError(insertError?.message ?? 'No pudimos publicar — probá de nuevo.')
      return
    }
    onPublished((row as Pick<CommunityPost, 'id'>).id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px] p-0 gap-0 overflow-hidden z-[110]"
        overlayClassName="z-[105]"
      >
        <DialogHeader className="px-5 h-14 flex-row items-center border-b border-border space-y-0">
          <DialogTitle className="font-serif text-base font-semibold">
            Compartir en Comunidad
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              className="mt-1.5 w-full h-11 rounded-lg border border-border bg-muted/40 px-3 text-[15px] font-serif font-medium focus:outline-none focus:border-primary focus:bg-background transition-colors"
            />
            <div className="mt-1 text-[11px] text-muted-foreground text-right font-mono">
              {title.length}/140
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Mensaje
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="mt-1.5 w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-[14px] font-sans focus:outline-none focus:border-primary focus:bg-background transition-colors resize-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              <Tag className="w-3 h-3" strokeWidth={2.2} />
              Categoría
            </span>
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-muted text-foreground/80 text-[12px] font-medium">
              {category === 'inversiones' ? 'Inversiones' : 'Ahorros'}
            </span>
            <span className="text-[11px] text-muted-foreground ml-1">
              · se elige por tu personalidad del mes
            </span>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Vista previa
            </div>
            <div className="w-full max-w-[280px] mx-auto">
              <ShareCard data={data} ratio="feed" flat />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 h-16 border-t border-border">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            Se publica con #{hashtags.join(' #')}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handlePublish} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Publicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
