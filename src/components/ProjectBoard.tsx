'use client'

import { useState } from 'react'
import { notFound } from 'next/navigation'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import { useProjectBoard, NotFoundError } from '../lib/hooks/queries'
import { Topbar, TopbarRight } from './Topbar'
import { BoardColumn } from './BoardColumn'
import { CreateCardDialog } from './CreateCardDialog'
import { FilterPanel } from './FilterPanel'
import { ProjectSelector } from './ProjectSelector'
import { IconButton } from './IconButton'
import { Skeleton } from './Skeleton'

const STATUS_COLUMNS = [
  { key: 'SPECIFYING', label: 'Specifying', dotState: 'specifying' as const },
  { key: 'IMPLEMENTING', label: 'Implementing', dotState: 'implementing' as const },
  { key: 'NOT_STARTED', label: 'Not started', dotState: 'not-started' as const },
  { key: 'COMPLETE', label: 'Complete', dotState: 'complete' as const },
] as const

function BoardSkeleton() {
  return (
    <>
      <Topbar>
        <Skeleton className="h-6 w-28" />
        <TopbarRight>
          <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
          <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
          <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
        </TopbarRight>
      </Topbar>
      <div className="flex-1 flex gap-4 overflow-hidden px-6 pt-5">
        {STATUS_COLUMNS.map((col) => (
          <div key={col.key} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 px-3 pb-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            {Array.from({ length: col.key === 'IMPLEMENTING' ? 3 : col.key === 'NOT_STARTED' ? 1 : 2 }).map(
              (_, i) => (
                <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-3 mx-2 mb-2 shadow-[var(--shadow-sm)]">
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-4 w-3/4" />
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showFilter, setShowFilter] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) return <BoardSkeleton />
  if (error instanceof NotFoundError) notFound()
  if (error || !data) return <BoardSkeleton />

  const { project, cards: allCards, users } = data

  const selectedTeamId = filters.team ?? null
  const projectPath = `/${encodeURIComponent(project.name.toLowerCase())}`

  function handleTeamSelect(teamId: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (teamId) {
      params.set('team', teamId)
    } else {
      params.delete('team')
    }
    const qs = params.toString()
    router.push(`${projectPath}${qs ? `?${qs}` : ''}`)
  }

  let cards = allCards
  if (selectedTeamId) cards = cards.filter((c) => c.team.id === selectedTeamId)
  if (filters.status) cards = cards.filter((c) => c.status === filters.status)
  if (filters.assignee) cards = cards.filter((c) => c.assignee?.id === filters.assignee)

  const hasActiveFilters = !!selectedTeamId || !!filters.status || !!filters.assignee

  return (
    <>
      <Topbar>
        <ProjectSelector
          projects={project.teams}
          selectedProjectId={selectedTeamId}
          onSelect={handleTeamSelect}
        />
        <TopbarRight>
          <IconButton title="Search" disabled>
            <Search size={14} />
          </IconButton>
          <div className="relative">
            <IconButton
              title="Filter"
              onClick={() => setShowFilter(!showFilter)}
              active={showFilter}
            >
              <SlidersHorizontal size={14} />
              {hasActiveFilters && (
                <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[var(--accent)]" />
              )}
            </IconButton>
            {showFilter && (
              <FilterPanel
                users={users}
                basePath={projectPath}
                onClose={() => setShowFilter(false)}
              />
            )}
          </div>
          <IconButton
            title="New card"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} />
          </IconButton>
        </TopbarRight>
      </Topbar>

      {/* Kanban columns */}
      {cards.length === 0 && !hasActiveFilters ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px] text-[var(--text-muted)] mb-1">No cards yet</p>
            <p className="text-[13px] text-[var(--text-faint)]">
              Create your first card to get started.
            </p>
          </div>
        </div>
      ) : cards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px] text-[var(--text-muted)]">
            No cards match the current filters.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-hidden px-6 pt-5">
          {STATUS_COLUMNS.map((col) => (
            <BoardColumn
              key={col.key}
              label={col.label}
              dotState={col.dotState}
              cards={cards.filter((c) => c.status === col.key)}
              projectName={project.name}
            />
          ))}
        </div>
      )}

      <CreateCardDialog
        teams={project.teams}
        projectName={project.name}
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </>
  )
}
