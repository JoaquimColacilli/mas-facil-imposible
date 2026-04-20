'use client'

import { useEffect, useRef, useState } from 'react'
import { Link2, X, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type {
  CommunityAuthor,
  CommunityCategoryId,
  CommunityPost,
  CommunityPostEmbed,
} from '@/lib/types'
import { POSTABLE_CATEGORIES } from './categories'
import { MfiAttachPicker } from './mfi-attach-picker'
import { MfiEmbed } from './mfi-embed'
import { displayName, getInitials } from './post-card'
import { RichTextEditor } from './rich-text-editor'
import { uploadCommunityImage, deleteCommunityImageByUrl } from './upload-image'

const MAX_IMAGES = 4

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: CommunityAuthor
  /** When set, the dialog runs in edit mode and updates the post in-place. */
  editing?: CommunityPost | null
  onPublish?: (post: CommunityPost) => void
  onUpdate?: (post: CommunityPost) => void
}

export function ComposerDialog({
  open,
  onOpenChange,
  currentUser,
  editing,
  onPublish,
  onUpdate,
}: Props) {
  const supabase = createClient()
  const isEditing = !!editing
  const [category, setCategory] = useState<CommunityCategoryId>('inversiones')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [embed, setEmbed] = useState<CommunityPostEmbed | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Prefill when entering edit mode, reset when closing.
  useEffect(() => {
    if (open && editing) {
      setCategory(editing.category)
      setTitle(editing.title)
      setBody(editing.body)
      setEmbed(editing.embed)
      setImages(editing.image_urls ?? [])
      setPickerOpen(false)
    }
    if (!open) {
      setCategory('inversiones')
      setTitle('')
      setBody('')
      setEmbed(null)
      setImages([])
      setPickerOpen(false)
    }
  }, [open, editing])

  const handleFilesPicked = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      toast.error(`Podés adjuntar hasta ${MAX_IMAGES} imágenes.`)
      return
    }
    const take = Array.from(files).slice(0, remaining)
    setUploading(true)
    const uploaded: string[] = []
    for (const file of take) {
      const res = await uploadCommunityImage(supabase, currentUser.id, file)
      if (!res.ok) {
        toast.error(res.reason)
        continue
      }
      uploaded.push(res.url)
    }
    if (uploaded.length > 0) {
      setImages((prev) => [...prev, ...uploaded])
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url))
    // Best-effort delete from storage. If the post was already saved with
    // this URL, the next update call will strip it from image_urls; if the
    // storage delete fails we don't block UX.
    void deleteCommunityImageByUrl(supabase, url)
  }

  const canPublish = title.trim().length > 0 && !submitting

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    if (!canPublish) return
    setSubmitting(true)

    if (isEditing && editing) {
      const { data, error } = await supabase
        .from('community_posts')
        .update({
          category,
          title: title.trim(),
          body: body.trim(),
          embed,
          image_urls: images,
          edited_at: new Date().toISOString(),
        })
        .eq('id', editing.id)
        .eq('user_id', currentUser.id)
        .select(
          'id, user_id, category, title, body, embed, image_urls, vote_count, comment_count, created_at, edited_at, deleted_at',
        )
        .single()

      setSubmitting(false)

      if (error || !data) {
        toast.error('No se pudo guardar', { description: error?.message })
        return
      }

      const updated: CommunityPost = {
        ...editing,
        ...data,
      } as CommunityPost
      toast.success('Publicación actualizada')
      onUpdate?.(updated)
      onOpenChange(false)
      return
    }

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: currentUser.id,
        category,
        title: title.trim(),
        body: body.trim(),
        embed,
        image_urls: images,
      })
      .select(
        'id, user_id, category, title, body, embed, image_urls, vote_count, comment_count, created_at, edited_at, deleted_at',
      )
      .single()

    setSubmitting(false)

    if (error || !data) {
      toast.error('No se pudo publicar', { description: error?.message })
      return
    }

    const newPost: CommunityPost = {
      ...data,
      author: currentUser,
      myVote: 0,
      saved: false,
    } as CommunityPost

    toast.success('Publicación creada')
    onPublish?.(newPost)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 h-14 flex-row items-center border-b border-border space-y-0">
          <DialogTitle className="font-serif text-base font-semibold">
            {isEditing ? 'Editar publicación' : 'Nueva publicación'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Author */}
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8">
              {currentUser.avatar_url && (
                <AvatarImage src={currentUser.avatar_url} alt="" />
              )}
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(currentUser)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">
                {displayName(currentUser)}
              </div>
              {currentUser.username && (
                <div className="text-[11px] text-muted-foreground font-mono">
                  @{currentUser.username}
                </div>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Categoría
            </label>
            <div className="mt-1.5 flex gap-1.5 flex-wrap">
              {POSTABLE_CATEGORIES.map((cat) => {
                const isActive = cat.id === category
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as CommunityCategoryId)}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12.5px] font-medium border transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground/80 hover:border-primary/40',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Un título claro y directo…"
              maxLength={140}
              className="mt-1.5 w-full h-11 rounded-lg border border-border bg-muted/40 px-3 text-[15px] font-serif font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-background transition-colors"
            />
            <div className="mt-1 text-[11px] text-muted-foreground text-right font-mono">
              {title.length}/140
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Contenido
            </label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Contá tu experiencia, tu jugada, tu duda…"
              className="mt-1.5"
            />
            <div className="mt-2 rounded-lg border border-border bg-muted/40">
              <div className="flex items-center gap-0.5 px-2 h-10">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesPicked(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= MAX_IMAGES}
                  className="inline-flex items-center gap-1.5 h-8 px-2 rounded text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" strokeWidth={2.2} />
                  )}
                  Imagen
                  {images.length > 0 && (
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {images.length}/{MAX_IMAGES}
                    </span>
                  )}
                </button>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1.5 h-8 px-2 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                      {embed ? 'Cambiar adjunto' : 'Adjuntar de MFI'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-80 p-0 border-0 bg-transparent shadow-none"
                  >
                    <MfiAttachPicker
                      onSelect={(e) => {
                        setEmbed(e)
                        setPickerOpen(false)
                      }}
                      onClose={() => setPickerOpen(false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Image thumbnails */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {images.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 grid place-items-center rounded-full bg-background/90 border border-border hover:bg-background"
                    aria-label="Quitar imagen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Embed preview */}
          {embed && (
            <div className="relative">
              <MfiEmbed data={embed} variant="rich" />
              <button
                type="button"
                onClick={() => setEmbed(null)}
                className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full bg-background border border-border hover:bg-muted"
                aria-label="Quitar adjunto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 h-16 border-t border-border">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Revisá las reglas antes de publicar.
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canPublish}>
              {isEditing ? 'Guardar' : 'Publicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
