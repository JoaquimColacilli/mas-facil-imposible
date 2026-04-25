'use client'

import { CATEGORY_LIST, SORT_LABELS, type GoalSort } from '@/lib/goals'
import type { GoalCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type FilterValue = 'all' | GoalCategory

interface GoalsFiltersProps {
  filter: FilterValue
  setFilter: (v: FilterValue) => void
  sort: GoalSort
  setSort: (v: GoalSort) => void
  /** counts['all'] = total, counts[catId] = per-category. Hide categories with 0. */
  counts: Record<string, number>
}

export function GoalsFilters({ filter, setFilter, sort, setSort, counts }: GoalsFiltersProps) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="radiogroup"
      aria-label="Filtrar metas por categoría"
    >
      <FilterChip
        active={filter === 'all'}
        onClick={() => setFilter('all')}
        label="Todas"
        count={counts.all ?? 0}
      />
      {CATEGORY_LIST.map((c) => {
        const count = counts[c.id] ?? 0
        if (count === 0) return null
        const Icon = c.icon
        return (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
            label={c.label}
            count={count}
            icon={<Icon className="w-3 h-3" />}
          />
        )
      })}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
          Orden
        </span>
        <Select value={sort} onValueChange={(v) => setSort(v as GoalSort)}>
          <SelectTrigger className="h-8 w-[200px] text-[12px] font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(SORT_LABELS) as [GoalSort, string][]).map(([k, label]) => (
              <SelectItem key={k} value={k} className="text-[12px]">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  icon?: React.ReactNode
}) {
  return (
    <button
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[12px] font-medium transition',
        active
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 ring-2 ring-emerald-500/20'
          : 'bg-muted text-foreground border-transparent hover:bg-muted/80',
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="ml-1 font-mono opacity-60">{count}</span>
    </button>
  )
}
