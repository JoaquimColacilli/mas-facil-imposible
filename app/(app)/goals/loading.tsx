export default function GoalsLoading() {
  return (
    <div className="flex flex-col gap-4 w-full animate-pulse">
      <div className="flex items-center justify-between pt-1">
        <div className="h-8 w-28 bg-muted rounded-xl" />
        <div className="h-9 w-28 bg-muted rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[160px] rounded-2xl bg-muted border border-border" />
        ))}
      </div>
    </div>
  )
}
