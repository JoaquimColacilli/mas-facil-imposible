export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 w-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start justify-between pt-1">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-20 bg-muted rounded-full" />
          <div className="h-8 w-36 bg-muted rounded-xl" />
        </div>
        <div className="flex gap-2 mt-1">
          <div className="h-9 w-28 bg-muted rounded-xl" />
          <div className="h-9 w-24 bg-muted rounded-xl" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[88px] rounded-2xl bg-muted border border-border" />
        ))}
      </div>

      {/* Chart */}
      <div className="h-[268px] rounded-2xl bg-muted border border-border" />

      {/* Transactions list */}
      <div className="rounded-2xl bg-muted border border-border overflow-hidden">
        <div className="h-12 border-b border-border" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[58px] border-b border-border last:border-0" />
        ))}
      </div>
    </div>
  )
}
