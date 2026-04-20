import {
  LayoutGrid,
  TrendingUp,
  PiggyBank,
  DollarSign,
  Landmark,
  Bitcoin,
  Receipt,
  Target,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import type { CommunityCategoryId } from '@/lib/types'

export type CategoryColorKey =
  | 'sage'
  | 'copper'
  | 'sky'
  | 'violet'
  | 'rose'
  | 'emerald'
  | 'muted'

export interface CategoryDef {
  id: CommunityCategoryId | 'todo'
  label: string
  icon: LucideIcon
  color: CategoryColorKey
}

/** Includes the synthetic 'todo' filter — used for feed chips. */
export const TOP_LEVEL_CATEGORIES: CategoryDef[] = [
  { id: 'todo',        label: 'Todo',         icon: LayoutGrid,  color: 'muted'  },
  { id: 'inversiones', label: 'Inversiones',  icon: TrendingUp,  color: 'violet' },
  { id: 'ahorros',     label: 'Ahorros',      icon: PiggyBank,   color: 'sky'    },
  { id: 'dolar',       label: 'Dólar',        icon: DollarSign,  color: 'emerald'},
  { id: 'plazosfijos', label: 'Plazos fijos', icon: Landmark,    color: 'sky'    },
  { id: 'cripto',      label: 'Cripto',       icon: Bitcoin,     color: 'copper' },
  { id: 'gastos',      label: 'Gastos',       icon: Receipt,     color: 'rose'   },
  { id: 'metas',       label: 'Metas',        icon: Target,      color: 'sage'   },
  { id: 'preguntas',   label: 'Preguntas',    icon: HelpCircle,  color: 'muted'  },
]

/** Real DB categories — no 'todo'. Used by the composer. */
export const POSTABLE_CATEGORIES = TOP_LEVEL_CATEGORIES.filter(
  (c): c is CategoryDef & { id: CommunityCategoryId } => c.id !== 'todo',
)

export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(
  TOP_LEVEL_CATEGORIES.map((c) => [c.id, c]),
)

/** OKLCH color values for inline styles — tokens don't exist as Tailwind
 * utilities, so categories paint themselves with style={{ color, background }}. */
export const CATEGORY_COLORS: Record<CategoryColorKey, string> = {
  sage:    'oklch(0.50 0.10 155)',
  copper:  'oklch(0.60 0.10 65)',
  sky:     'oklch(0.55 0.12 230)',
  violet:  'oklch(0.55 0.14 295)',
  rose:    'oklch(0.60 0.14 15)',
  emerald: 'oklch(0.55 0.12 155)',
  muted:   'oklch(0.55 0.008 260)',
}

export const COMMUNITY_RULES = [
  'Respeto ante todo — nada de agresiones personales.',
  'No es consejo financiero. Compartí experiencias, no promesas.',
  'Nada de referidos, spam ni promos pagas.',
  'Usá la categoría correcta para que otros te encuentren.',
]
