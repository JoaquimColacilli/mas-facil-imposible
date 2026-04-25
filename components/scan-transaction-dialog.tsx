'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Upload, ScanLine, Loader2, FileText, Camera, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import type { ExtractedTransaction } from '@/lib/types'

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const PDF_TYPE = 'application/pdf'
const ALLOWED_TYPES = [...IMAGE_TYPES, PDF_TYPE]
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_PDF_BYTES = 10 * 1024 * 1024

interface Props {
  onClose: () => void
  /** Llamado con la lista de movimientos extraídos. Siempre array, mínimo 1. */
  onExtracted: (transactions: ExtractedTransaction[]) => void
  /** Si está presente, muestra un link "Cargar a mano" al final del dialog.
   *  Lo usamos en mobile como salida cuando el FAB scanner es el único punto
   *  de entrada visible y el usuario igual quiere cargar manualmente. */
  onManualEntry?: () => void
}

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const idx = result.indexOf(',')
      resolve(idx >= 0 ? result.slice(idx + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(f)
  })
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function ScanTransactionDialog({ onClose, onExtracted, onManualEntry }: Props) {
  const isMobile = useIsMobile()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPdf = file?.type === PDF_TYPE

  function pickFile(f: File | null | undefined) {
    if (!f) return
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Formato no soportado. Usá PNG, JPG, WebP o PDF.')
      return
    }
    const limit = f.type === PDF_TYPE ? MAX_PDF_BYTES : MAX_IMAGE_BYTES
    if (f.size > limit) {
      const limitMb = limit / 1024 / 1024
      setError(`El archivo es muy grande (${(f.size / 1024 / 1024).toFixed(1)} MB). Máximo ${limitMb} MB.`)
      return
    }
    setError(null)
    setFile(f)
  }

  useEffect(() => {
    if (!file || file.type === PDF_TYPE) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Paste handler — clave para screenshots de MP / transferencias en desktop.
  // En mobile no hay clipboard de imágenes con este patrón, así que no aporta.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (loading) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) {
            const ext = blob.type.split('/')[1] || 'png'
            const named = new File([blob], `pegado-${Date.now()}.${ext}`, { type: blob.type })
            pickFile(named)
            e.preventDefault()
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loading])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  async function analyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const base64 = await fileToBase64(file)
      const { extractTransactionFromImage } = await import('@/app/(app)/transactions/actions')
      const res = await extractTransactionFromImage(base64, file.type)

      if (!res.ok) {
        switch (res.error) {
          case 'rate_limit':
            toast.error('Llegaste al límite diario de 20 análisis. Probá mañana.', { duration: 6000 })
            break
          case 'service_unavailable':
            toast.error('El servicio está saturado. Probá de nuevo en unos minutos.', { duration: 6000 })
            break
          case 'unauthenticated':
            toast.error('Tu sesión expiró. Recargá la página.', { duration: 6000 })
            break
          case 'invalid_image':
            toast.error('Este archivo no lo podemos procesar. Probá con otro.', { duration: 6000 })
            break
          default:
            toast.error('No pudimos leer el archivo. Probá con otro o cargalo manualmente.', { duration: 6000 })
        }
        setLoading(false)
        return
      }

      onExtracted(res.data.transactions)
    } catch {
      toast.error('No pudimos leer el archivo. Probá con otro o cargalo manualmente.', { duration: 6000 })
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl z-10 animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4.5 h-4.5 text-primary" />
            <h2 className="text-base font-semibold text-card-foreground">Cargar desde imagen o PDF</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted disabled:opacity-30"
            aria-label="Cerrar"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 pb-6 overflow-y-auto">
          <p className="text-[12px] text-muted-foreground -mt-1">
            Subí una foto, screenshot o PDF (resumen de tarjeta, transferencia, ticket) y lo convertimos en uno o varios movimientos.
          </p>

          {!file && isMobile && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-3 w-full h-14 px-4 rounded-2xl border border-border bg-muted/30 hover:bg-primary/8 hover:border-primary/40 transition-all duration-150"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[13.5px] font-semibold text-foreground">Tomar foto</span>
                  <span className="text-[11px] text-muted-foreground">Abre la cámara del celu</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 w-full h-14 px-4 rounded-2xl border border-border bg-muted/30 hover:bg-primary/8 hover:border-primary/40 transition-all duration-150"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[13.5px] font-semibold text-foreground">Elegir desde el dispositivo</span>
                  <span className="text-[11px] text-muted-foreground">Galería o archivos (incluye PDFs)</span>
                </div>
              </button>
            </div>
          )}

          {!file && !isMobile && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => desktopInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') desktopInputRef.current?.click() }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                pickFile(e.dataTransfer.files?.[0])
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 py-10 px-4 rounded-2xl border-2 border-dashed bg-muted/30 transition-all duration-150 cursor-pointer outline-none',
                'hover:border-primary/50 hover:bg-primary/5 focus-visible:border-primary/50 focus-visible:bg-primary/5',
                dragOver ? 'border-primary bg-primary/10' : 'border-border',
              )}
            >
              <div className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center">
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">
                Arrastrá un archivo acá
              </p>
              <p className="text-[11px] text-muted-foreground">
                o hacé click. También podés pegar con Ctrl+V.
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                PNG, JPG, WebP (hasta 4 MB) o PDF (hasta 10 MB)
              </p>
            </div>
          )}

          {file && (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30">
              {isPdf ? (
                <div className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      PDF · {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
              ) : (
                previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="w-full max-h-[280px] object-contain"
                  />
                )
              )}
              <button
                type="button"
                onClick={() => { setFile(null); setError(null) }}
                disabled={loading}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/70 backdrop-blur text-background hover:bg-foreground transition-colors flex items-center justify-center disabled:opacity-30"
                aria-label="Quitar archivo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Hidden file inputs — mobile dual + desktop single */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <input
            ref={desktopInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />

          {error && (
            <p className="text-[12px] text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={analyze}
            disabled={!file || loading}
            className="h-11 w-full rounded-xl font-semibold transition-all duration-150 hover:scale-[1.01] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4 mr-2" />
                Analizar
              </>
            )}
          </Button>

          <p className="text-[10.5px] text-muted-foreground/80 leading-relaxed text-center">
            Procesamos el archivo con Google Gemini. No lo guardamos en MFI.
          </p>

          {onManualEntry && (
            <button
              type="button"
              onClick={onManualEntry}
              disabled={loading}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-150 underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-foreground self-center mt-1 disabled:opacity-30"
            >
              Prefiero cargarlo a mano
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
