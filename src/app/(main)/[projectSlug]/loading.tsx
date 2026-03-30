import { Topbar, TopbarTitle, TopbarRight } from '../../../components/Topbar'

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[8px] bg-[var(--bg-inset)] ${className ?? ''}`}
    />
  )
}

function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-4 px-[18px] mb-2 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export default function ProjectLoading() {
  return (
    <>
      <Topbar>
        <TopbarTitle>Board</TopbarTitle>
        <TopbarRight>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
        </TopbarRight>
      </Topbar>
      <div className="flex-1 overflow-auto px-8 pt-7">
        {/* Status group skeleton */}
        {[1, 2, 3].map((group) => (
          <div key={group} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[var(--bg-inset)]" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-4" />
            </div>
            {Array.from({ length: group === 1 ? 2 : group === 2 ? 3 : 1 }).map(
              (_, i) => (
                <CardSkeleton key={i} />
              ),
            )}
          </div>
        ))}
      </div>
    </>
  )
}
