'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/lib/types'
import { formatCurrency } from '@/lib/types'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  BarChart3,
  TrendingUp,
  Settings,
  Bell,
  Plus,
  Sun,
  Moon,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Static data ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Inicio',         href: '/dashboard',     icon: LayoutDashboard },
  { label: 'Movimientos',    href: '/transactions',  icon: ArrowLeftRight  },
  { label: 'Metas',          href: '/goals',         icon: Target          },
  { label: 'Análisis',       href: '/analytics',     icon: BarChart3       },
  { label: 'Inversiones',    href: '/investments',   icon: TrendingUp      },
  { label: 'Notificaciones', href: '/notifications', icon: Bell            },
  { label: 'Ajustes',        href: '/settings',      icon: Settings        },
]

const TYPE_ICONS: Record<string, typeof ArrowUpRight> = {
  expense:    ArrowUpRight,
  income:     ArrowDownLeft,
  savings:    PiggyBank,
  investment: TrendingUp,
}

const TYPE_COLORS: Record<string, string> = {
  expense:    'text-rose-500',
  income:     'text-emerald-500',
  savings:    'text-sky-500',
  investment: 'text-violet-500',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [recentTxs, setRecentTxs] = useState<Transaction[] | null>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Don't open if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    function onCustomOpen() { setOpen(true) }
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('open-command-palette', onCustomOpen)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('open-command-palette', onCustomOpen)
    }
  }, [])

  // Fetch recent transactions when palette opens
  useEffect(() => {
    if (!open) return
    if (recentTxs !== null) return // Already loaded
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          setRecentTxs((data ?? []) as Transaction[])
        })
    })
  }, [open, recentTxs])

  // Reset cache when closing so next open gets fresh data
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setRecentTxs(null)
  }, [])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  function runAction(action: string) {
    setOpen(false)
    switch (action) {
      case 'quick-add':
        window.dispatchEvent(new CustomEvent('open-quick-add'))
        break
      case 'new-goal':
        router.push('/goals')
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-goal')), 300)
        break
      case 'investments':
        window.dispatchEvent(new CustomEvent('open-portfolio-widget'))
        break
      case 'toggle-theme':
        setTheme(theme === 'dark' ? 'light' : 'dark')
        break
    }
  }

  function selectTransaction(tx: Transaction) {
    setOpen(false)
    // Navigate to transactions page with month filter matching the tx date
    const month = tx.date.slice(0, 7)
    router.push(`/transactions?month=${month}`)
  }

  const displayTxs = recentTxs?.slice(0, 5) ?? []

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Buscar"
      description="Buscar páginas, acciones y movimientos"
      showCloseButton={false}
    >
      <CommandInput placeholder="Buscar páginas, acciones, movimientos..." />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No se encontraron resultados</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navegación">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => navigate(href)}>
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick actions */}
        <CommandGroup heading="Acciones rápidas">
          <CommandItem onSelect={() => runAction('quick-add')}>
            <Plus className="w-4 h-4 text-muted-foreground" />
            <span>Agregar movimiento</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction('new-goal')}>
            <Target className="w-4 h-4 text-muted-foreground" />
            <span>Nueva meta</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction('investments')}>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span>Abrir inversiones</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction('toggle-theme')}>
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
            <span>{theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Recent transactions */}
        <CommandGroup heading="Movimientos recientes">
          {recentTxs === null ? (
            // Loading skeleton
            <div className="px-2 py-3 flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-4 h-4 rounded bg-muted" />
                  <div className="flex-1 h-3.5 rounded bg-muted" />
                  <div className="w-16 h-3.5 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : displayTxs.length === 0 ? (
            <div className="px-2 py-3 text-[13px] text-muted-foreground">
              Sin movimientos recientes
            </div>
          ) : (
            displayTxs.map((tx) => {
              const TxIcon = TYPE_ICONS[tx.type] ?? ArrowUpRight
              const txColor = TYPE_COLORS[tx.type] ?? 'text-muted-foreground'
              const label = tx.note ?? tx.category?.name ?? 'Sin descripción'
              const isNegative = tx.type === 'expense'
              return (
                <CommandItem key={tx.id} onSelect={() => selectTransaction(tx)}>
                  <TxIcon className={cn('w-4 h-4', txColor)} />
                  <span className="flex-1 truncate">{label}</span>
                  {tx.category?.name && tx.note && (
                    <span className="text-[11px] text-muted-foreground mr-2 hidden sm:inline">
                      {tx.category.name}
                    </span>
                  )}
                  <span className={cn(
                    'font-mono text-[12px] font-semibold tabular-nums shrink-0',
                    isNegative ? 'text-rose-500' : 'text-emerald-500',
                  )}>
                    {isNegative ? '−' : '+'}{formatCurrency(tx.amount, tx.currency)}
                  </span>
                </CommandItem>
              )
            })
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
