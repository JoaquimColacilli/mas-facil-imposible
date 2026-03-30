export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-4 w-full animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="h-8 w-40 bg-muted rounded-xl" />
        <div className="h-9 w-24 bg-muted rounded-xl" />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-muted rounded-xl" />
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl bg-muted border border-border overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[62px] border-b border-border last:border-0" />
        ))}
      </div>
    </div>
  )
}
