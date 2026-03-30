'use client'

import { notFound } from 'next/navigation'
import { useProjectLookup, NotFoundError } from '../../lib/hooks/queries'
import { Topbar, TopbarTitle } from '../Topbar'
import { SpecExplorer } from './SpecExplorer'
import { Skeleton } from '../Skeleton'

interface Props {
  projectSlug: string
}

export function SpecsPage({ projectSlug }: Props) {
  const { data, isLoading, error } = useProjectLookup(projectSlug)

  if (error instanceof NotFoundError) notFound()

  if (isLoading || !data) {
    return (
      <>
        <Topbar>
          <TopbarTitle>Specs</TopbarTitle>
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
        <TopbarTitle>Specs — {data.name}</TopbarTitle>
      </Topbar>
      <SpecExplorer
        owner={data.owner}
        repoName={data.repoName}
        defaultBranch={data.defaultBranch}
        projectName={data.name}
        teams={data.teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </>
  )
}
