function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[8px] bg-[var(--bg-inset)] ${className ?? ''}`}
    />
  )
}

export default function CardLoading() {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[680px] mx-auto space-y-6">
          {/* Status and priority */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-20" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[var(--border-subtle)] pb-px">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>

          {/* Activity items */}
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-[22px] w-[22px] rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
