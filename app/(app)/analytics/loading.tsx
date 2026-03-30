export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-4 w-full animate-pulse">
      <div className="h-8 w-32 bg-muted rounded-xl pt-1" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[240px] rounded-2xl bg-muted border border-border" />
        ))}
      </div>
    </div>
  )
}
