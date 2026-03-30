'use client'

import { notFound } from 'next/navigation'
import { useProjectBoard, NotFoundError } from '../lib/hooks/queries'
import { Topbar, TopbarTitle, TopbarRight } from './Topbar'
import { CardList } from './CardList'
import { CreateCardDialog } from './CreateCardDialog'
import { CardFilter } from './CardFilter'

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[8px] bg-[var(--bg-inset)] ${className ?? ''}`}
    />
  )
}

function BoardSkeleton() {
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
        {[1, 2, 3].map((group) => (
          <div key={group} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[var(--bg-inset)]" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-4" />
            </div>
            {Array.from({ length: group === 1 ? 2 : group === 2 ? 3 : 1 }).map(
              (_, i) => (
                <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-4 px-[18px] mb-2 shadow-[var(--shadow-sm)]">
                  <Skeleton className="h-3 w-14 mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </>
  )
}

interface ProjectBoardProps {
  projectSlug: string
  filters: { team?: string; status?: string; assignee?: string }
}

export function ProjectBoard({ projectSlug, filters }: ProjectBoardProps) {
  const { data, isLoading, error } = useProjectBoard(projectSlug)

  if (isLoading) return <BoardSkeleton />
  if (error instanceof NotFoundError) notFound()
  if (error || !data) return <BoardSkeleton />

  const { project, cards: allCards, users } = data

  let cards = allCards
  if (filters.team) cards = cards.filter((c) => c.team.id === filters.team)
  if (filters.status) cards = cards.filter((c) => c.status === filters.status)
  if (filters.assignee) cards = cards.filter((c) => c.assignee?.id === filters.assignee)

  const projectPath = `/${encodeURIComponent(project.name.toLowerCase())}`

  return (
    <>
      <Topbar>
        <TopbarTitle>Board</TopbarTitle>
        <TopbarRight>
          <CardFilter
            teams={project.teams}
            users={users}
            basePath={projectPath}
          />
          <CreateCardDialog
            teams={project.teams}
            projectName={project.name}
          />
        </TopbarRight>
      </Topbar>
      <CardList cards={cards} projectName={project.name} />
    </>
  )
}
