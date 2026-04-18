'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
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
} from 'lucide-react'

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

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)
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

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Buscar"
      description="Buscar páginas y acciones"
      showCloseButton={false}
    >
      <CommandInput placeholder="Buscar páginas o acciones..." />
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
      </CommandList>
    </CommandDialog>
  )
}
