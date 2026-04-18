interface DaySeparatorProps {
  label: string
}

export function DaySeparator({ label }: DaySeparatorProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
