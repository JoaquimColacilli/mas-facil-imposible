export default function InvestmentsLoading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse p-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-muted rounded-lg" />
          <div className="h-10 w-52 bg-muted rounded-lg" />
          <div className="h-5 w-40 bg-muted rounded-lg" />
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 w-10 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
      {/* Chart */}
      <div className="h-[400px] rounded-2xl bg-muted border border-border" />
      {/* Holdings + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[200px] rounded-2xl bg-muted border border-border" />
        <div className="h-[200px] rounded-2xl bg-muted border border-border" />
      </div>
      {/* Heatmap */}
      <div className="h-[160px] rounded-2xl bg-muted border border-border" />
    </div>
  )
}
