'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, TransactionType } from '@/lib/types'
import { TRANSACTION_TYPE_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Pencil, Trash2, Check, LayoutGrid } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TABS: { type: TransactionType; label: string }[] = [
  { type: 'expense',    label: 'Gastos' },
  { type: 'income',     label: 'Ingresos' },
  { type: 'savings',    label: 'Ahorros' },
  { type: 'investment', label: 'Inversiones' },
]

const PRESET_COLORS = [
  '#f59e0b', '#ef4444', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#f97316', '#06b6d4',
  '#84cc16', '#a78bfa', '#0ea5e9', '#d97706',
]

interface CategoryManagerProps {
  onClose: () => void
}

interface EditingState {
  id: string | null   // null = creating new
  name: string
  color: string
  type: TransactionType
}

export function CategoryManagerButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border bg-card text-[12px] font-semibold text-muted-foreground',
          'transition-all duration-150 hover:text-foreground hover:border-primary/40 hover:bg-muted/40 hover:-translate-y-[1px]',
        )}
        title="Gestionar categorías"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Categorías
      </button>
      {open && <CategoryManager onClose={() => setOpen(false)} />}
    </>
  )
}

export function CategoryManager({ onClose }: CategoryManagerProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TransactionType>('expense')
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: categories = [], mutate } = useSWR<Category[]>('categories', async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    return data ?? []
  })

  const tabCategories = categories.filter((c) => c.type === activeTab)

  function startCreate() {
    setEditing({ id: null, name: '', color: '#10b981', type: activeTab })
    setError(null)
  }

  function startEdit(c: Category) {
    setEditing({ id: c.id, name: c.name, color: c.color, type: c.type })
    setError(null)
  }

  const handleSave = useCallback(async () => {
    if (!editing || !editing.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError(null)

    if (editing.id) {
      // update
      const { error: err } = await supabase
        .from('categories')
        .update({ name: editing.name.trim(), color: editing.color })
        .eq('id', editing.id)
      if (err) { setError(err.message); toast.error('No se pudo actualizar. Intentá de nuevo.', { duration: 5000 }); setSaving(false); return }
      mutate(categories.map((c) => c.id === editing.id
        ? { ...c, name: editing.name.trim(), color: editing.color }
        : c
      ), false)
      toast.success('Categoría actualizada')
    } else {
      // create
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('No autenticado'); setSaving(false); return }
      const { data, error: err } = await supabase
        .from('categories')
        .insert({ user_id: user.id, name: editing.name.trim(), color: editing.color, type: activeTab, icon: 'circle' })
        .select()
        .single()
      if (err) { setError(err.message); toast.error('No se pudo crear. Intentá de nuevo.', { duration: 5000 }); setSaving(false); return }
      mutate([...categories, data as Category], false)
      toast.success('Categoría creada')
    }

    setSaving(false)
    setEditing(null)
  }, [editing, categories, mutate, activeTab, supabase])

  async function handleDelete(id: string) {
    if (deletingId !== id) { setDeletingId(id); return }
    const { error: err } = await supabase.from('categories').delete().eq('id', id)
    if (err) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); setDeletingId(null); return }
    mutate(categories.filter((c) => c.id !== id), false)
    toast.success('Categoría eliminada')
    setDeletingId(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl z-10 animate-in fade-in-0 slide-in-from-bottom-4 sm:zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">Gestionar categorías</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-1 shrink-0">
          {TABS.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => { setActiveTab(type); setEditing(null) }}
              className={cn(
                'text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all duration-150',
                activeTab === type
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
          {tabCategories.length === 0 && !editing && (
            <p className="text-[13px] text-muted-foreground text-center py-8">
              No hay categorías para {TRANSACTION_TYPE_LABELS[activeTab].toLowerCase()}s todavía.
            </p>
          )}

          {tabCategories.map((c) => (
            <div
              key={c.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150',
                editing?.id === c.id
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-background hover:border-border/80 hover:bg-muted/30',
              )}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="flex-1 text-[13px] font-medium text-foreground truncate">{c.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(c)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100"
                  title="Editar"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-100',
                    deletingId === c.id
                      ? 'bg-destructive/10 text-destructive'
                      : 'text-muted-foreground hover:text-destructive hover:bg-destructive/8',
                  )}
                  title={deletingId === c.id ? 'Confirmar eliminación' : 'Eliminar'}
                >
                  {deletingId === c.id ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}

          {/* Inline edit / create form */}
          {editing && (
            <div className="mt-2 p-4 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col gap-3 animate-in fade-in-0 slide-in-from-top-2 duration-150">
              <p className="text-[12px] font-bold text-primary uppercase tracking-wider">
                {editing.id ? 'Editar categoría' : 'Nueva categoría'}
              </p>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">Nombre</Label>
                <Input
                  autoFocus
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Nombre de la categoría"
                  className="h-9 rounded-xl text-[13px]"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } if (e.key === 'Escape') setEditing(null) }}
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">Color</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditing({ ...editing, color: col })}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-transform duration-100 hover:scale-110',
                        editing.color === col ? 'border-foreground scale-110' : 'border-transparent',
                      )}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                  <input
                    type="color"
                    value={editing.color}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    className="w-6 h-6 rounded-full overflow-hidden border-0 cursor-pointer"
                    title="Color personalizado"
                  />
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-destructive bg-destructive/10 rounded-xl px-3 py-2 border border-destructive/20">{error}</p>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="flex-1 rounded-xl font-semibold">
                  {saving ? 'Guardando...' : editing.id ? 'Guardar cambios' : 'Crear categoría'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-border shrink-0">
          {!editing && (
            <Button onClick={startCreate} variant="outline" className="w-full rounded-xl h-9 text-[13px] font-semibold gap-1.5 transition-all duration-150 hover:bg-primary hover:text-primary-foreground hover:border-primary">
              <Plus className="w-3.5 h-3.5" />
              Nueva categoría — {TRANSACTION_TYPE_LABELS[activeTab]}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
