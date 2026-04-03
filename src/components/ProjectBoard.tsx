'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { notFound } from 'next/navigation'
import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, Plus, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '../lib/cn'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useProjectBoard, NotFoundError } from '../lib/hooks/queries'
import { updateCard } from '../lib/actions/cards'
import { Topbar, TopbarRight } from './Topbar'
import { BoardColumn, BoardCardOverlay, type CardData } from './BoardColumn'
import { StatusDot } from './StatusDot'
import { CreateModal } from './CreateModal'
import { FilterPanel } from './FilterPanel'
import { ProjectSelector } from './ProjectSelector'
import { IconButton } from './IconButton'
import { Skeleton } from './Skeleton'

const STATUS_COLUMNS = [
  { key: 'NOT_STARTED', label: 'Not started', dotState: 'not-started' as const },
  { key: 'SPECIFYING', label: 'Specifying', dotState: 'specifying' as const },
  { key: 'IMPLEMENTING', label: 'Implementing', dotState: 'implementing' as const },
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
  const { data, isLoading, error, refetch } = useProjectBoard(projectSlug)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showFilter, setShowFilter] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)

  // Drag state
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  // Optimistic status overrides: cardId -> new status
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, string>>({})
  // Concurrency guard: sequence counter to ignore stale refetch results
  const dragSeqRef = useRef(0)

  // Require 5px movement before starting drag to avoid accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = event.active.data.current?.card as CardData | undefined
    if (card) setActiveCard(card)
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const card = active.data.current?.card as CardData | undefined
    if (!card) return

    // Determine target status from the droppable
    const overData = over.data.current
    const targetStatus = overData?.type === 'column'
      ? overData.status as string
      : null

    if (!targetStatus || targetStatus === card.status) return

    // Optimistic update
    const seq = ++dragSeqRef.current
    setOptimisticMoves((prev) => ({ ...prev, [card.id]: targetStatus }))

    try {
      await updateCard(card.id, { status: targetStatus })
      // Only refetch if no newer drag has started
      if (dragSeqRef.current === seq) {
        await refetch()
      }
    } catch (error) {
      console.error('Failed to update card status:', error)
    } finally {
      // Only clear this card's optimistic move if no newer drag has overwritten it
      setOptimisticMoves((prev) => {
        if (prev[card.id] !== targetStatus) return prev
        const next = { ...prev }
        delete next[card.id]
        return next
      })
    }
  }, [refetch])

  // Apply optimistic status moves and group by status in a single pass
  const cardsByStatus = useMemo(() => {
    if (!data) return {}
    const allCards = data.cards
    let cards = allCards
    const selectedTeamId = filters.team ?? null
    if (selectedTeamId) cards = cards.filter((c) => c.team.id === selectedTeamId)
    if (filters.status) cards = cards.filter((c) => c.status === filters.status)
    if (filters.assignee) cards = cards.filter((c) => c.assignee?.id === filters.assignee)

    const grouped: Record<string, CardData[]> = {}
    for (const c of cards) {
      const status = optimisticMoves[c.id] ?? c.status
      ;(grouped[status] ??= []).push(
        optimisticMoves[c.id] ? { ...c, status: optimisticMoves[c.id] } : c,
      )
    }
    return grouped
  }, [data, filters.team, filters.status, filters.assignee, optimisticMoves])

  if (isLoading) return <BoardSkeleton />
  if (error instanceof NotFoundError) notFound()
  if (error || !data) return <BoardSkeleton />

  const { project, users } = data

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

  const hasActiveFilters = !!selectedTeamId || !!filters.status || !!filters.assignee
  const totalCards = Object.values(cardsByStatus).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <>
      <Topbar>
        <ProjectSelector
          projects={project.teams}
          selectedProjectId={selectedTeamId}
          onSelect={handleTeamSelect}
        />
        <TopbarRight>
          <div className="relative">
            <IconButton
              title="Filter"
              onClick={() => setShowFilter(!showFilter)}
              active={showFilter}
            >
              <SlidersHorizontal size={14} />
              {hasActiveFilters && (
                <span className="absolute top-1 right-1 w-[6px] h-[6px] rounded-full bg-[var(--accent)]" />
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
      {totalCards === 0 && !hasActiveFilters ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px] text-[var(--text-muted)] mb-1">No cards yet</p>
            <p className="text-[13px] text-[var(--text-faint)]">
              Create your first card to get started.
            </p>
          </div>
        </div>
      ) : totalCards === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px] text-[var(--text-muted)]">
            No cards match the current filters.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-4 overflow-hidden px-6 pt-5">
            {STATUS_COLUMNS.map((col) => (
              <BoardColumn
                key={col.key}
                label={col.label}
                dotState={col.dotState}
                cards={cardsByStatus[col.key] ?? []}
                projectName={project.name}
                statusKey={col.key}
              />
            ))}

            <CancelledColumn
              cards={cardsByStatus['CANCELLED'] ?? []}
              projectName={project.name}
              expanded={showCancelled}
              onToggle={() => setShowCancelled(!showCancelled)}
              isDragging={!!activeCard}
            />
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <BoardCardOverlay card={activeCard} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {showCreate && (
        <CreateModal
          projectSlug={projectPath}
          defaultTeamId={project.teams[0]?.id}
          defaultMode="card"
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  )
}

function CancelledColumn({
  cards,
  projectName,
  expanded,
  onToggle,
  isDragging,
}: {
  cards: CardData[]
  projectName: string
  expanded: boolean
  onToggle: () => void
  isDragging?: boolean
}) {
  // Only register droppable when collapsed — when expanded, the inner
  // BoardColumn registers its own droppable with the same status key.
  const { setNodeRef, isOver } = useDroppable({
    id: 'column-CANCELLED-collapsed',
    data: { type: 'column', status: 'CANCELLED' },
    disabled: expanded,
  })

  // Show the collapsed indicator when: cards exist, or we're actively dragging (so user can drop here)
  if (cards.length === 0 && !expanded && !isDragging) return null

  if (!expanded) {
    return (
      <button
        ref={setNodeRef}
        onClick={onToggle}
        className={cn(
          'flex flex-col items-center gap-2 py-3 px-2 shrink-0 cursor-pointer group rounded-[var(--radius-lg)] transition-colors duration-100',
          isOver && 'bg-[var(--bg-hover)]',
        )}
        title={isDragging ? 'Drop to cancel' : 'Show cancelled cards'}
      >
        <div className="flex items-center gap-1">
          <StatusDot state="cancelled" />
          <span className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-[0.06em]">
            {cards.length}
          </span>
          <ChevronRight size={14} className="text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors duration-100" />
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col min-w-0 flex-1 max-w-[280px] relative">
      <button
        onClick={onToggle}
        className="absolute top-0 right-2 p-1 text-[var(--text-faint)] hover:text-[var(--text-muted)] cursor-pointer transition-colors duration-100 z-10"
        title="Hide cancelled cards"
      >
        <ChevronLeft size={14} />
      </button>
      <BoardColumn
        label="Cancelled"
        dotState="cancelled"
        cards={cards}
        projectName={projectName}
        statusKey="CANCELLED"
      />
    </div>
  )
}
