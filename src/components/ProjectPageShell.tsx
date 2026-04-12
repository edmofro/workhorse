'use client'

import { notFound } from 'next/navigation'
import { useProjectLookup, NotFoundError, type ProjectInfo } from '../lib/hooks/queries'
import { Topbar, TopbarTitle } from './Topbar'
import { Skeleton } from './Skeleton'

interface Props {
  projectSlug: string
  title: string
  children: (project: ProjectInfo) => React.ReactNode
}

export function ProjectPageShell({ projectSlug, title, children }: Props) {
  const { data, isLoading, error } = useProjectLookup(projectSlug)

  if (error instanceof NotFoundError) notFound()

  if (isLoading || !data) {
    return (
      <>
        <Topbar>
          <TopbarTitle>{title}</TopbarTitle>
        </Topbar>
        <div className="flex-1 flex">
          <div className="w-[200px] border-r border-[var(--border-subtle)] p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex-1 p-8">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar>
        <TopbarTitle>{title} — {data.name}</TopbarTitle>
      </Topbar>
      {children(data)}
    </>
  )
}
