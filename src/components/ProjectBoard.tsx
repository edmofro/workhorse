'use client'

import { useState } from 'react'
import { notFound } from 'next/navigation'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import { useProjectBoard, NotFoundError } from '../lib/hooks/queries'
import { Topbar, TopbarRight } from './Topbar'
import { BoardColumn } from './BoardColumn'
import { CreateCardDialog } from './CreateCardDialog'
import { CardFilter } from './CardFilter'
import { ProjectSelector } from './ProjectSelector'
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
          <Skeleton className="h-7 w-7 rounded-[var(--radius-md)]" />
          <Skeleton className="h-7 w-7 rounded-[var(--radius-md)]" />
          <Skeleton className="h-7 w-7 rounded-[var(--radius-md)]" />
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
                <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-3 mx-1.5 mb-1.5 shadow-[var(--shadow-sm)]">
                  <Skeleton className="h-3 w-12 mb-1.5" />
                  <Skeleton className="h-3.5 w-3/4" />
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
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    filters.team ?? null,
  )
  const [showFilter, setShowFilter] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) return <BoardSkeleton />
  if (error instanceof NotFoundError) notFound()
  if (error || !data) return <BoardSkeleton />

  const { project, cards: allCards, users } = data

  let cards = allCards
  if (selectedTeamId) cards = cards.filter((c) => c.team.id === selectedTeamId)
  if (filters.status) cards = cards.filter((c) => c.status === filters.status)
  if (filters.assignee) cards = cards.filter((c) => c.assignee?.id === filters.assignee)

  const projectPath = `/${encodeURIComponent(project.name.toLowerCase())}`
  const hasFilters = filters.status || filters.assignee

  return (
    <>
      <Topbar>
        <ProjectSelector
          projects={project.teams}
          selectedProjectId={selectedTeamId}
          onSelect={setSelectedTeamId}
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
              {hasFilters && (
                <span className="absolute top-1.5 right-1.5 w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />
              )}
            </IconButton>
            {showFilter && (
              <CardFilter
                teams={project.teams}
                users={users}
                basePath={projectPath}
                asDropdown
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
      {cards.length === 0 && !selectedTeamId && !hasFilters ? (
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

      {showCreate && (
        <CreateCardDialog
          teams={project.teams}
          projectName={project.name}
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  )
}

function IconButton({
  children,
  title,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode
  title: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`relative p-2 rounded-[var(--radius-md)] transition-colors duration-100 ${
        disabled
          ? 'text-[var(--text-faint)] cursor-default'
          : active
            ? 'text-[var(--text-secondary)] bg-[var(--bg-hover)] cursor-pointer'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer'
      }`}
    >
      {children}
    </button>
  )
}
