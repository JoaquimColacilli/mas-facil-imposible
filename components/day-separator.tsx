interface DaySeparatorProps {
  label: string
}

export function DaySeparator({ label }: DaySeparatorProps) {
  return (
    <div className="flex justify-center my-3">
      <span className="text-[11px] font-medium text-muted-foreground bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 border border-border/50">
        {label}
      </span>
    </div>
  )
}
