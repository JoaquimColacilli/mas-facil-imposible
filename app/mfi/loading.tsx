export default function MFILoading() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-muted rounded-xl" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-muted rounded-xl" />
          <div className="h-8 w-28 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-muted rounded-xl" />
        ))}
      </div>

      {/* Grid */}
      <div className="h-[400px] rounded-2xl bg-muted border border-border" />
    </div>
  )
}
