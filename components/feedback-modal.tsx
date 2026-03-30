'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Lightbulb, Image as ImageIcon, X, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FeedbackModal() {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      // Limit to 3 images max
      if (images.length + newFiles.length > 3) {
        alert("Máximo 3 imágenes permitidas")
        return
      }
      setImages(prev => [...prev, ...newFiles])
    }
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!message.trim()) return
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const imageUrls: string[] = []

      // 1. Upload images one by one
      for (const file of images) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('feedback_images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('feedback_images')
            .getPublicUrl(fileName)
          imageUrls.push(publicUrl)
        }
      }

      // 2. Insert feedback
      await supabase.from('feedbacks').insert({
        user_id: user.id,
        message: message.trim(),
        image_urls: imageUrls,
      })

      setSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
        setMessage('')
        setImages([])
      }, 2000)

    } catch (err) {
      console.error(err)
      alert("Hubo un error al enviar tu sugerencia.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Enviar Sugerencia / Bug"
        className={cn(
          "flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold transition-all duration-200",
          "border border-border text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 ml-1"
        )}
      >
        <Lightbulb className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sugerencias</span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !loading && setIsOpen(false)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="w-full max-w-lg bg-card border border-border/80 shadow-2xl rounded-[1.5rem] p-6 relative flex flex-col max-h-[85vh] pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-[60] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5 relative z-10 shrink-0">
              <h2 className="text-[20px] font-bold tracking-tight flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Sugerencias y Mejoras
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                ¿Encontraste un error o tenés alguna idea para mejorar la app? Te escuchamos.
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold">¡Gracias por tu aporte!</h3>
                <p className="text-[13px] text-muted-foreground mt-2">La leída va directo a nuestros desarrolladores.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0 relative z-10 pr-2 -mr-2 flex flex-col gap-4">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Escribí acá tu sugerencia, bug o idea brillante..."
                  className="w-full min-h-[140px] resize-none bg-muted/40 text-[13px] text-foreground border border-border/60 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60 transition-all"
                  disabled={loading}
                />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || images.length >= 3}
                      className="flex items-center gap-2 text-[12px] font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors disabled:opacity-50"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Adjuntar Imagen ({images.length}/3)
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {images.map((file, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-border/60 w-20 h-20 shrink-0">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="preview" 
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeImage(i)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={loading}
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 shrink-0 flex items-center justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !message.trim()}
                    className="h-10 rounded-xl px-8 text-[13px] font-semibold ml-auto"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                    ) : (
                      'Enviar Sugerencia'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
