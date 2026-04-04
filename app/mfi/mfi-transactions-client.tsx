'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, ChevronLeft, ChevronRight, ChevronDown, Search, LayoutGrid, List } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { liveFormatMoney, parseMoneyInput, formatMoneyInput } from '@/components/money-input'
import { formatCurrency } from '@/lib/types'
import type { Transaction, Category, Profile, Currency, TransactionType, MfiSheet } from '@/lib/types'
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover'
import { toast } from 'sonner'

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  expense:    { label: 'Gasto',     color: 'text-rose-500',    bg: 'bg-rose-500/10',    dot: 'bg-rose-500'    },
  income:     { label: 'Ingreso',   color: 'text-emerald-500', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  savings:    { label: 'Ahorro',    color: 'text-sky-500',     bg: 'bg-sky-500/10',     dot: 'bg-sky-500'     },
  investment: { label: 'Inversión', color: 'text-violet-500',  bg: 'bg-violet-500/10',  dot: 'bg-violet-500'  },
} as const

const TYPE_ORDER: TransactionType[] = ['expense', 'income', 'savings', 'investment']

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(iso: string) {
  const parts = iso.split('-')
  return `${parts[2]}/${parts[1]}`
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const month = d.toLocaleString('es-AR', { month: 'long' })
  const now = new Date()
  const isCurrentMonth = y === now.getFullYear() && m - 1 === now.getMonth()
  const label = `${month.charAt(0).toUpperCase() + month.slice(1)} ${y}`
  return { label, isCurrentMonth }
}

function navigateMonth(current: string, delta: number) {
  const [y, m] = current.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[]
  categories: Category[]
  initialSheets: MfiSheet[]
  profile: Profile | null
  currentMonth: string
  userId: string
}

// ─── Editable Row ────────────────────────────────────────────────────────────

interface EditableRowProps {
  tx: Transaction | null
  categories: Category[]
  defaultCurrency: Currency
  defaultSheetId: string | null
  onSave: (saved: Transaction) => void
  onCancel: () => void
  autoFocus?: boolean
}

function EditableRow({ tx, categories, defaultCurrency, defaultSheetId, onSave, onCancel, autoFocus }: EditableRowProps) {
  const supabase = createClient()
  const [type, setType] = useState<TransactionType>(tx?.type ?? 'expense')
  const [date, setDate] = useState(tx?.date ?? todayISO())
  const [note, setNote] = useState(tx?.note ?? '')
  const [categoryId, setCategoryId] = useState(tx?.category_id ?? '')
  const [amount, setAmount] = useState(tx ? formatMoneyInput(tx.amount) : '')
  const [curr, setCurr] = useState<Currency>(tx?.currency ?? defaultCurrency)
  const [saving, setSaving] = useState(false)

  const noteRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && noteRef.current) {
      noteRef.current.focus()
    }
  }, [autoFocus])

  const filteredCategories = categories.filter((c) => c.type === type)

  function cycleType() {
    const idx = TYPE_ORDER.indexOf(type)
    setType(TYPE_ORDER[(idx + 1) % TYPE_ORDER.length])
    setCategoryId('')
  }

  async function handleSave() {
    const parsedAmount = parseMoneyInput(amount)
    if (!parsedAmount || parsedAmount <= 0) return
    setSaving(true)
    try {
      if (tx) {
        // Update existing
        const { updateTransaction } = await import('@/app/(app)/transactions/actions')
        const { data, error } = await updateTransaction({
          id: tx.id,
          type,
          date,
          note: note.trim() || null,
          category_id: categoryId || null,
          amount: parsedAmount,
          currency: curr,
          status: tx.status,
        })
        if (!error && data) onSave(data)
      } else {
        // Insert new
        const { createTransaction } = await import('@/app/(app)/transactions/actions')
        const { data, error } = await createTransaction({
          sheet_id: defaultSheetId,
          type,
          date,
          note: note.trim() || null,
          category_id: categoryId || null,
          amount: parsedAmount,
          currency: curr,
          status: 'confirmed',
        })
        if (!error && data) onSave(data)
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const cfg = TYPE_CFG[type]

  return (
    <div
      className="flex items-center px-4 py-2 border-b border-border/60 bg-primary/[0.03] border-l-2 border-l-primary gap-1"
      onKeyDown={handleKeyDown}
    >
      {/* Date */}
      <div className="w-[80px] shrink-0 pr-1">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent text-[12px] font-mono text-foreground border border-border/60 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      {/* Type — click to cycle */}
      <button
        type="button"
        onClick={cycleType}
        className={cn(
          'w-[90px] shrink-0 flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12px] font-medium transition-colors hover:bg-muted/50',
          cfg.color,
        )}
        title="Clic para cambiar tipo"
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
        {cfg.label}
      </button>

      {/* Note / description */}
      <div className="flex-1 pr-1">
        <input
          ref={noteRef}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Descripción…"
          className="w-full bg-transparent text-[13px] text-foreground border border-border/60 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Category */}
      <div className="w-[120px] shrink-0 hidden md:block pr-1">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full bg-transparent text-[12px] text-muted-foreground border border-border/60 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="">Sin categoría</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div className="w-[120px] shrink-0 pr-1">
        <input
          ref={amountRef}
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(liveFormatMoney(e.target.value))}
          placeholder="0"
          className="w-full bg-transparent text-[13px] font-mono font-semibold text-right text-foreground border border-border/60 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40 tabular-nums"
        />
      </div>

      {/* Currency toggle */}
      <div className="w-[60px] shrink-0 flex justify-center">
        <button
          type="button"
          onClick={() => setCurr((c) => (c === 'ARS' ? 'USD' : 'ARS'))}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-md hover:bg-muted transition-colors"
        >
          {curr}
        </button>
      </div>

      {/* Actions */}
      <div className="w-[56px] shrink-0 flex items-center gap-1 justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !amount}
          className="text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-40 px-1.5 py-0.5 rounded-md hover:bg-primary/10 transition-colors"
        >
          {saving ? '…' : '✓'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}


// ─── Cell Details Popover ───────────────────────────────────────────────────

function CellDetailsPopoverContent({
  day,
  catId,
  currentMonth,
  userId,
  activeSheetId,
  existing,
  onTxsChange,
  closePopover
}: {
  day: number,
  catId: string,
  currentMonth: string,
  userId: string,
  activeSheetId: string | null,
  existing: Transaction[],
  onTxsChange: (updater: (prev: Transaction[]) => Transaction[]) => void,
  closePopover: () => void
}) {
  const supabase = createClient()
  const [subAmount, setSubAmount] = useState('')
  const [subNote, setSubNote] = useState('')
  const [saving, setSaving] = useState(false)
  const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`

  // Use a local ref for autoFocus on the amount input after rendering
  const amountRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // slight delay to ensure popover transition is mostly done
    const t = setTimeout(() => {
      amountRef.current?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [])

  async function addSub() {
    const amount = parseMoneyInput(subAmount)
    if (!amount || amount <= 0) return
    setSaving(true)
    const { createTransaction } = await import('@/app/(app)/transactions/actions')
    const { data } = await createTransaction({
      sheet_id: activeSheetId,
      type: 'expense',
      date: dateStr,
      category_id: catId,
      amount,
      currency: 'ARS',
      status: 'confirmed',
      note: subNote.trim() || null,
    })
    setSaving(false)
    if (data) {
      onTxsChange((prev) => [...prev, data])
      setSubAmount('')
      setSubNote('')
      amountRef.current?.focus()
    }
  }

  async function deleteSub(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
    toast.success('Movimiento eliminado')
    onTxsChange((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="flex flex-col gap-2 text-[12px]">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-1">
        <span className="font-semibold text-foreground">Detalle del día {day}</span>
        <button onClick={(e) => { e.stopPropagation(); closePopover() }} className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
      </div>

      {existing.length > 0 && (
        <>
          <div className="flex flex-col gap-0.5 max-h-[150px] overflow-y-auto overflow-x-hidden">
            {existing.map(tx => (
              <div key={tx.id} className="flex items-center gap-2 group/tx hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
                <span className="flex-1 min-w-0 truncate text-muted-foreground text-[12px]">{tx.note ?? <span className="italic opacity-50">sin detalle</span>}</span>
                <span className="font-mono font-semibold tabular-nums text-rose-500 text-[12px] shrink-0">−{tx.amount.toLocaleString('es-AR')}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteSub(tx.id) }} className="text-muted-foreground hover:text-rose-500 transition-colors shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-2 py-1 bg-muted/40 rounded-lg font-semibold">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Total</span>
            <span className="font-mono text-rose-500 text-[13px]">−{existing.reduce((s,t)=>s+t.amount,0).toLocaleString('es-AR')}</span>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Agregar gasto</span>
        <input
          ref={amountRef}
          type="text"
          inputMode="decimal"
          value={subAmount}
          onChange={(e) => setSubAmount(liveFormatMoney(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter') addSub() }}
          placeholder="Monto"
          className="w-full bg-background font-mono font-semibold border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 text-[13px] tabular-nums"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={subNote}
            onChange={(e) => setSubNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addSub() }}
            placeholder="Descripción (opcional)"
            className="flex-1 min-w-0 bg-background text-foreground border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 text-[12px]"
          />
          <button onClick={addSub} disabled={saving || !subAmount} className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold rounded-lg px-3 py-2 disabled:opacity-40 shrink-0 text-[12px]">
            {saving ? '…' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Grid View ───────────────────────────────────────────────────────────────

interface GridViewProps {
  transactions: Transaction[]
  categories: Category[]
  currentMonth: string
  userId: string
  activeSheetId: string | null
  onTxsChange: (updater: (prev: Transaction[]) => Transaction[]) => void
}

function GridView({ transactions, categories, currentMonth, userId, activeSheetId, onTxsChange }: GridViewProps) {
  const supabase = createClient()
  const [editCell, setEditCell] = useState<{ day: number; catId: string } | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [inlineEditing, setInlineEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // Selection: rectangle defined by anchor + end (in catIdx space)
  const [selAnchor, setSelAnchor] = useState<{ day: number; catIdx: number } | null>(null)
  const [selEnd, setSelEnd] = useState<{ day: number; catIdx: number } | null>(null)
  const [sheetCols, setSheetCols] = useState<string[] | null>(null)
  const [showAddCol, setShowAddCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [creatingCol, setCreatingCol] = useState(false)
  const [extraCats, setExtraCats] = useState<Category[]>([])
  const [showIncome, setShowIncome] = useState(false)
  const [addingIncome, setAddingIncome] = useState(false)
  const [incomeDate, setIncomeDate] = useState(todayISO())
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeCurr, setIncomeCurr] = useState<Currency>('ARS')
  const [incomeNote, setIncomeNote] = useState('')
  const [savingIncome, setSavingIncome] = useState(false)

  const [y, m] = currentMonth.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const today = new Date()
  const todayDay = today.getFullYear() === y && today.getMonth() === m - 1 ? today.getDate() : null

  const allExpenseCats = useMemo(
    () => [...categories.filter((c) => c.type === 'expense'), ...extraCats],
    [categories, extraCats]
  )
  const isCustomSheet = activeSheetId !== null
  const storageKey = activeSheetId ? `mfi_cols_${activeSheetId}` : 'mfi_cols_general'

  // Load column config for sheets from localStorage
  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setSheetCols(JSON.parse(saved))
    } else if (activeSheetId === null) {
      setSheetCols(null) // general sheet explicitly falls back to ALL cats when it has no saved config yet
    } else {
      setSheetCols([])
    }
  }, [storageKey, activeSheetId])

  // Close add-col dropdown on outside click
  useEffect(() => {
    if (!showAddCol) return
    const handler = () => setShowAddCol(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showAddCol])

  function persistCols(cols: string[]) {
    setSheetCols(cols)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(cols))
  }

  async function handleCreateColumn() {
    if (!newColName.trim() || creatingCol) return
    setCreatingCol(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: newColName.trim(), type: 'expense', color: '#94a3b8', icon: 'tag' })
      .select()
      .single()
    setCreatingCol(false)
    if (error) { toast.error('No se pudo crear. Intentá de nuevo.', { duration: 5000 }); return }
    if (data) {
      toast.success('Categoría creada')
      setExtraCats((prev) => [...prev, data as Category])
      persistCols([data.id, ...(sheetCols ?? [])])
      setNewColName('')
      setShowAddCol(false)
    }
  }

  // Which categories are active in this view
  const activeCats = useMemo(() => {
    if (sheetCols === null) return allExpenseCats
    return sheetCols.map((id) => allExpenseCats.find((c) => c.id === id)).filter(Boolean) as Category[]
  }, [sheetCols, allExpenseCats])

  const remainingCats = useMemo(() =>
    sheetCols !== null ? allExpenseCats.filter((c) => !sheetCols.includes(c.id)) : []
  , [sheetCols, allExpenseCats])

  // Renombrar categoría
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null)
  const [renameCatValue, setRenameCatValue] = useState('')

  async function handleRenameCategory(catId: string, name: string) {
    if (!name.trim() || !savingIncome) { /* using savingIncome randomly wasn't needed, but I'll skip it */ }
    if (!name.trim()) { setRenamingCatId(null); return }
    const { error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', catId)
    if (error) { toast.error('No se pudo actualizar. Intentá de nuevo.', { duration: 5000 }); setRenamingCatId(null); return }
    toast.success('Categoría actualizada')
    setExtraCats((prev) => {
      const exists = prev.find(p => p.id === catId)
      if (exists) return prev.map(c => c.id === catId ? { ...c, name: name.trim() } : c)
      // Since 'categories' are from props, we just refresh the page entirely for simplicity 
      // when a prop-level category is renamed, or we can mutate via window location reload
      return prev
    })
    setRenamingCatId(null)
    window.location.reload()
  }

  // ARS-only lookup (grid never shows/creates USD)
  const lookup = useMemo(() => {
    const map: Record<string, Transaction[]> = {}
    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.currency !== 'ARS') continue
      const day = new Date(tx.date + 'T00:00:00').getDate()
      const key = `${day}-${tx.category_id}`
      if (!map[key]) map[key] = []
      map[key].push(tx)
    }
    return map
  }, [transactions])

  function isInSelection(day: number, catIdx: number): boolean {
    if (!selAnchor || !selEnd) return false
    const minDay = Math.min(selAnchor.day, selEnd.day)
    const maxDay = Math.max(selAnchor.day, selEnd.day)
    const minCat = Math.min(selAnchor.catIdx, selEnd.catIdx)
    const maxCat = Math.max(selAnchor.catIdx, selEnd.catIdx)
    return day >= minDay && day <= maxDay && catIdx >= minCat && catIdx <= maxCat
  }

  const selectionInfo = useMemo(() => {
    if (!selAnchor || !selEnd) return null
    const minDay = Math.min(selAnchor.day, selEnd.day)
    const maxDay = Math.max(selAnchor.day, selEnd.day)
    const minCat = Math.min(selAnchor.catIdx, selEnd.catIdx)
    const maxCat = Math.max(selAnchor.catIdx, selEnd.catIdx)
    let sum = 0, count = 0
    for (let d = minDay; d <= maxDay; d++) {
      for (let ci = minCat; ci <= maxCat; ci++) {
        const total = (lookup[`${d}-${activeCats[ci]?.id}`] ?? []).reduce((s: number, t: Transaction) => s + t.amount, 0)
        if (total > 0) { sum += total; count++ }
      }
    }
    return { sum, count, cells: (maxDay - minDay + 1) * (maxCat - minCat + 1) }
  }, [selAnchor, selEnd, lookup, activeCats])

  function clearSelection() { setSelAnchor(null); setSelEnd(null) }

  function getCellTotal(day: number, catId: string): number {
    return (lookup[`${day}-${catId}`] ?? []).reduce((s: number, t: Transaction) => s + t.amount, 0)
  }

  function openCell(day: number, catId: string, openPop = false) {
    setInlineEditing(false)
    setEditValue('')
    setEditCell({ day, catId })
    if (openPop) setPopoverOpen(true)
  }

  function startInlineEdit(day: number, catId: string, initialChar?: string) {
    const total = getCellTotal(day, catId)
    setEditCell({ day, catId })
    setPopoverOpen(false)
    setInlineEditing(true)
    setEditValue(initialChar ?? (total > 0 ? formatMoneyInput(total) : ''))
    setTimeout(() => { inputRef.current?.focus(); if (!initialChar) inputRef.current?.select() }, 0)
  }

  async function commitInline(day: number, catId: string) {
    setInlineEditing(false)
    const amount = parseMoneyInput(editValue)
    const existing = lookup[`${day}-${catId}`] ?? []
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`
    if (!amount || amount <= 0) {
      if (existing.length > 0) {
        const ids = existing.map((t) => t.id)
        const { error } = await supabase.from('transactions').delete().in('id', ids)
        if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
        toast.success(ids.length > 1 ? 'Movimientos eliminados' : 'Movimiento eliminado')
        onTxsChange((prev) => prev.filter((t) => !ids.includes(t.id)))
      }
      return
    }
    // Replace all existing with a single transaction
    if (existing.length > 0) {
      const [first, ...rest] = existing
      if (rest.length > 0) {
        const restIds = rest.map((t) => t.id)
        await supabase.from('transactions').delete().in('id', restIds)
        onTxsChange((prev) => prev.filter((t) => !restIds.includes(t.id)))
      }
      const { updateTransactionAmount } = await import('@/app/(app)/transactions/actions')
      const { data } = await updateTransactionAmount(first.id, amount, first.note)
      if (data) onTxsChange((prev) => prev.map((t) => t.id === data.id ? data : t))
    } else {
      const { createTransaction } = await import('@/app/(app)/transactions/actions')
      const { data } = await createTransaction({
        sheet_id: activeSheetId, type: 'expense', date: dateStr,
        category_id: catId, amount, currency: 'ARS', status: 'confirmed', note: null,
      })
      if (data) onTxsChange((prev) => [...prev, data])
    }
  }



  // Start navigation from (1, 0) when no cell is focused and an arrow key is pressed
  useEffect(() => {
    if (activeCats.length === 0) return
    const handler = (e: KeyboardEvent) => {
      if (editCell) return
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.preventDefault()
      openCell(1, activeCats[0].id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editCell, activeCats])

  async function saveCell(day: number, catId: string, rawValue: string) {
    setEditCell(null)
    const amount = parseMoneyInput(rawValue)
    const existing = lookup[`${day}-${catId}`] ?? []
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`

    if (!amount || amount <= 0) {
      if (existing.length > 0) {
        const ids = existing.map((t) => t.id)
        const { error } = await supabase.from('transactions').delete().in('id', ids)
        if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
        toast.success(ids.length > 1 ? 'Movimientos eliminados' : 'Movimiento eliminado')
        onTxsChange((prev) => prev.filter((t) => !ids.includes(t.id)))
      }
      return
    }

    if (existing.length >= 1) {
      const [first, ...rest] = existing
      if (rest.length > 0) {
        const restIds = rest.map((t) => t.id)
        await supabase.from('transactions').delete().in('id', restIds)
        onTxsChange((prev) => prev.filter((t) => !restIds.includes(t.id)))
      }
      const { updateTransactionAmount } = await import('@/app/(app)/transactions/actions')
      const { data } = await updateTransactionAmount(first.id, amount, first.note)
      if (data) onTxsChange((prev) => prev.map((t) => t.id === data.id ? data : t))
    } else {
      const { createTransaction } = await import('@/app/(app)/transactions/actions')
      const { data } = await createTransaction({
        sheet_id: activeSheetId, type: 'expense', date: dateStr,
        category_id: catId, amount, currency: 'ARS', status: 'confirmed', note: null,
      })
      if (data) onTxsChange((prev) => [...prev, data])
    }
  }

  function navigate(day: number, catId: string, nextDay: number, nextCatId: string) {
    // No longer saving dynamically inline unless they interacted with popover.
    // So just move focus.
    setPopoverOpen(false)
    openCell(nextDay, nextCatId)
  }

  async function deleteSelection() {
    if (!selAnchor || !selEnd) return
    const minDay = Math.min(selAnchor.day, selEnd.day)
    const maxDay = Math.max(selAnchor.day, selEnd.day)
    const minCat = Math.min(selAnchor.catIdx, selEnd.catIdx)
    const maxCat = Math.max(selAnchor.catIdx, selEnd.catIdx)
    const ids: string[] = []
    for (let d = minDay; d <= maxDay; d++) {
      for (let ci = minCat; ci <= maxCat; ci++) {
        const txs = lookup[`${d}-${activeCats[ci]?.id}`] ?? []
        txs.forEach((t) => ids.push(t.id))
      }
    }
    if (ids.length === 0) return
    const { error } = await supabase.from('transactions').delete().in('id', ids)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
    toast.success(ids.length > 1 ? 'Movimientos eliminados' : 'Movimiento eliminado')
    onTxsChange((prev) => prev.filter((t) => !ids.includes(t.id)))
    clearSelection()
  }

  // Bind global grid keydown
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Popover open: only Escape
      if (popoverOpen) {
        if (e.key === 'Escape') { e.preventDefault(); setPopoverOpen(false) }
        return
      }
      // Inline editing
      if (inlineEditing && editCell) {
        if (e.key === 'Escape') { e.preventDefault(); setInlineEditing(false); setEditValue(''); return }
        if (e.key === 'Enter') { e.preventDefault(); commitInline(editCell.day, editCell.catId); return }
        if (e.key === 'ArrowDown') {
          e.preventDefault(); commitInline(editCell.day, editCell.catId)
          if (editCell.day < daysInMonth) { setInlineEditing(false); setEditValue(''); setEditCell({ day: editCell.day + 1, catId: editCell.catId }) }
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault(); commitInline(editCell.day, editCell.catId)
          if (editCell.day > 1) { setInlineEditing(false); setEditValue(''); setEditCell({ day: editCell.day - 1, catId: editCell.catId }) }
          return
        }
        return
      }
      // No focused cell
      if (!editCell) {
        if (selAnchor && selEnd) {
          if (e.key === 'Escape') { e.preventDefault(); clearSelection(); return }
          if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return }
          if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault()
            if (selectionInfo) navigator.clipboard.writeText(selectionInfo.sum.toLocaleString('es-AR'))
            return
          }
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && activeCats.length > 0) {
          e.preventDefault(); openCell(1, activeCats[0].id)
        }
        return
      }
      const { day, catId } = editCell
      const catIdx = activeCats.findIndex((c) => c.id === catId)
      // Escape: clear selection first, then unfocus
      if (e.key === 'Escape') {
        e.preventDefault()
        if (selAnchor) { clearSelection() } else { setEditCell(null) }
        return
      }
      // Ctrl+C: copy sum of selection or current cell
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        const val = selectionInfo ? selectionInfo.sum : getCellTotal(day, catId)
        navigator.clipboard.writeText(val.toLocaleString('es-AR'))
        return
      }
      // Delete: clear selection or current cell
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (selAnchor && selEnd) { deleteSelection(); return }
        const existing = lookup[`${day}-${catId}`] ?? []
        if (existing.length > 0) {
          const ids = existing.map((t) => t.id)
          supabase.from('transactions').delete().in('id', ids).then(({ error }) => {
            if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
            toast.success(ids.length > 1 ? 'Movimientos eliminados' : 'Movimiento eliminado')
            onTxsChange((prev) => prev.filter((t) => !ids.includes(t.id)))
          })
        }
        return
      }
      // Shift+arrows: extend selection
      if (e.shiftKey && ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault()
        const anchor = selAnchor ?? { day, catIdx }
        const end = selEnd ?? { day, catIdx }
        if (!selAnchor) setSelAnchor(anchor)
        if (e.key === 'ArrowDown') setSelEnd({ day: Math.min(end.day + 1, daysInMonth), catIdx: end.catIdx })
        if (e.key === 'ArrowUp') setSelEnd({ day: Math.max(end.day - 1, 1), catIdx: end.catIdx })
        if (e.key === 'ArrowRight') setSelEnd({ day: end.day, catIdx: Math.min(end.catIdx + 1, activeCats.length - 1) })
        if (e.key === 'ArrowLeft') setSelEnd({ day: end.day, catIdx: Math.max(end.catIdx - 1, 0) })
        return
      }
      if (e.key === 'Enter') { e.preventDefault(); setPopoverOpen(true); return }
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); clearSelection(); startInlineEdit(day, catId, e.key); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); clearSelection(); if (day < daysInMonth) navigate(day, catId, day + 1, catId); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); clearSelection(); if (day > 1) navigate(day, catId, day - 1, catId); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); clearSelection(); if (catIdx < activeCats.length - 1) navigate(day, catId, day, activeCats[catIdx + 1].id); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); clearSelection(); if (catIdx > 0) navigate(day, catId, day, activeCats[catIdx - 1].id); return }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault(); clearSelection()
        if (catIdx < activeCats.length - 1) navigate(day, catId, day, activeCats[catIdx + 1].id)
        else if (day < daysInMonth) navigate(day, catId, day + 1, activeCats[0].id); return
      }
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault(); clearSelection()
        if (catIdx > 0) navigate(day, catId, day, activeCats[catIdx - 1].id)
        else if (day > 1) navigate(day, catId, day - 1, activeCats[activeCats.length - 1].id); return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editCell, popoverOpen, inlineEditing, activeCats, daysInMonth, editValue, selAnchor, selEnd, selectionInfo])


  const colTotals = activeCats.map((cat) =>
    Array.from({ length: daysInMonth }, (_, i) => getCellTotal(i + 1, cat.id)).reduce((a: number, b: number) => a + b, 0)
  )
  const grandTotal = colTotals.reduce((a: number, b: number) => a + b, 0)

  const incomeTxs = useMemo(() =>
    transactions.filter((t) => t.type === 'income').sort((a, b) => a.date.localeCompare(b.date)),
    [transactions]
  )
  const incomeTotalARS = incomeTxs.filter((t) => t.currency === 'ARS' && t.status !== 'cancelled').reduce((s, t) => s + t.amount, 0)
  const incomeTotalUSD = incomeTxs.filter((t) => t.currency === 'USD' && t.status !== 'cancelled').reduce((s, t) => s + t.amount, 0)

  async function saveIncome() {
    const amount = parseMoneyInput(incomeAmount)
    if (!amount || amount <= 0) return
    setSavingIncome(true)
    const { createTransaction } = await import('@/app/(app)/transactions/actions')
    const { data } = await createTransaction({
      sheet_id: activeSheetId,
      type: 'income',
      category_id: null,
      date: incomeDate,
      note: incomeNote.trim() || null,
      amount,
      currency: incomeCurr,
      status: 'confirmed',
    })
    setSavingIncome(false)
    if (data) {
      onTxsChange((prev) => [data, ...prev])
      setIncomeAmount('')
      setIncomeNote('')
      setAddingIncome(false)
    }
  }

  async function deleteIncomeTx(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
    toast.success('Movimiento eliminado')
    onTxsChange((prev) => prev.filter((t) => t.id !== id))
  }

  // Empty state: custom sheet with no columns yet
  if (sheetCols !== null && sheetCols.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card flex flex-col items-center gap-4 py-10 text-center px-6">
        <p className="text-[13px] font-semibold text-foreground">Esta planilla no tiene columnas</p>
        <p className="text-[12px] text-muted-foreground">Elegí qué categorías querés registrar acá:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {allExpenseCats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => persistCols([cat.id])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-[12px] font-medium hover:bg-muted transition-colors"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? '#94a3b8' }} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (sheetCols === null && allExpenseCats.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-[13px] font-semibold text-foreground">Sin categorías de gasto</p>
        <p className="text-[12px] text-muted-foreground">Creá categorías de tipo "Gasto" para usar la vista planilla.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">

      {/* ── Ingresos ───────────────────────────────────────────── */}
      <div className="border-b border-border/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <button
            onClick={() => setShowIncome((v) => !v)}
            className="flex items-center gap-2.5 flex-1 text-left min-w-0"
          >
            <ChevronDown className={cn('w-3.5 h-3.5 text-emerald-500 shrink-0 transition-transform duration-200', showIncome ? '' : '-rotate-90')} />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest shrink-0">Ingresos</span>
            {incomeTotalARS > 0 && (
              <span className="font-mono text-[12px] font-semibold text-foreground tabular-nums">
                +{formatCurrency(incomeTotalARS, 'ARS')}
              </span>
            )}
            {incomeTotalUSD > 0 && (
              <span className="font-mono text-[12px] font-semibold text-foreground tabular-nums">
                +{formatCurrency(incomeTotalUSD, 'USD')}
              </span>
            )}
            {incomeTotalARS === 0 && incomeTotalUSD === 0 && (
              <span className="text-[11px] text-muted-foreground">Sin ingresos este mes</span>
            )}
          </button>
          <button
            onClick={() => { setShowIncome(true); setAddingIncome(true) }}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>

        {showIncome && (
          <div className="px-3 pb-2 flex flex-col gap-0.5">
            {incomeTxs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-2 py-1 group/inc text-[12px]">
                <span className="font-mono text-[11px] text-muted-foreground w-10 shrink-0">{formatShortDate(tx.date)}</span>
                <span className="flex-1 text-muted-foreground/70 truncate text-[11px]">{tx.note ?? tx.category?.name ?? '—'}</span>
                <span className="font-mono font-semibold text-emerald-500 tabular-nums shrink-0">
                  +{formatCurrency(tx.amount, tx.currency)}
                </span>
                <button
                  onClick={() => deleteIncomeTx(tx.id)}
                  className="opacity-0 group-hover/inc:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 p-0.5 rounded shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {addingIncome ? (
              <div className="flex items-center gap-1.5 py-1 border-t border-border/40 mt-1">
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="bg-transparent text-[11px] font-mono text-muted-foreground border border-border/60 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 w-[110px] shrink-0"
                />
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(liveFormatMoney(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveIncome()
                    if (e.key === 'Escape') { setAddingIncome(false); setIncomeAmount('') }
                  }}
                  placeholder="Monto"
                  className="flex-1 bg-transparent text-right font-mono text-[12px] font-semibold text-foreground border border-border/60 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 tabular-nums min-w-0"
                />
                <button
                  onClick={() => setIncomeCurr((c) => (c === 'ARS' ? 'USD' : 'ARS'))}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-1.5 py-0.5 shrink-0 transition-colors"
                >
                  {incomeCurr}
                </button>
                <input
                  type="text"
                  value={incomeNote}
                  onChange={(e) => setIncomeNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveIncome() }}
                  placeholder="Descripción…"
                  className="w-[120px] bg-transparent text-[12px] text-foreground border border-border/60 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-muted-foreground/40 hidden sm:block shrink-0"
                />
                <button
                  onClick={saveIncome}
                  disabled={savingIncome || !incomeAmount}
                  className="text-emerald-500 font-bold text-[12px] disabled:opacity-40 shrink-0"
                >
                  {savingIncome ? '…' : '✓'}
                </button>
                <button
                  onClick={() => { setAddingIncome(false); setIncomeAmount('') }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingIncome(true)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-emerald-500 transition-colors py-1 mt-0.5"
              >
                <Plus className="w-3 h-3" /> Agregar ingreso
              </button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
      <table className="min-w-full text-[12px] border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-2 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-8 sticky left-0 z-[2] bg-muted/30 border-r border-border/60 select-none">
              Día
            </th>
            {activeCats.map((cat) => (
              <th key={cat.id} className="px-2 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                {renamingCatId === cat.id ? (
                  <input
                    autoFocus
                    value={renameCatValue}
                    onChange={(e) => setRenameCatValue(e.target.value)}
                    onBlur={() => handleRenameCategory(cat.id, renameCatValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCategory(cat.id, renameCatValue)
                      if (e.key === 'Escape') setRenamingCatId(null)
                    }}
                    className="h-6 text-[10px] font-bold text-foreground bg-background border border-primary/50 rounded px-1.5 w-[80px] focus:outline-none focus:ring-1 focus:ring-primary/40 text-right"
                  />
                ) : (
                  <span 
                    className="group/col inline-flex items-center justify-end gap-1 min-w-0 max-w-full cursor-text"
                    onDoubleClick={() => { setRenamingCatId(cat.id); setRenameCatValue(cat.name) }}
                    title="Doble clic para cambiar nombre"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); persistCols((sheetCols ?? allExpenseCats.map(c=>c.id)).filter((id) => id !== cat.id)) }}
                      className="opacity-0 group-hover/col:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-rose-500"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? '#94a3b8' }} />
                    <span className="truncate select-none">{cat.name}</span>
                  </span>
                )}
              </th>
            ))}
            {true && (
              <th className="px-2 py-2.5 w-10 relative">
                <div className="relative flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAddCol((v) => !v) }}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-[10px] font-semibold whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">Columna</span>
                  </button>
                  {showAddCol && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[180px]"
                    >
                      {/* Nueva columna custom */}
                      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/60">
                        <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                        <input
                          autoFocus
                          type="text"
                          value={newColName}
                          onChange={(e) => setNewColName(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') handleCreateColumn()
                            if (e.key === 'Escape') setShowAddCol(false)
                          }}
                          placeholder="Nueva columna…"
                          className="flex-1 bg-transparent text-[12px] focus:outline-none placeholder:text-muted-foreground/50 min-w-0"
                        />
                        {newColName.trim() && (
                          <button
                            onClick={handleCreateColumn}
                            disabled={creatingCol}
                            className="text-primary text-[11px] font-bold disabled:opacity-40 shrink-0"
                          >
                            {creatingCol ? '…' : '✓'}
                          </button>
                        )}
                      </div>
                      {/* Categorías existentes */}
                      {remainingCats.length > 0 && (
                        <div className="p-1">
                          {remainingCats.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => { persistCols([cat.id, ...(sheetCols ?? [])]); setShowAddCol(false) }}
                              className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] hover:bg-muted transition-colors"
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? '#94a3b8' }} />
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </th>
            )}
            <th className="px-2 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right border-l border-border/60 w-20 sticky right-0 z-[2] bg-muted/30">
              Totales
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const rowTotal = activeCats.reduce((s, cat) => s + getCellTotal(day, cat.id), 0)
            const isToday = day === todayDay
            return (
              <tr key={day} className={cn('border-b border-border/40 last:border-0', isToday ? 'bg-primary/5' : 'hover:bg-muted/10')}>
                <td className={cn('px-2 py-1 font-mono font-bold text-[11px] sticky left-0 z-[1] border-r border-border/60 select-none w-8', isToday ? 'text-primary bg-primary/5' : 'text-muted-foreground bg-card')}>
                  {day}
                </td>
                {activeCats.map((cat, catIdx) => {
                  const isFocused = editCell?.day === day && editCell?.catId === cat.id
                  const isInline = isFocused && inlineEditing
                  const isPopActive = isFocused && popoverOpen
                  const isSelected = isInSelection(day, catIdx)
                  const total = getCellTotal(day, cat.id)
                  const existing = lookup[`${day}-${cat.id}`] ?? []

                  return (
                    <td
                      key={cat.id}
                      className={cn('py-0.5 text-right text-[11px] font-mono tabular-nums relative transition-all duration-75 group/cell',
                        isInline ? 'bg-primary/10 outline outline-1 -outline-offset-1 outline-primary/70' :
                        isPopActive ? 'bg-primary/10 outline outline-1 -outline-offset-1 outline-primary/70' :
                        isSelected ? 'bg-blue-500/15 outline outline-1 -outline-offset-1 outline-blue-500/40' :
                        isFocused ? 'bg-primary/5 outline outline-1 -outline-offset-1 outline-primary/40' :
                        'cursor-pointer hover:bg-muted/40'
                      )}
                      onClick={(e) => {
                        if (e.shiftKey && editCell) {
                          const anchorCatIdx = activeCats.findIndex((c) => c.id === editCell.catId)
                          setSelAnchor({ day: editCell.day, catIdx: anchorCatIdx })
                          setSelEnd({ day, catIdx })
                        } else {
                          clearSelection()
                          if (!isFocused) openCell(day, cat.id)
                        }
                      }}
                      onDoubleClick={() => { clearSelection(); setInlineEditing(false); setEditValue(''); openCell(day, cat.id, true) }}
                    >
                      <Popover open={isPopActive}>
                        <PopoverAnchor className="absolute inset-0 pointer-events-none" />
                        <PopoverContent align="center" side="right" sideOffset={8} className="p-3 shadow-xl pointer-events-auto w-72" onInteractOutside={() => setPopoverOpen(false)}>
                          <CellDetailsPopoverContent
                            day={day} catId={cat.id} currentMonth={currentMonth} userId={userId} activeSheetId={activeSheetId}
                            existing={existing} onTxsChange={onTxsChange} closePopover={() => { setPopoverOpen(false); setEditCell(null) }}
                          />
                        </PopoverContent>
                      </Popover>

                      <span className={cn('absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-transparent', total > 0 ? 'border-r-emerald-500/70' : 'border-r-muted-foreground/20')} />
                      {isInline ? (
                        <input
                          ref={inputRef}
                          type="text"
                          inputMode="decimal"
                          value={editValue}
                          onChange={(e) => setEditValue(liveFormatMoney(e.target.value))}
                          onBlur={() => commitInline(day, cat.id)}
                          className="w-full bg-transparent text-right font-mono font-semibold text-foreground focus:outline-none tabular-nums text-[12px] px-2 py-0.5"
                        />
                      ) : total > 0 ? (
                        <span className="px-2">{total.toLocaleString('es-AR')}</span>
                      ) : null}
                    </td>
                  )
                })}
                {true && <td />}
                <td className={cn('px-2 py-1 text-right font-mono tabular-nums font-semibold border-l border-border/60 text-[11px] w-20 sticky right-0 z-[1]', isToday ? 'bg-primary/5' : 'bg-card', rowTotal > 0 ? 'text-rose-500' : 'text-transparent select-none')}>
                  {rowTotal > 0 ? rowTotal.toLocaleString('es-AR') : '0'}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/40">
            <td className="px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky left-0 z-[1] bg-muted/40 border-r border-border/60 select-none w-8">
              Total
            </td>
            {activeCats.map((cat, i) => (
              <td key={cat.id} className="px-2 py-2 text-right font-mono tabular-nums text-[11px] font-bold text-rose-500">
                {colTotals[i] > 0 ? colTotals[i].toLocaleString('es-AR') : '—'}
              </td>
            ))}
            {true && <td />}
            <td className="px-2 py-2 text-right font-mono tabular-nums text-[11px] font-bold text-rose-500 border-l border-border/60 w-20 sticky right-0 z-[1] bg-muted/40">
              {grandTotal > 0 ? grandTotal.toLocaleString('es-AR') : '—'}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {selectionInfo && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/60 border-t border-border text-[11px] text-muted-foreground">
          <span>{selectionInfo.cells} {selectionInfo.cells === 1 ? 'celda' : 'celdas'} seleccionadas</span>
          {selectionInfo.count > 0 && (
            <>
              <span className="text-border">|</span>
              <span>Suma: <span className="font-mono font-semibold text-foreground">{selectionInfo.sum.toLocaleString('es-AR')}</span></span>
            </>
          )}
          <span className="text-border">|</span>
          <span className="text-[10px]">Ctrl+C copiar · Delete borrar · Esc cancelar</span>
        </div>
      )}
    </div>
  )
}

// ─── Month Navigator ─────────────────────────────────────────────────────────

function MonthNavigator({ currentMonth, isPending, onNavigate }: { currentMonth: string; isPending: boolean; onNavigate: (ym: string) => void }) {
  const { label, isCurrentMonth } = formatMonthLabel(currentMonth)
  const now = new Date()
  const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isNow = currentMonth === nowYM

  function go(delta: number) {
    onNavigate(navigateMonth(currentMonth, delta))
  }

  return (
    <div className="flex items-center gap-0 bg-muted rounded-xl overflow-hidden border border-border h-8">
      <button
        onClick={() => go(-1)}
        disabled={isPending}
        className="h-8 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/60 transition-colors disabled:opacity-50"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onDoubleClick={() => onNavigate(nowYM)}
        className={cn(
          'h-8 px-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap',
          isNow ? 'text-primary' : 'text-foreground',
        )}
        title="Doble clic para volver al mes actual"
      >
        {isCurrentMonth ? 'Este mes' : label}
      </button>
      <button
        onClick={() => go(+1)}
        disabled={isNow || isPending}
        className="h-8 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/60 transition-colors disabled:opacity-25 disabled:pointer-events-none"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MFITransactionsClient({
  transactions: initialTransactions,
  categories,
  initialSheets,
  profile,
  currentMonth,
  userId,
}: Props) {
  const router = useRouter()
  const [isNavigating, startTransition] = useTransition()
  const supabase = createClient()
  const [txs, setTxs] = useState<Transaction[]>(initialTransactions)
  const [sheets, setSheets] = useState<MfiSheet[]>(initialSheets)
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null)
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [search, setSearch] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  // Sheet Creation / Edit State
  const [isCreatingSheet, setIsCreatingSheet] = useState(false)
  const [newSheetName, setNewSheetName] = useState('')
  const [savingSheet, setSavingSheet] = useState(false)
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingSheetId, setDeletingSheetId] = useState<string | null>(null)

  const defaultCurrency: Currency = (profile?.default_currency as Currency) ?? 'ARS'

  // Sync with new server data on month change
  useEffect(() => {
    setTxs(initialTransactions)
    setSheets(initialSheets)
    setEditingId(null)
    setIsAddingNew(false)
    setFocusedIndex(null)
  }, [initialTransactions, initialSheets])

  // Reset focus when filtering changes
  useEffect(() => {
    setFocusedIndex(null)
  }, [typeFilter, search, activeSheetId])

  // Transactions belonging strictly to the currently active sheet
  const sheetTransactions = txs.filter((t) => (t.sheet_id || null) === activeSheetId)

  // Filtered transactions for the view
  const filtered = sheetTransactions
    .filter((t) => typeFilter === 'all' || t.type === typeFilter)
    .filter(
      (t) =>
        !search ||
        t.note?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.name?.toLowerCase().includes(search.toLowerCase()),
    )

  // Keyboard navigation & shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (editingId || isAddingNew) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setFocusedIndex(-1)
        setIsAddingNew(true)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(prev => {
          if (prev === null) return 0
          if (prev >= filtered.length - 1) return -1 // -1 is "New Row"
          if (prev === -1) return -1
          return prev + 1
        })
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(prev => {
          if (prev === null) return -1
          if (prev === -1) return Math.max(0, filtered.length - 1)
          if (prev === 0) return 0
          return prev - 1
        })
      }

      if (e.key === 'Enter' && focusedIndex !== null) {
        e.preventDefault()
        if (focusedIndex === -1) {
          setIsAddingNew(true)
        } else if (focusedIndex >= 0 && focusedIndex < filtered.length) {
          setEditingId(filtered[focusedIndex].id)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingId, isAddingNew, filtered, focusedIndex])

  // Totals for footer based ONLY on the active sheet
  const totals = sheetTransactions.reduce(
    (acc, t) => {
      if (t.status === 'cancelled') return acc
      if (t.type === 'income') {
        if (t.currency === 'USD') acc.incomeUSD += t.amount
        else acc.incomeARS += t.amount
      }
      if (t.type === 'expense') {
        if (t.currency === 'USD') acc.expenseUSD += t.amount
        else acc.expenseARS += t.amount
      }
      return acc
    },
    { incomeARS: 0, incomeUSD: 0, expenseARS: 0, expenseUSD: 0 },
  )

  async function handleCreateSheet() {
    if (!newSheetName.trim()) return
    setSavingSheet(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('mfi_sheets')
      .insert({ user_id: user.id, name: newSheetName.trim() })
      .select()
      .single()

    if (error) { toast.error('No se pudo crear. Intentá de nuevo.', { duration: 5000 }); setSavingSheet(false); return }
    if (data) {
      toast.success('Hoja creada')
      setSheets([...sheets, data as MfiSheet])
      setActiveSheetId(data.id)
      setIsCreatingSheet(false)
      setNewSheetName('')
    }
    setSavingSheet(false)
  }

  async function handleRenameSheet(id: string, name: string) {
    if (!name.trim()) { setRenamingSheetId(null); return }
    const { error } = await supabase.from('mfi_sheets').update({ name: name.trim() }).eq('id', id)
    if (error) { toast.error('No se pudo renombrar. Intentá de nuevo.', { duration: 5000 }); setRenamingSheetId(null); return }
    toast.success('Hoja renombrada')
    setSheets((prev) => prev.map((s) => s.id === id ? { ...s, name: name.trim() } : s))
    setRenamingSheetId(null)
  }

  async function handleDeleteSheet(id: string) {
    // Move transactions to General (null sheet_id) before deleting
    const { error: moveError } = await supabase.from('transactions').update({ sheet_id: null }).eq('sheet_id', id)
    if (moveError) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
    const { error: deleteError } = await supabase.from('mfi_sheets').delete().eq('id', id)
    if (deleteError) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
    toast.success('Hoja eliminada')
    setSheets((prev) => prev.filter((s) => s.id !== id))
    setTxs((prev) => prev.map((t) => t.sheet_id === id ? { ...t, sheet_id: null } : t))
    if (activeSheetId === id) setActiveSheetId(null)
    setDeletingSheetId(null)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
    toast.success('Movimiento eliminado')
    setTxs((prev) => prev.filter((t) => t.id !== id))
    setEditingId(null)
  }

  function handleSaveEdit(saved: Transaction) {
    setTxs((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
    setEditingId(null)
  }

  function handleSaveNew(saved: Transaction) {
    setTxs((prev) => [saved, ...prev])
    setIsAddingNew(false)
  }

  return (
    <div className={cn('flex flex-col gap-4 w-full max-w-5xl mx-auto transition-opacity duration-200', isNavigating && 'opacity-40 pointer-events-none')}>
      {/* ── Page header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[22px] font-bold tracking-tight">Transacciones</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-xl border border-border overflow-hidden h-8">
            <button
              onClick={() => setViewMode('list')}
              className={cn('h-8 w-8 flex items-center justify-center transition-colors', viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              title="Vista lista"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('h-8 w-8 flex items-center justify-center transition-colors', viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              title="Vista planilla"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <MonthNavigator currentMonth={currentMonth} isPending={isNavigating} onNavigate={(ym) => {
            const now = new Date()
            const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            startTransition(() => {
              if (ym === nowYM) router.push('/mfi')
              else router.push(`/mfi?month=${ym}`)
            })
          }} />
        </div>
      </div>

      {/* ── MFI Tabs / Sheets ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0 -mb-1 scrollbar-none border-b border-border/50">
        <button
          onClick={() => setActiveSheetId(null)}
          className={cn(
            "px-4 py-2.5 text-[13px] font-semibold transition-all border-b-2 whitespace-nowrap",
            activeSheetId === null ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg"
          )}
        >
          General
        </button>
        {sheets.map(s => (
          <div key={s.id} className="relative group/tab flex items-center">
            {renamingSheetId === s.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSheet(s.id, renameValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSheet(s.id, renameValue)
                  if (e.key === 'Escape') setRenamingSheetId(null)
                }}
                className="h-7 text-[12px] font-semibold bg-background border border-primary/50 rounded px-2 w-[120px] focus:outline-none focus:ring-1 focus:ring-primary/40 mx-1"
              />
            ) : deletingSheetId === s.id ? (
              <div className="flex items-center gap-1.5 px-3 py-2 text-[12px]">
                <span className="text-muted-foreground">¿Eliminar <span className="font-semibold text-foreground">{s.name}</span>?</span>
                <button onClick={() => handleDeleteSheet(s.id)} className="text-rose-500 font-bold hover:text-rose-400 px-1">Sí</button>
                <button onClick={() => setDeletingSheetId(null)} className="text-muted-foreground hover:text-foreground px-1">No</button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setActiveSheetId(s.id)}
                  onDoubleClick={() => { setRenamingSheetId(s.id); setRenameValue(s.name) }}
                  title="Doble clic para renombrar"
                  className={cn(
                    "px-3 py-2.5 text-[13px] font-semibold transition-all border-b-2 whitespace-nowrap pr-1",
                    activeSheetId === s.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg"
                  )}
                >
                  {s.name}
                </button>
                <button
                  onClick={() => setDeletingSheetId(s.id)}
                  title="Eliminar planilla"
                  className="opacity-0 group-hover/tab:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 p-0.5 rounded mr-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}
        
        {isCreatingSheet ? (
          <div className="flex items-center gap-2 px-2 ml-2">
            <input
              autoFocus
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSheet()
                if (e.key === 'Escape') setIsCreatingSheet(false)
              }}
              placeholder="Nombre Planilla..."
              className="h-7 text-[12px] bg-background border border-border/80 rounded px-2 w-[120px] focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button onClick={handleCreateSheet} disabled={savingSheet || !newSheetName.trim()} className="text-[11px] font-bold text-primary hover:text-primary/80 disabled:opacity-40">✓</button>
            <button onClick={() => setIsCreatingSheet(false)} className="text-[11px] font-bold text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingSheet(true)}
            className="px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 hover:bg-muted/30 rounded-t-lg transition-colors whitespace-nowrap ml-1"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
        )}
      </div>

      {viewMode === 'grid' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/80">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Atajos:</span>
            <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">↑</kbd> <kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">↓</kbd> Fila</div>
            <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">←</kbd> <kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">→</kbd> Columna</div>
            <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">Enter</kbd> Guardar</div>
            <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">Esc</kbd> Cancelar</div>
          </div>
          <GridView
            transactions={sheetTransactions}
            categories={categories}
            currentMonth={currentMonth}
            userId={userId}
            activeSheetId={activeSheetId}
            onTxsChange={setTxs}
          />
        </div>
      )}

      {viewMode === 'list' && <>

      {/* ── Filters bar & Shortcuts ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(
              [
                { key: 'all' as const, label: 'Todos' },
                { key: 'expense' as const, label: 'Gasto' },
                { key: 'income' as const, label: 'Ingreso' },
                { key: 'savings' as const, label: 'Ahorro' },
                { key: 'investment' as const, label: 'Inversión' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
                  typeFilter === key
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="h-8 pl-8 pr-3 rounded-xl border border-border bg-background text-[13px] w-[160px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/80">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Atajos:</span>
          <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">↑</kbd> <kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">↓</kbd> Navegar</div>
          <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">Enter</kbd> Editar / Guardar</div>
          <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">Esc</kbd> Cancelar</div>
          <div className="flex items-center gap-1"><kbd className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded font-mono shadow-sm">N</kbd> Nueva fila</div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        {/* Header row */}
        <div className="flex items-center px-4 py-2.5 border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
          <span className="w-[80px] shrink-0">Fecha</span>
          <span className="w-[90px] shrink-0">Tipo</span>
          <span className="flex-1">Descripción</span>
          <span className="w-[120px] shrink-0 hidden md:block">Categoría</span>
          <span className="w-[120px] shrink-0 text-right">Monto</span>
          <span className="w-[60px] shrink-0 text-center">Moneda</span>
          <span className="w-[86px] shrink-0" />
        </div>

        {/* Transaction rows */}
        {filtered.length === 0 && !isAddingNew ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              {search || typeFilter !== 'all' ? 'Sin resultados' : 'Sin transacciones'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {search || typeFilter !== 'all'
                ? 'Probá con otro filtro o búsqueda.'
                : 'Presioná N o hacé clic en "+ Nueva fila" para empezar.'}
            </p>
          </div>
        ) : (
          filtered.map((tx, index) =>
            editingId === tx.id ? (
              <EditableRow
                key={tx.id}
                tx={tx}
                categories={categories}
                defaultCurrency={defaultCurrency}
                defaultSheetId={activeSheetId}
                onSave={handleSaveEdit}
                onCancel={() => setEditingId(null)}
                autoFocus
              />
            ) : (
              <div
                key={tx.id}
                onClick={() => {
                  if (deletingId) setDeletingId(null)
                  setEditingId(tx.id)
                  setIsAddingNew(false)
                  setFocusedIndex(index)
                }}
                className={cn(
                  'flex items-center px-4 py-2.5 border-b border-border/60 last:border-0 cursor-pointer group transition-all text-[13px]',
                  deletingId === tx.id 
                    ? 'bg-rose-500/10 !border-rose-500/30' 
                    : focusedIndex === index 
                      ? 'bg-primary/5 ring-1 ring-inset ring-primary/40 rounded-[1px]' 
                      : 'hover:bg-muted/30'
                )}
              >
                {/* Date */}
                <span className="w-[80px] shrink-0 text-muted-foreground font-mono text-[12px]">
                  {formatShortDate(tx.date)}
                </span>

                {/* Type */}
                <span className={cn('w-[90px] shrink-0 flex items-center gap-1.5', TYPE_CFG[tx.type].color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', TYPE_CFG[tx.type].dot)} />
                  <span className="text-[12px] font-medium">{TYPE_CFG[tx.type].label}</span>
                </span>

                {/* Note */}
                <span className="flex-1 text-foreground truncate">{tx.note ?? '—'}</span>

                {/* Category */}
                <span className="w-[120px] shrink-0 hidden md:block text-muted-foreground/70 text-[12px] truncate">
                  {tx.category?.name ?? '—'}
                </span>

                {/* Amount */}
                <span
                  className={cn(
                    'w-[120px] shrink-0 text-right font-mono font-semibold tabular-nums',
                    TYPE_CFG[tx.type].color,
                  )}
                >
                  {tx.type === 'income' ? '+' : '−'}
                  {formatCurrency(tx.amount, tx.currency)}
                </span>

                {/* Currency */}
                <span className="w-[60px] shrink-0 text-center text-[11px] text-muted-foreground">{tx.currency}</span>

                {/* Delete */}
                <div className="w-[86px] shrink-0 flex justify-end">
                  {deletingId === tx.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(tx.id)
                        }}
                        className="bg-rose-500 text-white min-w-[50px] text-[10px] font-bold px-1.5 py-1 rounded shadow-sm hover:bg-rose-600 transition-colors"
                      >
                        Borrar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingId(null)
                        }}
                        className="text-muted-foreground hover:bg-muted p-1 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingId(tx.id)
                      }}
                      title="Eliminar fila"
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-all p-1 rounded-md hover:bg-rose-500/10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ),
          )
        )}

        {/* New row */}
        {isAddingNew ? (
          <EditableRow
            tx={null}
            categories={categories}
            defaultCurrency={defaultCurrency}
            defaultSheetId={activeSheetId}
            onSave={handleSaveNew}
            onCancel={() => setIsAddingNew(false)}
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setEditingId(null)
              setIsAddingNew(true)
              setFocusedIndex(-1)
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-[13px] hover:text-primary transition-all duration-200 w-full text-left border-t border-dashed',
              focusedIndex === -1
                ? 'bg-primary/10 text-primary border-primary ring-1 ring-inset ring-primary/40 rounded-b-xl'
                : 'text-muted-foreground border-border/60 hover:bg-muted/30 hover:border-primary/50'
            )}
          >
            <div className={cn('p-1 rounded-md transition-colors', focusedIndex === -1 ? 'bg-primary/20' : 'bg-muted group-hover:bg-primary/10')}>
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold">Agregar nueva fila</span>
            <span className={cn(
              'ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors hidden sm:inline border',
              focusedIndex === -1 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-background text-muted-foreground border-border'
            )}>
              N
            </span>
          </button>
        )}
      </div>

      </> /* end viewMode === 'list' */}

      {/* ── Footer totals ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 text-[12px]">
        {totals.incomeARS > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Ingresos</span>
            <span className="font-mono font-semibold text-emerald-500 tabular-nums">
              +{formatCurrency(totals.incomeARS, 'ARS')}
            </span>
          </span>
        )}
        {totals.incomeUSD > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Ingresos USD</span>
            <span className="font-mono font-semibold text-emerald-500 tabular-nums">
              +{formatCurrency(totals.incomeUSD, 'USD')}
            </span>
          </span>
        )}
        {totals.expenseARS > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Gastos</span>
            <span className="font-mono font-semibold text-rose-500 tabular-nums">
              −{formatCurrency(totals.expenseARS, 'ARS')}
            </span>
          </span>
        )}
        {totals.expenseUSD > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Gastos USD</span>
            <span className="font-mono font-semibold text-rose-500 tabular-nums">
              −{formatCurrency(totals.expenseUSD, 'USD')}
            </span>
          </span>
        )}
        {(totals.incomeARS > 0 || totals.expenseARS > 0) && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Balance ARS</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCurrency(totals.incomeARS - totals.expenseARS, 'ARS')}
            </span>
          </span>
        )}
        {(totals.incomeUSD > 0 || totals.expenseUSD > 0) && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Balance USD</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCurrency(totals.incomeUSD - totals.expenseUSD, 'USD')}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
